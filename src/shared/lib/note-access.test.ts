import { describe, expect, it } from "vitest";
import { canEdit, canManageSharing } from "./note-permissions";

describe("canEdit", () => {
  it("allows Owner and Editor while keeping Viewer and missing access read-only", () => {
    expect(canEdit("OWNER")).toBe(true);
    expect(canEdit("EDITOR")).toBe(true);
    expect(canEdit("VIEWER")).toBe(false);
    expect(canEdit(null)).toBe(false);
  });

  it("keeps sharing management Owner-only", () => {
    expect(canManageSharing("OWNER")).toBe(true);
    expect(canManageSharing("EDITOR")).toBe(false);
    expect(canManageSharing("VIEWER")).toBe(false);
    expect(canManageSharing(null)).toBe(false);
  });
});
