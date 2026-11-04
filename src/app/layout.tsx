import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// The approved shell design (design/note-detail/final-notula.html) uses
// Public Sans + IBM Plex Mono — the scaffold's original Geist loaders were
// removed since nothing renders with them.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Notula",
  description: "A personal note-taking workspace with schedules, reminders and sharing.",
};

// Resolves the theme before paint, mirroring design/note-detail/final-notula.html's
// own inline script — ThemeToggle only has to read what this already set, not
// re-derive it, and there's no flash of the wrong theme.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("notula-theme");
    var dark = stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
      // The inline script below sets data-theme on this element before React
      // hydrates (that's the point — no flash of the wrong theme), so the
      // attribute legitimately differs from what was server-rendered.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
