import { notFound, redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { resolveScheduleTimezone } from "@/shared/lib/schedule";
import { AppShell } from "@/shared/components/AppShell";
import { TimezoneSettings } from "@/modules/identity/components/TimezoneSettings";
import { PushSettings } from "@/modules/notifications/components/PushSettings";
import { getPushDevices } from "@/modules/notifications/lib/get-push-devices";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, devices] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { timezone: true },
    }),
    getPushDevices(session.user.id),
  ]);
  if (!user) notFound();

  return (
    <AppShell active="settings">
      <h1 className="mb-2 text-[20px] font-semibold text-text">Settings</h1>
      <p className="text-[13px] text-muted">Account preferences</p>
      <TimezoneSettings
        initialTimezone={user.timezone}
        initialEffectiveTimezone={resolveScheduleTimezone(undefined, user.timezone)}
      />
      <PushSettings
        initialDevices={devices}
        publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
        configured={Boolean(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
          process.env.VAPID_PRIVATE_KEY &&
          process.env.VAPID_SUBJECT,
        )}
      />
    </AppShell>
  );
}
