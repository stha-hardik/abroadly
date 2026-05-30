import Link from "next/link";
import { GoogleSignInButton } from "../google-sign-in-button";
import { NavBar } from "../nav-bar";
import { SiteFooter } from "../site-footer";

const trustItems = [
  {
    title: "Verified identity",
    body:
      "Your profile starts from a Google account, so every chat is tied to a real, verified email — no fake accounts, no spam.",
  },
  {
    title: "One profile setup",
    body:
      "You add your academic details once after sign-in. Every future answer reuses that context — no repeating yourself.",
  },
  {
    title: "Private by design",
    body:
      "The Google secret stays on the server and is never sent to the browser. We store only the profile fields you choose to share.",
  },
];

const nextChips = [
  "Education + GPA",
  "Target countries",
  "Field & goals",
  "Saved once",
];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[var(--ab-paper)] text-[var(--ab-ink)]">
      {/* Same nav shape as the landing — but no Sign-in link here (this IS the
          sign-in page), and the right CTA points at the chat for returning users. */}
      <NavBar showSignIn={false} primary={{ href: "/chat", label: "Open chat" }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="ab-dot-grid relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-5 pb-20 pt-20 text-center sm:px-8 sm:pt-28 sm:pb-28">
          <div className="ab-fade-up ab-d1 inline-flex items-center gap-2 rounded-full border border-[var(--ab-line)] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[var(--ab-ink-soft)] shadow-[var(--shadow-xs)]">
            <span className="h-2 w-2 rounded-full bg-[var(--ab-brand)]" />
            Free · sign-in takes 30 seconds
          </div>

          <h1 className="ab-fade-up ab-d2 ab-display-2 mx-auto mt-7 max-w-2xl">
            Sign in with Google to begin.
          </h1>

          <p className="ab-fade-up ab-d3 ab-subhead mx-auto mt-5 max-w-xl">
            We tie your profile to a verified email, then ask for a few academic
            details once — so every answer is tailored to your real situation.
          </p>

          {/* Sign-in card — single, focused action */}
          <div className="ab-fade-up ab-d4 relative mx-auto mt-10 max-w-md sm:mt-12">
            <div className="ab-hero-glow pointer-events-none absolute -inset-x-10 -top-12 bottom-0 -z-10" />
            <div className="rounded-2xl border border-[var(--ab-line)] bg-white p-6 shadow-[var(--shadow-lg)] sm:p-7">
              <GoogleSignInButton
                variant="outline"
                label="Continue with Google"
                caption="No password — your email confirms identity"
                className="w-full justify-start"
              />

              <p className="mt-4 text-left text-[12.5px] leading-6 text-[var(--ab-muted)]">
                Abroadly never sees your Google password. We store only the academic
                profile you choose to share.
              </p>

              <div className="mt-5 border-t border-[var(--ab-line-soft)] pt-4 text-left">
                <p className="ab-eyebrow">Up next</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[12px] font-semibold text-[var(--ab-ink)]">
                  {nextChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-lg border border-[var(--ab-line-soft)] bg-[var(--ab-paper)] px-3 py-2"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-5 text-[12.5px] text-[var(--ab-muted-soft)]">
              Already onboarded?{" "}
              <Link
                href="/chat"
                className="ab-focus rounded font-semibold text-[var(--ab-ink)] underline-offset-2 hover:underline"
              >
                Open chat &rarr;
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── What happens next ────────────────────────────────────────── */}
      <section className="ab-section border-t border-[var(--ab-line)] bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="ab-eyebrow">What happens next</p>
            <h2 className="ab-display-2 mt-3">
              Three short moments before your first answer.
            </h2>
            <p className="ab-subhead mt-4 max-w-xl">
              Setup is quick, deliberate, and shaped around how a student
              actually thinks — not a brochure form.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {trustItems.map((item, i) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--ab-line)] bg-[var(--ab-paper)] p-7 transition hover:-translate-y-0.5 hover:border-[#D8D3C8] hover:shadow-[var(--shadow-md)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F2EC] text-[15px] font-extrabold tracking-[-0.01em] text-[var(--ab-brand)]">
                  0{i + 1}
                </span>
                <h3 className="ab-h3 mt-5">{item.title}</h3>
                <p className="ab-body mt-2.5 text-[14px] leading-7">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
