import Link from "next/link";
import { redirect } from "next/navigation";
import { Temporal } from "@js-temporal/polyfill";
import { AppShell } from "@/shared/components/AppShell";
import { CreateNoteButton } from "@/shared/components/CreateNoteButton";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { resolveScheduleTimezone } from "@/shared/lib/schedule";
import { getAgenda } from "@/modules/calendar/lib/get-agenda";
import { formatScheduleDate, formatScheduleTime } from "@/modules/scheduling/lib/schedule-time";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timezone = resolveScheduleTimezone(undefined, user?.timezone);
  const now = new Date();
  const today = Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(timezone)
    .toPlainDate();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const queryEnd = today.add({ days: 61 });

  const [recentNotes, agenda, reminderRecords, unreadCount] = await Promise.all([
    prisma.note.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        ownerId: true,
        owner: { select: { name: true, email: true } },
      },
    }),
    getAgenda(userId, {
      from: today.toString(),
      to: queryEnd.toString(),
      timezone,
    }),
    prisma.reminder.findMany({
      where: {
        enabled: true,
        note: { is: { deletedAt: null, status: "ACTIVE" } },
        recipients: { some: { userId, enabled: true } },
      },
      select: {
        id: true,
        noteId: true,
        triggerMode: true,
        fixedTriggerAt: true,
        offsetSeconds: true,
        scheduleId: true,
        note: { select: { title: true } },
      },
    }),
    prisma.inAppNotification.count({ where: { userId, readAt: null } }),
  ]);

  const todayEvents = agenda.filter((event) => {
    const eventDate = event.startAtUtc
      ? Temporal.Instant.from(event.startAtUtc)
          .toZonedDateTimeISO(timezone)
          .toPlainDate()
          .toString()
      : event.startDate;
    return eventDate === today.toString();
  });

  const remindersBySchedule = new Map<string, typeof reminderRecords>();
  const upcomingReminders: Array<{
    id: string;
    noteId: string;
    title: string;
    triggerAt: Date;
    occurrenceKey: string;
  }> = [];

  for (const reminder of reminderRecords) {
    if (reminder.triggerMode === "FIXED" && reminder.fixedTriggerAt) {
      if (reminder.fixedTriggerAt >= now && reminder.fixedTriggerAt <= weekEnd) {
        upcomingReminders.push({
          id: reminder.id,
          noteId: reminder.noteId,
          title: reminder.note.title,
          triggerAt: reminder.fixedTriggerAt,
          occurrenceKey: reminder.fixedTriggerAt.toISOString(),
        });
      }
    } else if (reminder.scheduleId) {
      const current = remindersBySchedule.get(reminder.scheduleId) ?? [];
      current.push(reminder);
      remindersBySchedule.set(reminder.scheduleId, current);
    }
  }

  for (const event of agenda) {
    if (!event.startAtUtc) continue;
    for (const reminder of remindersBySchedule.get(event.scheduleId) ?? []) {
      const triggerAt = new Date(
        new Date(event.startAtUtc).getTime() - (reminder.offsetSeconds ?? 0) * 1000,
      );
      if (triggerAt >= now && triggerAt <= weekEnd) {
        upcomingReminders.push({
          id: reminder.id,
          noteId: event.noteId,
          title: event.noteTitle,
          triggerAt,
          occurrenceKey: event.occurrenceKey,
        });
      }
    }
  }
  upcomingReminders.sort((left, right) => left.triggerAt.getTime() - right.triggerAt.getTime());

  return (
    <AppShell active="dashboard">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-semibold">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted">
            Today · {formatScheduleDate(today.toString())} · {timezone}
          </p>
        </div>
        <CreateNoteButton />
      </div>

      <div className="grid gap-8 min-[900px]:grid-cols-2">
        <section className="border-t border-rule pt-4" aria-labelledby="dashboard-agenda-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="dashboard-agenda-heading" className="text-[14px] font-medium">
              Today&apos;s schedule <span className="text-muted">({todayEvents.length})</span>
            </h2>
            <Link href="/calendar" className="text-[12px] text-accent hover:underline">
              Calendar
            </Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="py-3 text-[13px] text-muted">Nothing scheduled today.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {todayEvents.slice(0, 6).map((event) => (
                <li key={`${event.scheduleId}:${event.occurrenceKey}`} className="py-3">
                  <Link
                    href={`/notes/${event.noteId}`}
                    className="text-[13px] font-medium hover:underline"
                  >
                    {event.noteTitle || "Untitled note"}
                  </Link>
                  <p className="mt-1 text-[12px] text-muted">
                    {event.startAtUtc
                      ? formatScheduleTime(event.startAtUtc, timezone)
                      : `${formatScheduleDate(event.startDate!)}${event.endDate ? ` – ${formatScheduleDate(event.endDate)}` : " · All day"}`}
                    {event.endAtUtc ? ` – ${formatScheduleTime(event.endAtUtc, timezone)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="border-t border-rule pt-4"
          aria-labelledby="dashboard-reminders-heading"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="dashboard-reminders-heading" className="text-[14px] font-medium">
              Upcoming reminders <span className="text-muted">({upcomingReminders.length})</span>
            </h2>
            <Link href="/reminders" className="text-[12px] text-accent hover:underline">
              Notifications{unreadCount ? ` · ${unreadCount} unread` : ""}
            </Link>
          </div>
          {upcomingReminders.length === 0 ? (
            <p className="py-3 text-[13px] text-muted">No reminders due in the next 7 days.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {upcomingReminders.slice(0, 6).map((reminder) => (
                <li key={`${reminder.id}:${reminder.occurrenceKey}`} className="py-3">
                  <Link
                    href={`/notes/${reminder.noteId}`}
                    className="text-[13px] font-medium hover:underline"
                  >
                    {reminder.title || "Untitled note"}
                  </Link>
                  <p className="mt-1 text-[12px] text-muted">
                    {formatScheduleTime(reminder.triggerAt.toISOString(), timezone)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="border-t border-rule pt-4 min-[900px]:col-span-2"
          aria-labelledby="dashboard-recent-heading"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="dashboard-recent-heading" className="text-[14px] font-medium">
              Recent Notes
            </h2>
            <Link href="/notes" className="text-[12px] text-accent hover:underline">
              All Notes
            </Link>
          </div>
          {recentNotes.length === 0 ? (
            <p className="py-3 text-[13px] text-muted">No active Notes yet.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {recentNotes.map((note) => (
                <li
                  key={note.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <Link
                    href={`/notes/${note.id}`}
                    className="text-[13px] font-medium hover:underline"
                  >
                    {note.title}
                  </Link>
                  <span className="text-[12px] text-muted">
                    {note.ownerId === userId
                      ? "Owned"
                      : `Shared by ${note.owner.name ?? note.owner.email}`}
                    {" · "}
                    {note.updatedAt.toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
