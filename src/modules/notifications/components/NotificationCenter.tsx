"use client";

import Link from "next/link";
import { useState } from "react";
import type { NotificationDTO, NotificationPage } from "@/modules/notifications/types";

type NotificationFilter = "all" | "unread";

const ACTION_CLASS =
  "min-h-11 rounded-control px-2 text-[12px] font-medium text-text hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8";

function notificationDate(value: string) {
  return new Intl.DateTimeFormat("en-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function fetchPage(filter: NotificationFilter, cursor?: string): Promise<NotificationPage> {
  const query = new URLSearchParams({ filter, ...(cursor ? { cursor } : {}) });
  const response = await fetch(`/api/notifications?${query}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "Could not load notifications.");
  return result.data as NotificationPage;
}

export function NotificationCenter({ initialPage }: { initialPage: NotificationPage }) {
  const [notifications, setNotifications] = useState(initialPage.notifications);
  const [unreadCount, setUnreadCount] = useState(initialPage.unreadCount);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeFilter(nextFilter: NotificationFilter) {
    if (nextFilter === filter) return;
    setError(null);
    setLoading(true);
    try {
      const page = await fetchPage(nextFilter);
      setFilter(nextFilter);
      setNotifications(page.notifications);
      setUnreadCount(page.unreadCount);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function loadOlder() {
    if (!nextCursor) return;
    setError(null);
    setLoading(true);
    try {
      const page = await fetchPage(filter, nextCursor);
      setNotifications((current) => [...current, ...page.notifications]);
      setUnreadCount(page.unreadCount);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load older notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function setRead(notification: NotificationDTO, read: boolean) {
    setError(null);
    setBusyId(notification.id);
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not update notification.");
      const updated = result.data as NotificationDTO;
      setNotifications((current) =>
        filter === "unread" && read
          ? current.filter((item) => item.id !== updated.id)
          : current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setUnreadCount((count) => Math.max(0, count + (read ? -1 : 1)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update notification.");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Could not mark notifications as read.");
      const readAt = result.data.readAt as string;
      setNotifications((current) =>
        filter === "unread"
          ? []
          : current.map((item) => (item.readAt ? item : { ...item, readAt })),
      );
      setUnreadCount(0);
      if (filter === "unread") setNextCursor(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not mark notifications as read.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="notifications-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="notifications-heading" className="text-[19px] font-semibold">
            Notifications
          </h1>
          <p className="mt-1 text-[13px] text-muted">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={saving || loading}
            className={ACTION_CLASS}
          >
            {saving ? "Updating…" : "Mark all read"}
          </button>
        )}
      </div>

      <div className="mb-3 flex gap-1 border-b border-rule" aria-label="Notification filter">
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => void changeFilter(value)}
            disabled={loading}
            className={`min-h-10 border-b-2 px-3 text-[13px] font-medium capitalize ${filter === value ? "border-accent text-text" : "border-transparent text-muted hover:text-text"}`}
          >
            {value}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-3 text-[13px] text-negative">
          {error}
        </p>
      )}

      {notifications.length === 0 && loading ? (
        <p role="status" className="py-4 text-[13px] text-muted">
          Loading notifications…
        </p>
      ) : notifications.length === 0 ? (
        <p className="py-4 text-[13px] text-muted">
          {filter === "unread" ? "You're all caught up." : "No notifications yet."}
        </p>
      ) : (
        <ul className="divide-y divide-rule">
          {notifications.map((notification) => (
            <li key={notification.id} className="flex gap-3 py-4">
              <span
                aria-label={notification.readAt ? "Read" : "Unread"}
                className={`mt-[7px] h-2 w-2 flex-none rounded-full ${notification.readAt ? "bg-rule" : "bg-accent"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h2 className="text-[14px] font-medium text-text">{notification.title}</h2>
                  <time className="text-[12px] text-muted" dateTime={notification.createdAt}>
                    {notificationDate(notification.createdAt)}
                  </time>
                </div>
                {notification.message && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] text-muted">
                    {notification.message}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {notification.noteId && (
                    <Link
                      href={`/notes/${notification.noteId}`}
                      className="min-h-11 py-2 text-[12px] font-medium text-accent hover:underline min-[900px]:min-h-8"
                    >
                      Open Note
                    </Link>
                  )}
                  <button
                    type="button"
                    disabled={busyId === notification.id || loading}
                    onClick={() => void setRead(notification, notification.readAt === null)}
                    className={`${ACTION_CLASS} min-h-11 px-0 text-accent min-[900px]:min-h-8`}
                  >
                    {busyId === notification.id
                      ? "Updating…"
                      : notification.readAt
                        ? "Mark unread"
                        : "Mark read"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {nextCursor && (
        <button
          type="button"
          onClick={() => void loadOlder()}
          disabled={loading}
          className={`${ACTION_CLASS} mt-2 border border-control`}
        >
          {loading ? "Loading…" : "Load older"}
        </button>
      )}
    </section>
  );
}
