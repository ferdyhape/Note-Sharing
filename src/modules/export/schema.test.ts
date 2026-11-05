import { describe, expect, it } from "vitest";
import { notesExportQuerySchema } from "./schema";

describe("notesExportQuerySchema", () => {
  it("accepts filtered, selected, and single-Note export scopes", () => {
    expect(notesExportQuerySchema.safeParse({ format: "csv" }).success).toBe(true);
    expect(
      notesExportQuerySchema.safeParse({ format: "markdown", scope: "note", noteId: "note-1" })
        .success,
    ).toBe(true);
    expect(
      notesExportQuerySchema.safeParse({ format: "pdf", scope: "selected", noteIds: ["note-1"] })
        .success,
    ).toBe(true);
    expect(
      notesExportQuerySchema.safeParse({ format: "xlsx", scope: "selected", noteIds: ["note-1"] })
        .success,
    ).toBe(true);
    expect(
      notesExportQuerySchema.safeParse({ format: "json", scope: "note", noteId: "note-1" }).success,
    ).toBe(true);
  });

  it("rejects empty or conflicting scope IDs and duplicate selections", () => {
    expect(notesExportQuerySchema.safeParse({ format: "csv", scope: "selected" }).success).toBe(
      false,
    );
    expect(
      notesExportQuerySchema.safeParse({ format: "csv", scope: "note", noteIds: ["note-1"] })
        .success,
    ).toBe(false);
    expect(
      notesExportQuerySchema.safeParse({
        format: "csv",
        scope: "selected",
        noteIds: ["note-1", "note-1"],
      }).success,
    ).toBe(false);
  });
});
