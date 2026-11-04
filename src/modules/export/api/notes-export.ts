import ExcelJS from "exceljs";
import { requireUser } from "@/shared/lib/require-user";
import { prisma } from "@/shared/lib/prisma";
import { getNoteAccess } from "@/shared/lib/note-access";
import { formatPropertyValue } from "@/shared/lib/property-value";
import { matchesNoteSearch } from "@/modules/notes/lib/search";
import { buildTabularExport, tabularExportToCsv } from "@/modules/export/lib/notes-export";
import { notesExportQuerySchema } from "@/modules/export/schema";

function downloadResponse(body: BodyInit, contentType: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function selectedNotes<
  T extends {
    properties: Array<{ name: string; type: string; values: unknown[] }>;
    title: string;
    contentText: string;
  },
>(notes: T[], query: { search: string; property?: string; q: string }) {
  return notes.filter((note) => {
    if (!matchesNoteSearch(note, query.search)) return false;
    if (!query.property) return true;
    const property = note.properties.find((item) => item.name === query.property);
    if (!property) return false;
    const value = formatPropertyValue(property.type, property.values[0] as never);
    return !query.q.trim() || value.toLowerCase().includes(query.q.trim().toLowerCase());
  });
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const parsed = notesExportQuerySchema.safeParse({
    format: url.searchParams.get("format"),
    scope: url.searchParams.get("scope") ?? undefined,
    noteIds: url.searchParams.getAll("noteIds"),
    noteId: url.searchParams.get("noteId") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    property: url.searchParams.get("property") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code: "invalid_input",
          message: parsed.error.issues[0]?.message ?? "Invalid export.",
        },
      },
      { status: 400 },
    );
  }

  if (parsed.data.scope === "note") {
    const access = await getNoteAccess(parsed.data.noteId!, auth.userId);
    if (!access) {
      return Response.json(
        { error: { code: "not_found", message: "Note not found." } },
        { status: 404 },
      );
    }
  }

  const notes = await prisma.note.findMany({
    where:
      parsed.data.scope === "note"
        ? { id: parsed.data.noteId, deletedAt: null }
        : {
            ownerId: auth.userId,
            deletedAt: null,
            status: "ACTIVE",
            ...(parsed.data.scope === "selected" ? { id: { in: parsed.data.noteIds } } : {}),
          },
    orderBy: { updatedAt: "desc" },
    include: {
      properties: { orderBy: { position: "asc" }, include: { values: true } },
      attachments: {
        select: { id: true, filename: true, mimeType: true, sizeBytes: true, createdAt: true },
      },
    },
  });
  const filtered = selectedNotes(notes, parsed.data);
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const filename = `notula-notes-${date}.${parsed.data.format}`;

  if (parsed.data.format === "json") {
    const backup = {
      formatVersion: 1,
      exportedAt: now.toISOString(),
      notes: filtered.map((note) => ({
        id: note.id,
        title: note.title,
        contentJson: note.contentJson,
        contentText: note.contentText,
        status: note.status,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        properties: note.properties.map((property) => ({
          id: property.id,
          name: property.name,
          slug: property.slug,
          type: property.type,
          inputConfigJson: property.inputConfigJson,
          validationJson: property.validationJson,
          position: property.position,
          required: property.required,
          values: property.values,
        })),
        attachments: note.attachments,
      })),
    };
    return downloadResponse(
      JSON.stringify(backup, null, 2),
      "application/json; charset=utf-8",
      filename,
    );
  }

  const tabular = buildTabularExport(
    filtered.map((note) => ({
      id: note.id,
      title: note.title,
      contentText: note.contentText,
      status: note.status,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      properties: note.properties.map((property) => ({
        name: property.name,
        slug: property.slug,
        type: property.type,
        values: property.values,
      })),
    })),
  );

  if (parsed.data.format === "csv") {
    return downloadResponse(
      `\uFEFF${tabularExportToCsv(tabular)}`,
      "text/csv; charset=utf-8",
      filename,
    );
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Notula";
  workbook.created = now;
  const worksheet = workbook.addWorksheet("Notes");
  worksheet.columns = tabular.headers.map((header, index) => ({
    header,
    key: `column${index}`,
    width: Math.min(Math.max(header.length + 2, 14), 40),
  }));
  worksheet.addRows(tabular.rows);
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = `A1:${worksheet.getColumn(tabular.headers.length).letter}1`;
  worksheet.getRow(1).font = { bold: true };
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return downloadResponse(
    buffer,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename,
  );
}
