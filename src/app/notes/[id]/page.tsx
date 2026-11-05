import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { getNoteAccess, canEdit } from "@/shared/lib/note-access";
import { AppShell } from "@/shared/components/AppShell";
import { NoteEditorClient } from "@/shared/components/NoteEditorClient";
import { PropertiesPanel, type PropertyDTO } from "@/shared/components/PropertiesPanel";
import { SchedulePanel } from "@/modules/scheduling/components/SchedulePanel";
import type { ScheduleDTO } from "@/modules/scheduling/types";
import { resolveScheduleTimezone } from "@/shared/lib/schedule";
import { ReminderPanel } from "@/modules/reminders/components/ReminderPanel";
import type { ReminderDTO, ReminderRecipientOption } from "@/modules/reminders/types";
import { SharePanel } from "@/modules/sharing/components/SharePanel";
import type { ShareDTO } from "@/modules/sharing/types";
import { ExportActions } from "@/modules/export/components/ExportActions";
import { DeleteNoteButton } from "@/modules/notes/components/DeleteNoteButton";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const access = await getNoteAccess(id, session.user.id);
  if (!access) notFound();

  const [note, properties, schedules, reminders, recipientShares, user] = await Promise.all([
    prisma.note.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        title: true,
        contentJson: true,
        owner: { select: { id: true, name: true, email: true } },
      },
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
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } }),
  ]);
  const scheduleTimezone = resolveScheduleTimezone(undefined, user?.timezone);

  return (
    <AppShell
      active="notes"
      shareHref={access === "OWNER" ? `/notes/${note.id}#note-tools` : undefined}
    >
      <NoteEditorClient
        noteId={note.id}
        initialTitle={note.title}
        initialContentJson={note.contentJson as JSONContent}
        accessLevel={access}
      />
      <details id="note-tools" className="mt-6 border-t border-rule pt-3">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-[13px] font-medium text-text [&::-webkit-details-marker]:hidden">
          <span>Note tools</span>
          <span className="text-[12px] font-normal text-muted">
            Properties · Schedule · Reminders
            {access === "OWNER" ? " · Sharing · Export · Delete" : ""}
          </span>
        </summary>
        <div className="pt-1">
          {access === "OWNER" && (
            <>
              <div className="flex justify-end">
                <ExportActions search="" property="" query="" scope="note" noteId={note.id} />
              </div>
              <SharePanel
                key={recipientShares.map((share) => `${share.id}:${share.role}`).join("|")}
                noteId={note.id}
                owner={{ name: note.owner.name, email: note.owner.email }}
                initialShares={
                  JSON.parse(
                    JSON.stringify(
                      recipientShares.map((share) => ({
                        id: share.id,
                        userId: share.userId,
                        role: share.role,
                        createdAt: share.createdAt,
                        user: share.user,
                      })),
                    ),
                  ) as ShareDTO[]
                }
              />
            </>
          )}
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
              [
                { userId: note.owner.id, name: note.owner.name, role: "OWNER" },
                ...recipientShares.map((share) => ({
                  userId: share.user.id,
                  name: share.user.name,
                  role: share.role,
                })),
              ] as ReminderRecipientOption[]
            }
            timezone={scheduleTimezone}
            canEdit={canEdit(access)}
          />
          <PropertiesPanel
            noteId={note.id}
            initialProperties={JSON.parse(JSON.stringify(properties)) as PropertyDTO[]}
            canEdit={canEdit(access)}
          />
          {access === "OWNER" && <DeleteNoteButton noteId={note.id} />}
        </div>
      </details>
    </AppShell>
  );
}
