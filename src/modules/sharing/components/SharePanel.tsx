"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ShareDTO, ShareOwnerDTO, ShareRole } from "@/modules/sharing/types";

const INPUT_CLASS =
  "h-9 min-w-0 rounded-control border border-control bg-surface px-3 text-[13px] text-text outline-none focus-visible:border-accent";
const ACTION_CLASS =
  "min-h-11 rounded-control px-2 text-[12px] font-medium text-text hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8";

function shareDate(value: string) {
  return new Intl.DateTimeFormat("en-ID", { dateStyle: "medium" }).format(new Date(value));
}

export function SharePanel({
  noteId,
  owner,
  initialShares,
}: {
  noteId: string;
  owner: ShareOwnerDTO;
  initialShares: ShareDTO[];
}) {
  const router = useRouter();
  const [shares, setShares] = useState(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("VIEWER");
  const [saving, setSaving] = useState(false);
  const [busyShareId, setBusyShareId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch(`/api/notes/${noteId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not share this Note.");
      setShares((current) => [...current, result.data as ShareDTO]);
      setEmail("");
      setStatus("Access granted.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not share this Note.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(share: ShareDTO, nextRole: ShareRole) {
    if (share.role === nextRole) return;
    setBusyShareId(share.id);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch(`/api/notes/${noteId}/shares/${share.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not update access.");
      setShares((current) =>
        current.map((item) => (item.id === share.id ? (result.data as ShareDTO) : item)),
      );
      setStatus("Access updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update access.");
    } finally {
      setBusyShareId(null);
    }
  }

  async function revokeShare(share: ShareDTO) {
    if (!window.confirm(`Revoke ${share.user.email}'s access to this Note?`)) return;
    setBusyShareId(share.id);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch(`/api/notes/${noteId}/shares/${share.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not revoke access.");
      setShares((current) => current.filter((item) => item.id !== share.id));
      setStatus("Access revoked.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not revoke access.");
    } finally {
      setBusyShareId(null);
    }
  }

  return (
    <section
      id="sharing"
      className="mt-8 border-t border-rule pt-5"
      aria-labelledby="sharing-heading"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="sharing-heading"
          className="text-[13px] font-semibold tracking-wide text-muted uppercase"
        >
          Sharing
        </h2>
      </div>

      <ul className="divide-y divide-rule">
        <li className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="break-words text-[13px] font-medium text-text">
              {owner.name ?? owner.email} <span className="text-muted">(you)</span>
            </p>
            <p className="mt-1 text-[12px] text-muted">{owner.email}</p>
          </div>
          <span className="text-[12px] text-muted">Owner</span>
        </li>
        {shares.map((share) => (
          <li
            key={share.id}
            className="flex flex-col gap-2 py-3 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between"
          >
            <div className="min-w-0">
              <p className="break-words text-[13px] font-medium text-text">
                {share.user.name ?? share.user.email}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                {share.user.email} · Added {shareDate(share.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <label className="sr-only" htmlFor={`share-role-${share.id}`}>
                Role for {share.user.email}
              </label>
              <select
                id={`share-role-${share.id}`}
                value={share.role}
                disabled={busyShareId === share.id}
                onChange={(event) => void updateRole(share, event.target.value as ShareRole)}
                className={INPUT_CLASS}
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="button"
                onClick={() => void revokeShare(share)}
                disabled={busyShareId === share.id}
                className={`${ACTION_CLASS} text-negative`}
              >
                Revoke
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={(event) => void addShare(event)} className="mt-3 border-t border-rule pt-4">
        <div className="grid gap-3 min-[640px]:grid-cols-[minmax(0,1fr)_160px_auto] min-[640px]:items-end">
          <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
            Registered account email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
            Access
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as ShareRole)}
              className={INPUT_CLASS}
            >
              <option value="VIEWER">Viewer</option>
              <option value="EDITOR">Editor</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={saving || !email.trim()}
            className="min-h-11 rounded-control bg-text px-3 text-[12px] font-medium text-ground disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8"
          >
            {saving ? "Sharing…" : "Share Note"}
          </button>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          Only registered Notula accounts can be shared. New users must register first.
        </p>
      </form>

      {status && (
        <p role="status" className="mt-3 text-[13px] text-positive">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-negative">
          {error}
        </p>
      )}
    </section>
  );
}
