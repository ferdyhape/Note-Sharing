import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { AppShell } from "@/shared/components/AppShell";

export default async function SharedNotesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const shares = await prisma.noteShare.findMany({
    where: {
      userId: session.user.id,
      note: { is: { deletedAt: null, status: "ACTIVE" } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      role: true,
      createdAt: true,
      note: {
        select: {
          id: true,
          title: true,
          contentText: true,
          updatedAt: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
  });

  return (
    <AppShell active="shared">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-[19px] font-semibold">Shared with me</h1>
        <span className="text-[12px] text-muted">{shares.length} Notes</span>
      </div>
      {shares.length === 0 ? (
        <p className="text-[13px] text-muted">No Notes have been shared with you.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shares.map((share) => (
            <li key={share.id} className="rounded-card border border-border bg-surface px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={`/notes/${share.note.id}`}
                  className="min-w-0 text-[14px] font-medium hover:underline"
                >
                  {share.note.title}
                </Link>
                <span className="text-[12px] text-muted">{share.role.toLowerCase()}</span>
              </div>
              {share.note.contentText && (
                <p className="mt-2 line-clamp-3 text-[13px] text-muted">{share.note.contentText}</p>
              )}
              <p className="mt-2 text-[12px] text-muted">
                Shared by {share.note.owner.name ?? share.note.owner.email}
                {" · "}
                Updated{" "}
                {share.note.updatedAt.toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
