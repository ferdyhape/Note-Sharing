"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { useSession } from "next-auth/react";
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
  MoreIcon,
} from "./icons/NavIcons";

export type ActiveSection =
  "dashboard" | "notes" | "calendar" | "reminders" | "shared" | "archive" | "settings" | "account";

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
// Everything else (Dashboard, Archive, Settings, Account) lives behind the
// single "More" popover below, rather than duplicating a second menu
// trigger in the top bar — one navigation surface on mobile, not two.
const BOTTOM_NAV_ITEMS: ActiveSection[] = ["notes", "calendar", "reminders", "shared"];
const MORE_NAV_ITEMS: ActiveSection[] = ["dashboard", "archive"];

const railLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:flex-none";
const railLinkExpandedClass = "w-full justify-start gap-2.5 px-2.5 text-[13px] font-medium";
const railLinkActiveClass = "bg-raised text-accent";

const SIDEBAR_STORAGE_KEY = "notula-sidebar-expanded";

// Same useSyncExternalStore-over-localStorage pattern as ThemeToggle.tsx:
// localStorage is external state, so it's read via a subscription rather
// than useState+useEffect (which React flags — set-state-in-effect).
const sidebarListeners = new Set<() => void>();

function getSidebarSnapshot() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getSidebarServerSnapshot() {
  return false;
}

function subscribeSidebar(callback: () => void) {
  sidebarListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    sidebarListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function setSidebarExpanded(next: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Storage blocked — the toggle still works for this page load, it just
    // won't persist or sync to other tabs.
  }
  sidebarListeners.forEach((callback) => callback());
}

export function AppShell({
  active = "notes",
  shareHref,
  children,
}: {
  active?: ActiveSection;
  shareHref?: string;
  children: ReactNode;
}) {
  const { data: session } = useSession();
  const expanded = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  function toggleExpanded() {
    setSidebarExpanded(!expanded);
  }

  const accountLabel = session?.user?.name ?? session?.user?.email ?? null;
  const accountInitial = accountLabel ? accountLabel.charAt(0).toUpperCase() : "?";

  return (
    <div className="flex min-h-dvh flex-col min-[900px]:flex-row">
      {/* Mobile top bar — navigation itself lives only in the bottom nav
          (primary 4 + "More"); no second menu trigger up here. */}
      <header className="flex h-[52px] items-center gap-2.5 border-b border-rule px-4 min-[900px]:hidden">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-xs font-bold text-white">
            N
          </span>
          Notula
        </span>
        <span className="flex-1" />
        <ThemeToggle className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text" />
        {shareHref && (
          <Link
            href={shareHref}
            aria-label="Share note"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text"
          >
            <ShareIcon className="h-[17px] w-[17px]" />
          </Link>
        )}
      </header>

      {/* Desktop icon rail — toggles into a labeled sidebar via the expand
          button, since icon-only was reported unclear. */}
      <nav
        aria-label="Primary"
        className={`sticky top-0 hidden h-dvh flex-none flex-col gap-1 border-r border-rule py-4 min-[900px]:flex ${
          expanded ? "w-[200px] items-stretch px-2.5" : "w-[var(--rail-width)] items-center"
        }`}
      >
        <div
          className={`mb-[18px] flex items-center gap-2.5 ${expanded ? "px-2.5" : "flex-col gap-2"}`}
        >
          <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            N
          </span>
          {expanded && <span className="text-[15px] font-semibold">Notula</span>}
          <button
            type="button"
            onClick={toggleExpanded}
            aria-pressed={expanded}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text ${expanded ? "ml-auto" : ""}`}
          >
            <MenuIcon className="h-[15px] w-[15px]" />
          </button>
        </div>
        {NAV_ITEMS.slice(0, 4).map(({ section, label, href, Icon }) => (
          <Link
            key={section}
            href={href}
            title={label}
            aria-label={label}
            aria-current={active === section ? "page" : undefined}
            className={`${railLinkClass} ${expanded ? railLinkExpandedClass : ""} ${active === section ? railLinkActiveClass : ""}`}
          >
            <Icon />
            {expanded && label}
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
            className={`${railLinkClass} ${expanded ? railLinkExpandedClass : ""} ${active === section ? railLinkActiveClass : ""}`}
          >
            <Icon />
            {expanded && label}
          </Link>
        ))}
        <div
          className={`mt-auto flex flex-col gap-1 ${expanded ? "items-stretch" : "items-center"}`}
        >
          <ThemeToggle
            className={`${railLinkClass} ${expanded ? railLinkExpandedClass : ""}`}
            showLabel={expanded}
          />
          <Link
            href="/settings"
            title="Settings"
            aria-label="Settings"
            aria-current={active === "settings" ? "page" : undefined}
            className={`${railLinkClass} ${expanded ? railLinkExpandedClass : ""} ${active === "settings" ? railLinkActiveClass : ""}`}
          >
            <SettingsIcon />
            {expanded && "Settings"}
          </Link>
          <Link
            href="/account"
            title="Account"
            aria-current={active === "account" ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg text-[13px] font-medium hover:bg-raised ${
              active === "account" ? "text-accent" : "text-text"
            } ${expanded ? "px-2.5 py-1.5" : "h-9 w-9 justify-center"}`}
          >
            <span
              className={`flex h-[27px] w-[27px] flex-none items-center justify-center rounded-full text-[11px] font-semibold ${
                active === "account" ? "bg-accent text-white" : "bg-raised"
              }`}
            >
              {accountInitial}
            </span>
            {expanded && (accountLabel ?? "Account")}
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
        <details className="relative">
          <summary
            aria-label="More"
            className={`flex cursor-pointer list-none flex-col items-center gap-[3px] rounded-lg px-2.5 py-1 text-[11px] [&::-webkit-details-marker]:hidden [&_svg]:h-[19px] [&_svg]:w-[19px] ${
              active === "dashboard" ||
              active === "archive" ||
              active === "settings" ||
              active === "account"
                ? "text-accent"
                : "text-muted"
            }`}
          >
            <MoreIcon />
            More
          </summary>
          <nav
            aria-label="More"
            className="absolute bottom-full right-0 z-30 mb-2 flex w-52 flex-col gap-1 rounded-card border border-border bg-surface p-2 shadow-lg"
          >
            {MORE_NAV_ITEMS.map((section) => {
              const item = NAV_ITEMS.find((n) => n.section === section)!;
              const Icon = item.Icon;
              return (
                <Link
                  key={section}
                  href={item.href}
                  aria-current={active === section ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-[13px] ${active === section ? "bg-raised text-accent" : "text-text hover:bg-raised"}`}
                >
                  <Icon />
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/settings"
              aria-current={active === "settings" ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-[13px] ${active === "settings" ? "bg-raised text-accent" : "text-text hover:bg-raised"}`}
            >
              <SettingsIcon />
              Settings
            </Link>
            <Link
              href="/account"
              aria-current={active === "account" ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-[13px] ${active === "account" ? "bg-raised text-accent" : "text-text hover:bg-raised"}`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised text-[11px] font-semibold">
                {accountInitial}
              </span>
              {accountLabel ?? "Account"}
            </Link>
          </nav>
        </details>
      </nav>
    </div>
  );
}
