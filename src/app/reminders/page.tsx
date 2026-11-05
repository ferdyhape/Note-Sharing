import { redirect } from "next/navigation";
import { AppShell } from "@/shared/components/AppShell";
import { auth } from "@/shared/lib/auth";
import { getNotifications } from "@/modules/notifications/lib/get-notifications";
import { NotificationCenter } from "@/modules/notifications/components/NotificationCenter";

export default async function RemindersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const initialPage = await getNotifications(session.user.id, { filter: "all" });
  return (
    <AppShell active="reminders">
      <NotificationCenter initialPage={initialPage} />
    </AppShell>
  );
}
