import type { SVGProps } from "react";

// Nav-rail / bottom-nav glyphs, ported 1:1 from design/note-detail/final-notula.html.
// Grouped in one file rather than one-per-file since each is a single <path>
// with no logic of its own — still separately importable components.

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
};

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function NotesIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M3 2.5h8l2 2v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5 7h6M5 9.5h6M5 12h4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RemindersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5.5V8.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SharedIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.6 5.2 9.4 10.8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function ArchiveIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="1.5" y="3" width="13" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M2.5 6v6.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V6"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

/** Settings glyph — deliberately sliders, not a gear-as-sun lookalike (see ADR-free note in design review). */
export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M2 4.5h7M11.5 4.5H14M2 8h3M6.5 8H14M2 11.5h9.5M14 11.5h0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle
        cx="9"
        cy="4.5"
        r="1.4"
        fill="var(--surface)"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle
        cx="4.5"
        cy="8"
        r="1.4"
        fill="var(--surface)"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle
        cx="11.5"
        cy="11.5"
        r="1.4"
        fill="var(--surface)"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}
