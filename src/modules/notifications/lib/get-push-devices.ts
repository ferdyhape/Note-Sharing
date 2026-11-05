import { createHash } from "node:crypto";
import { prisma } from "@/shared/lib/prisma";
import type { PushDeviceDTO } from "@/modules/notifications/types";

export async function getPushDevices(userId: string): Promise<PushDeviceDTO[]> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, endpoint: true, userAgent: true, lastSeenAt: true },
  });
  return subscriptions.map((subscription) => ({
    id: subscription.id,
    endpointHash: createHash("sha256").update(subscription.endpoint).digest("hex"),
    userAgent: subscription.userAgent,
    lastSeenAt: subscription.lastSeenAt?.toISOString() ?? null,
  }));
}
