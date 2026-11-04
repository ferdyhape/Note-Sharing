import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { apiData, apiError } from "@/shared/lib/api-response";
import { getPushDevices } from "@/modules/notifications/lib/get-push-devices";
import { pushSubscriptionSchema } from "../schema";

type ItemRouteParams = { params: Promise<{ id: string }> };

export async function GET() {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  return apiData(await getPushDevices(auth.userId));
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid subscription.",
      400,
    );
  }

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: parsed.data.endpoint },
    select: { id: true, userId: true },
  });
  if (existing && existing.userId !== auth.userId) {
    return apiError(
      "subscription_conflict",
      "This browser subscription belongs to another account.",
      409,
    );
  }

  if (existing) {
    await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: {
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: parsed.data.userAgent ?? request.headers.get("user-agent"),
        lastSeenAt: new Date(),
        revokedAt: null,
      },
    });
  } else {
    await prisma.pushSubscription.create({
      data: {
        userId: auth.userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent: parsed.data.userAgent ?? request.headers.get("user-agent"),
        lastSeenAt: new Date(),
      },
    });
  }

  return apiData(await getPushDevices(auth.userId), { status: 201 });
}

export async function DELETE(_request: Request, { params }: ItemRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const existing = await prisma.pushSubscription.findFirst({
    where: { id, userId: auth.userId, revokedAt: null },
    select: { id: true },
  });
  if (!existing) return apiError("not_found", "Push device not found.", 404);

  await prisma.pushSubscription.update({ where: { id }, data: { revokedAt: new Date() } });
  return apiData({ id });
}
