import { describe, expect, it } from "vitest";
import { matchesNoteSearch } from "./search";

describe("matchesNoteSearch", () => {
  const note = { title: "Project Atlas", contentText: "Meeting notes for Thursday." };

  it("searches title and body without case sensitivity", () => {
    expect(matchesNoteSearch(note, "atlas")).toBe(true);
    expect(matchesNoteSearch(note, "THURSDAY")).toBe(true);
    expect(matchesNoteSearch(note, "missing")).toBe(false);
  });

  it("matches every Note for blank search text", () => {
    expect(matchesNoteSearch(note, "   ")).toBe(true);
  });
});
