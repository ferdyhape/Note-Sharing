"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NoteStatusButton({
  noteId,
  status,
}: {
  noteId: string;
  status: "ACTIVE" | "ARCHIVED";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextStatus = status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
  const actionLabel = status === "ACTIVE" ? "Archive" : "Restore";

  async function updateStatus() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? `Could not ${actionLabel.toLowerCase()} Note.`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : `Could not ${actionLabel.toLowerCase()} Note.`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void updateStatus()}
        disabled={pending}
        aria-label={`${actionLabel} Note`}
        className="min-h-11 rounded-control px-2 text-[12px] font-medium text-text hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8"
      >
        {pending ? "Saving…" : actionLabel}
      </button>
      {error && (
        <p role="alert" className="text-[12px] text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
