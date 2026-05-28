import Link from "next/link";

/**
 * SiteFooter — single thin row, muted grey, included on public pages
 * (landing, onboarding, legal). NOT included on `/chat` or `/admin/*`
 * which run full-screen.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[#e4e8f0] bg-[#f6f8fb] text-[#7a8495]">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-2 px-5 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {year} Abroadly · Free study-abroad guidance for Nepali students.</p>
        <nav className="flex items-center gap-4">
          <Link href="/privacy" className="ab-focus rounded-md transition hover:text-[#172033]">
            Privacy
          </Link>
          <Link href="/terms" className="ab-focus rounded-md transition hover:text-[#172033]">
            Terms
          </Link>
          <Link href="/" className="ab-focus rounded-md transition hover:text-[#172033]">
            Home
          </Link>
        </nav>
      </div>
    </footer>
  );
}
