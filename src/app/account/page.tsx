import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { AppShell } from "@/shared/components/AppShell";
import { AccountActions } from "@/shared/components/AccountActions";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  if (!user) notFound();

  return (
    <AppShell active="account">
      <h1 className="mb-2 text-[20px] font-semibold text-text">Account</h1>
      <p className="text-[13px] text-muted">Your Notula profile.</p>

      <dl className="mt-5 max-w-sm divide-y divide-rule border-y border-rule text-[13px]">
        <div className="flex items-center justify-between py-3">
          <dt className="text-muted">Name</dt>
          <dd className="font-medium text-text">{user.name ?? "—"}</dd>
        </div>
        <div className="flex items-center justify-between py-3">
          <dt className="text-muted">Email</dt>
          <dd className="font-medium text-text">{user.email}</dd>
        </div>
      </dl>

      <p className="mt-5 text-[13px] text-muted">
        Timezone and push notification settings live on the{" "}
        <Link href="/settings" className="text-accent hover:underline">
          Settings
        </Link>{" "}
        page.
      </p>

      <div className="mt-6">
        <AccountActions />
      </div>
    </AppShell>
  );
}
