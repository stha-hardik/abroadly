import Link from "next/link";
import { googleLoginUrl } from "@/lib/api";

/**
 * Shared public NavBar — used by /, /onboarding, /privacy, /terms.
 * Internal surfaces (/chat, /admin/*) have their own internal designs and
 * deliberately do NOT use this component.
 *
 * Variants are driven by props rather than by which page renders it:
 *   - `sectionLinks` — optional in-page anchor links shown center
 *   - `showSignIn`   — show the right-side "Sign in" link (Google)
 *   - `primary`      — the solid CTA on the right (defaults to "Get started free")
 */
interface NavBarProps {
  sectionLinks?: Array<[string, string]>;
  showSignIn?: boolean;
  primary?: { href: string; label: string };
}

export function NavBar({
  sectionLinks,
  showSignIn = true,
  primary = { href: "/onboarding", label: "Get started free" },
}: NavBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--ab-line)]/70 bg-[var(--ab-paper)]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link href="/" className="ab-focus flex items-center gap-2.5 rounded-lg">
          <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-8 w-8 rounded-lg" />
          <span className="text-[17px] font-extrabold tracking-[-0.02em] text-[var(--ab-ink)]">Abroadly</span>
        </Link>

        {sectionLinks && sectionLinks.length > 0 && (
          <div className="hidden items-center gap-1 md:flex">
            {sectionLinks.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="ab-focus rounded-lg px-3 py-2 text-[14px] font-semibold text-[var(--ab-ink-soft)] transition hover:bg-[#F0EDE4] hover:text-[var(--ab-ink)]"
              >
                {label}
              </a>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5">
          {showSignIn && (
            <a
              href={googleLoginUrl()}
              className="ab-focus hidden rounded-lg px-3 py-2 text-[14px] font-semibold text-[var(--ab-ink-soft)] transition hover:bg-[#F0EDE4] hover:text-[var(--ab-ink)] sm:inline-flex"
            >
              Sign in
            </a>
          )}
          <Link href={primary.href} className="ab-focus ab-btn ab-btn-primary h-9 px-4 text-[13.5px]">
            {primary.label}
          </Link>
        </div>
      </nav>
    </header>
  );
}
