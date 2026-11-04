import { Temporal } from "@js-temporal/polyfill";

export function monthGridStart(monthValue: string) {
  const firstOfMonth = Temporal.PlainDate.from(`${monthValue.slice(0, 7)}-01`);
  return firstOfMonth.subtract({ days: firstOfMonth.dayOfWeek - 1 });
}

export function monthGridDates(monthValue: string) {
  const start = monthGridStart(monthValue);
  return Array.from({ length: 42 }, (_, index) => start.add({ days: index }));
}

export function shiftMonth(monthValue: string, months: number) {
  return Temporal.PlainDate.from(`${monthValue.slice(0, 7)}-01`)
    .add({ months })
    .toString();
}

export function isInMonth(date: Temporal.PlainDate, monthValue: string) {
  return date.toString().slice(0, 7) === monthValue.slice(0, 7);
}
