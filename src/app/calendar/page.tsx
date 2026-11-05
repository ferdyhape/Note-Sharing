import { redirect } from "next/navigation";
import { Temporal } from "@js-temporal/polyfill";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { resolveScheduleTimezone } from "@/shared/lib/schedule";
import { AppShell } from "@/shared/components/AppShell";
import { getAgenda } from "@/modules/calendar/lib/get-agenda";
import { CalendarAgenda } from "@/modules/calendar/components/CalendarAgenda";
import type { ScheduleOccurrence } from "@/modules/scheduling/lib/occurrences";

type AgendaEvent = ScheduleOccurrence & {
  noteTitle: string;
  canEdit: boolean;
  isRecurring: boolean;
};

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });
  const timezone = resolveScheduleTimezone(undefined, user?.timezone);
  const fromDate = Temporal.Now.instant().toZonedDateTimeISO(timezone).toPlainDate();
  const toDate = fromDate.add({ days: 13 });
  const events = await getAgenda(session.user.id, {
    from: fromDate.toString(),
    to: toDate.toString(),
    timezone,
  });

  return (
    <AppShell active="calendar">
      <CalendarAgenda
        initialFromDate={fromDate.toString()}
        timezone={timezone}
        initialEvents={JSON.parse(JSON.stringify(events)) as AgendaEvent[]}
      />
    </AppShell>
  );
}
