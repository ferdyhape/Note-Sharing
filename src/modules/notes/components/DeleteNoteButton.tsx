"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteNoteButton({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteNote() {
    if (!window.confirm("Delete this Note? It will be removed from your active workspace.")) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not delete this Note.");
      router.replace("/notes");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this Note.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
      <p className="text-[13px] text-muted">Delete this Note from your active workspace.</p>
      <button
        type="button"
        onClick={() => void deleteNote()}
        disabled={deleting}
        className="min-h-11 rounded-control border border-control px-3 text-[12px] font-medium text-negative hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8"
      >
        {deleting ? "Deleting…" : "Delete Note"}
      </button>
      {error && (
        <p role="alert" className="w-full text-[13px] text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
