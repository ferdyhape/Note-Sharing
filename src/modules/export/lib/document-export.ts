import type { JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { formatPropertyValue } from "../../../shared/lib/property-value";

export type DocumentExportNote = {
  title: string;
  contentJson: unknown;
  contentText: string;
  properties: Array<{
    name: string;
    type: string;
    values: Array<{
      valueJson: unknown;
      valueText: string | null;
      valueNumber: unknown;
      valueDate: Date | null;
      relationNoteId: string | null;
      relationUserId: string | null;
    }>;
  }>;
  attachments: Array<{ filename: string; mimeType: string; sizeBytes: number }>;
};

const markdownManager = new MarkdownManager({ extensions: [StarterKit] });
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 48;

function markdownText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function noteToMarkdown(note: DocumentExportNote) {
  const content =
    typeof note.contentJson === "object" && note.contentJson !== null
      ? markdownManager.serialize(note.contentJson as JSONContent).trim()
      : "";
  const properties = note.properties
    .map((property) => {
      const value = formatPropertyValue(property.type, property.values[0] ?? null);
      return `- **${markdownText(property.name)}:** ${markdownText(value)}`;
    })
    .join("\n");
  const attachments = note.attachments
    .map(
      (attachment) =>
        `- ${markdownText(attachment.filename)} (${markdownText(attachment.mimeType)})`,
    )
    .join("\n");

  return [
    `# ${markdownText(note.title)}`,
    content,
    properties ? `## Properties\n\n${properties}` : "",
    attachments ? `## Attachments\n\n${attachments}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function notesToMarkdown(notes: DocumentExportNote[]) {
  return notes.map(noteToMarkdown).join("\n\n---\n\n");
}

function pdfSafeText(value: string, supportedCharacters: Set<number>) {
  return Array.from(value.normalize("NFC"), (character) =>
    supportedCharacters.has(character.codePointAt(0)!) ? character : "?",
  )
    .join("")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[•]/g, "*");
}

function wrapText(
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  size: number,
  maxWidth: number,
) {
  const lines: string[] = [];
  const supportedCharacters = new Set(font.getCharacterSet());
  for (const paragraph of pdfSafeText(text, supportedCharacters).split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function notesToPdf(notes: DocumentExportNote[]) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - PAGE_MARGIN;
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;

  function newPage() {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    cursorY = PAGE_HEIGHT - PAGE_MARGIN;
  }

  function drawLines(lines: string[], font: typeof regular, size: number, lineHeight: number) {
    for (const line of lines) {
      if (cursorY < PAGE_MARGIN + lineHeight) newPage();
      if (line) page.drawText(line, { x: PAGE_MARGIN, y: cursorY, size, font });
      cursorY -= lineHeight;
    }
  }

  for (const [index, note] of notes.entries()) {
    if (index > 0) {
      cursorY -= 18;
      if (cursorY < PAGE_MARGIN + 36) newPage();
    }
    drawLines(wrapText(note.title, bold, 18, contentWidth), bold, 18, 24);
    cursorY -= 8;
    drawLines(wrapText(note.contentText, regular, 11, contentWidth), regular, 11, 15);

    const details = [
      ...note.properties.map((property) => {
        const value = formatPropertyValue(property.type, property.values[0] ?? null);
        return `${property.name}: ${value || "—"}`;
      }),
      ...note.attachments.map(
        (attachment) => `Attachment: ${attachment.filename} (${attachment.mimeType})`,
      ),
    ];
    if (details.length) {
      cursorY -= 10;
      drawLines(wrapText("Properties and attachments", bold, 12, contentWidth), bold, 12, 17);
      drawLines(wrapText(details.join("\n"), regular, 10, contentWidth), regular, 10, 14);
    }
  }

  return document.save();
}
