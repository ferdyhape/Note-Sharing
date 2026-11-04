import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { getNoteAccess } from "@/shared/lib/note-access";
import { AppShell } from "@/shared/components/AppShell";
import { NoteEditorClient } from "@/shared/components/NoteEditorClient";
import { PropertiesPanel, type PropertyDTO } from "@/shared/components/PropertiesPanel";
import { canEdit } from "@/shared/lib/note-access";
import { SchedulePanel } from "@/modules/scheduling/components/SchedulePanel";
import type { ScheduleDTO } from "@/modules/scheduling/types";
import { resolveScheduleTimezone } from "@/shared/lib/schedule";
import { ReminderPanel } from "@/modules/reminders/components/ReminderPanel";
import type { ReminderDTO, ReminderRecipientOption } from "@/modules/reminders/types";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const access = await getNoteAccess(id, session.user.id);
  if (!access) notFound();

  const [note, properties, schedules, reminders, recipientShares, user] = await Promise.all([
    prisma.note.findUniqueOrThrow({
      where: { id },
      select: { id: true, title: true, contentJson: true },
    }),
    prisma.noteProperty.findMany({
      where: { noteId: id },
      orderBy: { position: "asc" },
      include: { values: true },
    }),
    prisma.noteSchedule.findMany({
      where: { noteId: id },
      orderBy: { createdAt: "desc" },
      include: { recurrence: true },
    }),
    prisma.reminder.findMany({
      where: { noteId: id },
      orderBy: { createdAt: "desc" },
      include: { recipients: { select: { id: true, userId: true, enabled: true } } },
    }),
    prisma.noteShare.findMany({
      where: { noteId: id },
      orderBy: { createdAt: "asc" },
      select: { role: true, user: { select: { id: true, name: true } } },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } }),
  ]);
  const scheduleTimezone = resolveScheduleTimezone(undefined, user?.timezone);

  return (
    <AppShell active="notes">
      <NoteEditorClient
        noteId={note.id}
        initialTitle={note.title}
        initialContentJson={note.contentJson as JSONContent}
        accessLevel={access}
      />
      <SchedulePanel
        noteId={note.id}
        initialSchedules={JSON.parse(JSON.stringify(schedules)) as ScheduleDTO[]}
        defaultTimezone={scheduleTimezone}
        canEdit={canEdit(access)}
      />
      <ReminderPanel
        noteId={note.id}
        initialReminders={JSON.parse(JSON.stringify(reminders)) as ReminderDTO[]}
        schedules={JSON.parse(JSON.stringify(schedules)) as ScheduleDTO[]}
        recipients={
          recipientShares.map((share) => ({
            userId: share.user.id,
            name: share.user.name,
            role: share.role,
          })) as ReminderRecipientOption[]
        }
        timezone={scheduleTimezone}
        canEdit={canEdit(access)}
      />
      <PropertiesPanel
        noteId={note.id}
        // Dates/Decimals cross the server→client boundary as plain JSON, same
        // shape the /properties API returns after a mutation — keeps the two
        // data sources interchangeable on the client.
        initialProperties={JSON.parse(JSON.stringify(properties)) as PropertyDTO[]}
        canEdit={canEdit(access)}
      />
    </AppShell>
  );
}
