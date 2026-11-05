"use client";

import { useSyncExternalStore } from "react";
import { SunIcon, MoonIcon } from "./icons/ActionIcons";

/**
 * Sun/moon theme toggle. The actual theme resolution (stored preference vs
 * `prefers-color-scheme`) happens once, before paint, in the inline script in
 * `layout.tsx` — this component treats `<html data-theme>` as external state
 * (via useSyncExternalStore + a MutationObserver) rather than re-deriving it,
 * so the resolution logic lives in exactly one place.
 */
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

// Matches the inline script's own default when it can't yet tell (SSR has no
// `window`/`localStorage`) — light, until the client snapshot takes over.
function getServerSnapshot() {
  return false;
}

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    try {
      localStorage.setItem("notula-theme", next ? "dark" : "light");
    } catch {
      // Storage blocked (private window, disabled site data, etc.) — the
      // toggle still works for this page load, it just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={className}
    >
      {isDark ? (
        <MoonIcon className="h-[17px] w-[17px] flex-none" />
      ) : (
        <SunIcon className="h-[17px] w-[17px] flex-none" />
      )}
      {showLabel && (isDark ? "Light mode" : "Dark mode")}
    </button>
  );
}
