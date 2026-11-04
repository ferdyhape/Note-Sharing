import { randomUUID } from "node:crypto";
import { Prisma, type NotificationDeliveryStatus } from "@prisma/client";
import { expandScheduleOccurrences } from "@/modules/scheduling/lib/occurrences";
import { reminderDeliveryKey } from "@/modules/reminders/lib/delivery-key";
import { isReminderTriggerDue, scheduleReminderWindow } from "@/modules/reminders/lib/due-window";
import { sendWebPush } from "@/modules/notifications/lib/send-web-push";
import { prisma } from "@/shared/lib/prisma";
import { getUpstashRedis } from "@/shared/lib/upstash";

const reminderScanInclude = {
  note: { select: { ownerId: true, shares: { select: { userId: true } } } },
  recipients: {
    where: { enabled: true },
    select: { userId: true, channelPreferencesJson: true },
  },
  schedule: { include: { recurrence: { include: { exceptions: true } } } },
} satisfies Prisma.ReminderInclude;

type ReminderForScan = Prisma.ReminderGetPayload<{ include: typeof reminderScanInclude }>;
type ReminderRecipientForScan = ReminderForScan["recipients"][number];

type ScanSummary = {
  skipped: boolean;
  fixedRemindersProcessed: number;
  scheduleOccurrencesProcessed: number;
  notificationsCreated: number;
  pushesSent: number;
  pushesFailed: number;
  remindersFailed: number;
};

function uniqueConstraint(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function authorizedRecipients(reminder: ReminderForScan) {
  const sharedUserIds = new Set(reminder.note.shares.map((share) => share.userId));
  return reminder.recipients.filter(
    (recipient) =>
      recipient.userId === reminder.note.ownerId || sharedUserIds.has(recipient.userId),
  );
}

function pushPreferenceEnabled(recipient: ReminderRecipientForScan) {
  const preferences = recipient.channelPreferencesJson;
  if (!preferences || typeof preferences !== "object" || Array.isArray(preferences)) return true;
  return preferences.push !== false;
}

async function ensureInAppNotification(
  reminder: ReminderForScan,
  recipient: ReminderRecipientForScan,
  occurrenceKey: string,
  now: Date,
) {
  const idempotencyKey = reminderDeliveryKey(
    reminder.id,
    occurrenceKey,
    recipient.userId,
    "IN_APP",
  );
  const existing = await prisma.notificationDelivery.findUnique({
    where: { idempotencyKey },
    select: { notificationId: true },
  });
  if (existing) return { notificationId: existing.notificationId, created: false };

  try {
    const notification = await prisma.$transaction(async (transaction) => {
      const created = await transaction.inAppNotification.create({
        data: {
          userId: recipient.userId,
          type: "REMINDER",
          payloadJson: {
            title: "Reminder",
            message: "A reminder for a Note you can access is due.",
            noteId: reminder.noteId,
          },
        },
        select: { id: true },
      });
      await transaction.notificationDelivery.create({
        data: {
          notificationId: created.id,
          channel: "IN_APP",
          status: "SENT",
          attempts: 1,
          sentAt: now,
          idempotencyKey,
        },
      });
      return created;
    });
    return { notificationId: notification.id, created: true };
  } catch (error) {
    if (!uniqueConstraint(error)) throw error;
    const concurrent = await prisma.notificationDelivery.findUnique({
      where: { idempotencyKey },
      select: { notificationId: true },
    });
    if (!concurrent) throw error;
    return { notificationId: concurrent.notificationId, created: false };
  }
}

function pushErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return null;
  return typeof error.statusCode === "number" ? error.statusCode : null;
}

async function savePushDelivery(
  existing: { id: string; attempts: number } | null,
  notificationId: string,
  subscriptionId: string,
  idempotencyKey: string,
  status: NotificationDeliveryStatus,
  now: Date,
  errorCode: string | null,
) {
  if (existing) {
    await prisma.notificationDelivery.update({
      where: { id: existing.id },
      data: {
        status,
        attempts: { increment: 1 },
        sentAt: status === "SENT" ? now : null,
        errorCode,
      },
    });
    return;
  }

  await prisma.notificationDelivery.create({
    data: {
      notificationId,
      channel: "PUSH",
      subscriptionId,
      status,
      attempts: 1,
      sentAt: status === "SENT" ? now : null,
      errorCode,
      idempotencyKey,
    },
  });
}

