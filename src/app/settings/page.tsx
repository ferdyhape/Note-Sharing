import { notFound, redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { resolveScheduleTimezone } from "@/shared/lib/schedule";
import { AppShell } from "@/shared/components/AppShell";
import { TimezoneSettings } from "@/modules/identity/components/TimezoneSettings";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });
  if (!user) notFound();

  return (
    <AppShell active="settings">
      <h1 className="mb-2 text-[20px] font-semibold text-text">Settings</h1>
      <p className="text-[13px] text-muted">Account preferences</p>
      <TimezoneSettings
        initialTimezone={user.timezone}
        initialEffectiveTimezone={resolveScheduleTimezone(undefined, user.timezone)}
      />
    </AppShell>
  );
}
