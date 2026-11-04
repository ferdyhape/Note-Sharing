import { Temporal } from "@js-temporal/polyfill";
import type { AgendaQuery } from "@/modules/calendar/schema";

export type CalendarWindow = AgendaQuery & {
  timezone: string;
  startsAtUtc: Date;
  endsAtUtc: Date;
  endsBeforeDate: Date;
};

export function makeCalendarWindow(query: AgendaQuery, timezone: string): CalendarWindow {
  const startsAtUtc = Temporal.PlainDateTime.from(`${query.from}T00:00`)
    .toZonedDateTime(timezone, { disambiguation: "compatible" })
    .toInstant();
  const endsBeforeDate = Temporal.PlainDate.from(query.to).add({ days: 1 });
  const endsAtUtc = Temporal.PlainDateTime.from(`${endsBeforeDate.toString()}T00:00`)
    .toZonedDateTime(timezone, { disambiguation: "compatible" })
    .toInstant();

  return {
    ...query,
    timezone,
    startsAtUtc: new Date(startsAtUtc.epochMilliseconds),
    endsAtUtc: new Date(endsAtUtc.epochMilliseconds),
    endsBeforeDate: new Date(`${endsBeforeDate.toString()}T00:00:00.000Z`),
  };
}