async function sendPushToRecipient(
  reminder: ReminderForScan,
  recipient: ReminderRecipientForScan,
  notificationId: string,
  occurrenceKey: string,
  redis: ReturnType<typeof getUpstashRedis>,
) {
  if (!pushPreferenceEnabled(recipient)) return { sent: 0, failed: 0 };
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: recipient.userId, revokedAt: null },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const idempotencyKey = reminderDeliveryKey(
      reminder.id,
      occurrenceKey,
      `${recipient.userId}:${subscription.id}`,
      "PUSH",
    );
    const lockKey = `notula:push:${idempotencyKey}`;
    const lock = await redis.set(lockKey, randomUUID(), { nx: true, ex: 55 });
    if (lock !== "OK") continue;

    const existing = await prisma.notificationDelivery.findUnique({
      where: { idempotencyKey },
      select: { id: true, attempts: true, status: true },
    });
    if (existing?.status === "SENT") continue;

    const now = new Date();
    try {
      await sendWebPush(subscription, {
        title: "Reminder",
        body: "A reminder for a Note you can access is due.",
        noteId: reminder.noteId,
        tag: idempotencyKey,
      });
      await savePushDelivery(
        existing,
        notificationId,
        subscription.id,
        idempotencyKey,
        "SENT",
        now,
        null,
      );
      sent += 1;
    } catch (error) {
      const statusCode = pushErrorStatus(error);
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { revokedAt: now },
        });
      }
      await savePushDelivery(
        existing,
        notificationId,
        subscription.id,
        idempotencyKey,
        "FAILED",
        now,
        statusCode ? `http_${statusCode}` : "push_failed",
      );
      if (statusCode !== 404 && statusCode !== 410) failed += 1;
    }
  }

  return { sent, failed };
}

async function deliverReminderOccurrence(
  reminder: ReminderForScan,
  occurrenceKey: string,
  now: Date,
  redis: ReturnType<typeof getUpstashRedis>,
) {
  let notificationsCreated = 0;
  let pushesSent = 0;
  let pushesFailed = 0;
  for (const recipient of authorizedRecipients(reminder)) {
    const notification = await ensureInAppNotification(reminder, recipient, occurrenceKey, now);
    if (notification.created) notificationsCreated += 1;
    const push = await sendPushToRecipient(
      reminder,
      recipient,
      notification.notificationId,
      occurrenceKey,
      redis,
    );
    pushesSent += push.sent;
    pushesFailed += push.failed;
  }
  return { notificationsCreated, pushesSent, pushesFailed };
}

export async function processDueReminders(now = new Date()): Promise<ScanSummary> {
  const redis = getUpstashRedis();
  const scanLock = await redis.set("notula:cron:reminder-scan", randomUUID(), {
    nx: true,
    ex: 55,
  });
  if (scanLock !== "OK") {
    return {
      skipped: true,
      fixedRemindersProcessed: 0,
      scheduleOccurrencesProcessed: 0,
      notificationsCreated: 0,
      pushesSent: 0,
      pushesFailed: 0,
      remindersFailed: 0,
    };
  }

  const summary: ScanSummary = {
    skipped: false,
    fixedRemindersProcessed: 0,
    scheduleOccurrencesProcessed: 0,
    notificationsCreated: 0,
    pushesSent: 0,
    pushesFailed: 0,
    remindersFailed: 0,
  };

  const fixedReminders = await prisma.reminder.findMany({
    where: {
      enabled: true,
      triggerMode: "FIXED",
      fixedTriggerAt: { lte: now },
      note: { is: { deletedAt: null } },
    },
    orderBy: { fixedTriggerAt: "asc" },
    take: 200,
    include: reminderScanInclude,
  });

  for (const reminder of fixedReminders) {
    if (!reminder.fixedTriggerAt) continue;
    try {
      const delivered = await deliverReminderOccurrence(
        reminder,
        `fixed:${reminder.fixedTriggerAt.toISOString()}`,
        now,
        redis,
      );
      summary.notificationsCreated += delivered.notificationsCreated;
      summary.pushesSent += delivered.pushesSent;
      summary.pushesFailed += delivered.pushesFailed;
      if (delivered.pushesFailed === 0) {
        await prisma.reminder.update({ where: { id: reminder.id }, data: { enabled: false } });
        summary.fixedRemindersProcessed += 1;
      }
    } catch {
      summary.remindersFailed += 1;
    }
  }

  const scheduleReminders = await prisma.reminder.findMany({
    where: {
      enabled: true,
      triggerMode: "SCHEDULE_RELATIVE",
      schedule: {
        is: {
          enabled: true,
          scheduleType: "TIMED",
          note: { is: { deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: reminderScanInclude,
  });

  for (const reminder of scheduleReminders) {
    const schedule = reminder.schedule;
    if (!schedule || reminder.offsetSeconds === null) continue;
    try {
      const window = scheduleReminderWindow(now, reminder.offsetSeconds, schedule.timezone);
      const occurrences = expandScheduleOccurrences(
        schedule,
        schedule.recurrence,
        schedule.recurrence?.exceptions ?? [],
        window,
      );

      for (const occurrence of occurrences) {
        if (!occurrence.startAtUtc) continue;
        const triggerAt = new Date(
          new Date(occurrence.startAtUtc).getTime() - reminder.offsetSeconds * 1000,
        );
        if (!isReminderTriggerDue(triggerAt, window)) continue;

        const delivered = await deliverReminderOccurrence(
          reminder,
          occurrence.occurrenceKey,
          now,
          redis,
        );
        summary.notificationsCreated += delivered.notificationsCreated;
        summary.pushesSent += delivered.pushesSent;
        summary.pushesFailed += delivered.pushesFailed;
        summary.scheduleOccurrencesProcessed += 1;
      }
    } catch {
      summary.remindersFailed += 1;
    }
  }

  return summary;
}
