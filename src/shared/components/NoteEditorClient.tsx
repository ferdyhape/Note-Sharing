"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { JSONContent } from "@tiptap/react";
import { RichEditor } from "@/shared/components/RichEditor";
import type { NoteAccessLevel } from "@/shared/lib/note-access";

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 800;

export function NoteEditorClient({
  noteId,
  initialTitle,
  initialContentJson,
  accessLevel,
}: {
  noteId: string;
  initialTitle: string;
  initialContentJson: JSONContent;
  accessLevel: NoteAccessLevel;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Accumulates fields changed since the last send — title and editor content
  // change independently, and a naive "replace the pending patch" approach
  // silently drops whichever field changed first if the other changes again
  // within the debounce window.
  const pendingPatch = useRef<Record<string, unknown>>({});
  const canEdit = accessLevel === "OWNER" || accessLevel === "EDITOR";

  function scheduleSave(fields: Record<string, unknown>) {
    if (!canEdit) return;
    Object.assign(pendingPatch.current, fields);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      const patch = pendingPatch.current;
      pendingPatch.current = {};
      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_DELAY_MS);
  }

  return (
    <div>
      <nav className="mb-3.5 text-xs text-muted">
        <Link href="/notes" className="hover:text-text">
          All Notes
        </Link>
        <span className="mx-1.5">/</span>
        {title || "Untitled note"}
      </nav>

      <div className="mb-1 flex items-center justify-between gap-3">
        <input
          value={title}
          disabled={!canEdit}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          placeholder="Untitled note"
          className="w-full bg-transparent text-[19px] font-semibold outline-none disabled:cursor-not-allowed"
        />
        <SaveIndicator state={saveState} canEdit={canEdit} />
      </div>

      <RichEditor
        content={initialContentJson}
        editable={canEdit}
        onChange={({ json, text }) => scheduleSave({ contentJson: json, contentText: text })}
      />
    </div>
  );
}

function SaveIndicator({ state, canEdit }: { state: SaveState; canEdit: boolean }) {
  if (!canEdit) return <span className="shrink-0 text-xs text-muted">View only</span>;
  const label = { idle: "", saving: "Saving…", saved: "Saved", error: "Couldn't save" }[state];
  if (!label) return null;
  return (
    <span className={`shrink-0 text-xs ${state === "error" ? "text-negative" : "text-muted"}`}>
      {label}
    </span>
  );
}
