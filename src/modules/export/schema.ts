import { z } from "zod";

export const notesExportQuerySchema = z
  .object({
    format: z.enum(["csv", "xlsx", "json"]),
    scope: z.enum(["filtered", "selected", "note"]).default("filtered"),
    noteIds: z.array(z.string().min(1)).max(100).default([]),
    noteId: z.string().min(1).optional(),
    search: z.string().max(200).default(""),
    property: z.string().max(200).optional(),
    q: z.string().max(200).default(""),
  })
  .strict()
  .superRefine((query, context) => {
    if (new Set(query.noteIds).size !== query.noteIds.length) {
      context.addIssue({
        code: "custom",
        path: ["noteIds"],
        message: "Selected Note IDs must be unique.",
      });
    }
    if (query.scope === "filtered" && (query.noteId || query.noteIds.length > 0)) {
      context.addIssue({
        code: "custom",
        path: ["scope"],
        message: "Filtered exports cannot include Note IDs.",
      });
    }
    if (query.scope === "selected" && (query.noteId || query.noteIds.length === 0)) {
      context.addIssue({
        code: "custom",
        path: ["noteIds"],
        message: "Select at least one Note to export.",
      });
    }
    if (query.scope === "note" && (!query.noteId || query.noteIds.length > 0)) {
      context.addIssue({
        code: "custom",
        path: ["noteId"],
        message: "Single-Note export needs one Note ID.",
      });
    }
  });

export type NotesExportQuery = z.infer<typeof notesExportQuerySchema>;
