"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { ShareIcon, MenuIcon } from "./icons/ActionIcons";
import {
  DashboardIcon,
  NotesIcon,
  CalendarIcon,
  RemindersIcon,
  SharedIcon,
  ArchiveIcon,
  SettingsIcon,
} from "./icons/NavIcons";

export type ActiveSection = "dashboard" | "notes" | "calendar" | "reminders" | "shared" | "archive";

const NAV_ITEMS: Array<{
  section: ActiveSection;
  label: string;
  href: string;
  Icon: typeof DashboardIcon;
}> = [
  { section: "dashboard", label: "Dashboard", href: "/dashboard", Icon: DashboardIcon },
  { section: "notes", label: "All Notes", href: "/notes", Icon: NotesIcon },
  { section: "calendar", label: "Calendar", href: "/calendar", Icon: CalendarIcon },
  { section: "reminders", label: "Reminders", href: "/reminders", Icon: RemindersIcon },
  { section: "shared", label: "Shared with me", href: "/shared", Icon: SharedIcon },
  { section: "archive", label: "Archive", href: "/archive", Icon: ArchiveIcon },
];

// The bottom nav (phone) shows fewer destinations than the rail (desktop) —
// matches the icon-rail shell's own phone rule (design/note-detail/final-notula.html).
const BOTTOM_NAV_ITEMS: ActiveSection[] = ["notes", "calendar", "reminders", "shared"];

const railLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text [&_svg]:h-[17px] [&_svg]:w-[17px]";
const railLinkActiveClass = "bg-raised text-accent";

export function AppShell({
  active = "notes",
  children,
}: {
  active?: ActiveSection;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col min-[900px]:flex-row">
      {/* Mobile top bar */}
      <header className="flex h-[52px] items-center gap-2.5 border-b border-rule px-4 min-[900px]:hidden">
        <button
          type="button"
          // TODO: open a nav sheet with the same links as the rail — not built yet.
          aria-label="Open menu"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-text hover:bg-raised"
        >
          <MenuIcon className="h-[18px] w-[18px]" />
        </button>
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-xs font-bold text-white">
            N
          </span>
          Notula
        </span>
        <span className="flex-1" />
        <ThemeToggle className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text" />
        <button
          type="button"
          aria-label="Share note"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text"
        >
          <ShareIcon className="h-[17px] w-[17px]" />
        </button>
      </header>

      {/* Desktop icon rail */}
      <nav
        aria-label="Primary"
        className="sticky top-0 hidden h-dvh w-[var(--rail-width)] flex-none flex-col items-center gap-1 border-r border-rule py-4 min-[900px]:flex"
      >
        <span className="mb-[18px] flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          N
        </span>
        {NAV_ITEMS.slice(0, 4).map(({ section, label, href, Icon }) => (
          <Link
            key={section}
            href={href}
            title={label}
            aria-label={label}
            aria-current={active === section ? "page" : undefined}
            className={`${railLinkClass} ${active === section ? railLinkActiveClass : ""}`}
          >
            <Icon />
          </Link>
        ))}
        <div className="h-[18px]" />
        {NAV_ITEMS.slice(4).map(({ section, label, href, Icon }) => (
          <Link
            key={section}
            href={href}
            title={label}
            aria-label={label}
            aria-current={active === section ? "page" : undefined}
            className={`${railLinkClass} ${active === section ? railLinkActiveClass : ""}`}
          >
            <Icon />
          </Link>
        ))}
        <div className="mt-auto flex flex-col items-center gap-1">
          <ThemeToggle className={railLinkClass} />
          <Link href="/settings" title="Settings" aria-label="Settings" className={railLinkClass}>
            <SettingsIcon />
          </Link>
          <Link
            href="/account"
            title="Account"
            className="flex h-[27px] w-[27px] items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-text"
          >
            F
          </Link>
        </div>
      </nav>

      <main className="flex-1 px-4 pb-[84px] pt-4 min-[900px]:max-w-[1320px] min-[900px]:px-10 min-[900px]:py-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 flex justify-around border-t border-rule bg-surface px-1 pb-[calc(0.375rem+env(safe-area-inset-bottom))] pt-1.5 min-[900px]:hidden"
      >
        {BOTTOM_NAV_ITEMS.map((section) => {
          const item = NAV_ITEMS.find((n) => n.section === section)!;
          const Icon = item.Icon;
          return (
            <Link
              key={section}
              href={item.href}
              className={`flex flex-col items-center gap-[3px] rounded-lg px-2.5 py-1 text-[11px] no-underline [&_svg]:h-[19px] [&_svg]:w-[19px] ${
                active === section ? "text-accent" : "text-muted"
              }`}
            >
              <Icon />
              {item.label === "All Notes"
                ? "Notes"
                : item.label === "Shared with me"
                  ? "Shared"
                  : item.label}
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={`flex flex-col items-center gap-[3px] rounded-lg px-2.5 py-1 text-[11px] no-underline [&_svg]:h-[19px] [&_svg]:w-[19px] ${
            active === "dashboard" ? "text-accent" : "text-muted"
          }`}
        >
          <SettingsIcon />
          More
        </Link>
      </nav>
    </div>
  );
}
