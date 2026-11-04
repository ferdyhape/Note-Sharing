export type NoteAccessLevel = "OWNER" | "EDITOR" | "VIEWER" | null;

export function canEdit(level: NoteAccessLevel): boolean {
  return level === "OWNER" || level === "EDITOR";
}

export function canManageSharing(level: NoteAccessLevel): boolean {
  return level === "OWNER";
}
