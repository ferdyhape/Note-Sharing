import { describe, expect, it } from "vitest";
import { noteToMarkdown, notesToPdf } from "./document-export";

const note = {
  title: "Export note",
  contentJson: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Details" }] },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Keep this", marks: [{ type: "bold" }] }],
      },
    ],
  },
  contentText: "Details\nKeep this",
  properties: [],
  attachments: [],
};

describe("document exports", () => {
  it("preserves headings and inline emphasis in Markdown", () => {
    const markdown = noteToMarkdown(note);
    expect(markdown).toContain("# Export note");
    expect(markdown).toContain("## Details");
    expect(markdown).toContain("**Keep this**");
  });

  it("generates a paginated PDF document", async () => {
    const pdf = await notesToPdf([{ ...note, title: "Café résumé" }]);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  });
});
