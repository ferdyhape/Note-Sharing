"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateNoteButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function createNote() {
    setPending(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled note" }),
      });
      const body = await res.json();
      if (res.ok) {
        router.push(`/notes/${body.data.id}`);
      } else {
        setPending(false);
      }
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={createNote}
      disabled={pending}
      className="h-9 rounded-full bg-text px-4 text-[13px] font-medium text-ground hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Creating…" : "New note"}
    </button>
  );
}
