import { createHash } from "node:crypto";

export type ReminderDeliveryChannel = "IN_APP" | "PUSH";

export function reminderDeliveryKey(
  reminderId: string,
  occurrenceKey: string,
  recipientId: string,
  channel: ReminderDeliveryChannel,
) {
  const identity = [reminderId, occurrenceKey, recipientId, channel].join("\u0000");
  const digest = createHash("sha256").update(identity).digest("base64url");
  return `reminder:${digest}`;
}
