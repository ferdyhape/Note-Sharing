export const REMINDER_SCAN_BATCH_SIZE = 200;

export function nextReminderBatchCursor(ids: readonly string[]) {
  return ids.length < REMINDER_SCAN_BATCH_SIZE ? null : (ids.at(-1) ?? null);
}
