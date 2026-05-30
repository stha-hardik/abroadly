import Link from "next/link";
import { GoogleSignInButton } from "./google-sign-in-button";
import { NavBar } from "./nav-bar";
import { SiteFooter } from "./site-footer";

const assurances = ["Free for students", "No agency pressure", "Built for Nepali questions"];

const steps = [
  {
    no: "01",
    title: "Tell it your situation",
    body: "Your education level, GPA, expected GPA, field, budget worries, and the countries you are weighing.",
  },
  {
    no: "02",
    title: "Ask the messy questions",
    body: "Eligibility, documents, visa steps, scholarships, SOPs, costs, timelines — or simply what to do first.",
  },
  {
    no: "03",
    title: "Leave with a next step",
    body: "A clear answer, the gaps you still need to check, and the official link or document prompt that matters.",
  },
];

const studentProblems = [
  {
    icon: "\u{1F3AF}",
    title: "Am I eligible?",
    body: "See whether your grades, level, and goals look realistic before you spend money applying.",
  },
  {
    icon: "\u{1F4CB}",
    title: "Which documents?",
    body: "A checklist for transcripts, passport, SOP, recommendation letters, finances, and English tests.",
  },
  {
    icon: "\u{1F4B0}",
    title: "How much will it cost?",
    body: "Tuition, living costs, deposits, proof of funds, scholarships, and safer budget planning.",
  },
  {
    icon: "\u{1F9ED}",
    title: "What do I do next?",
    body: "Turn confusion into a short action plan you can talk through with family or universities.",
  },
];

const topics = [
  "UK student route",
  "Australia study visa",
  "Canada planning",
  "Scholarship search",
  "SOP review ideas",
  "Document checklist",
  "Course selection",
  "Budget questions",
  "Nepali student doubts",
];

/* ── Inline building blocks ───────────────────────────────────────────
 * Small, self-contained helpers so /onboarding can reuse the same shapes
 * (when we lift them out next PR). No new files in this PR.
 */

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`ab-eyebrow ${className}`}>{children}</span>;
}

function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`ab-focus ab-btn ab-btn-primary ${className}`}>
      {children}
    </Link>
  );
}

function GhostButton({
  href,
  children,
  external = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  className?: string;
}) {
  const cls = `ab-focus ab-btn ab-btn-ghost ${className}`;
  if (external) return <a href={href} className={cls}>{children}</a>;
  return <Link href={href} className={cls}>{children}</Link>;
}

function ChatPreview() {
  return (
    <div className="ab-fade-up ab-d5 relative mx-auto mt-14 max-w-3xl sm:mt-16">
      <div className="ab-hero-glow pointer-events-none absolute -inset-x-10 -top-16 bottom-0 -z-10" />
      <div className="overflow-hidden rounded-2xl border border-[var(--ab-line)] bg-white shadow-[var(--shadow-lg)]">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-[var(--ab-line-soft)] bg-[var(--ab-paper)] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[var(--ab-line)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--ab-line)]" />
          <span className="h-3 w-3 rounded-full bg-[var(--ab-line)]" />
          <span className="ml-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--ab-muted-soft)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ab-brand-soft)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ab-brand)]" />
            </span>
            abroadly.online / chat
          </span>
        </div>

        {/* conversation */}
        <div className="space-y-4 px-5 py-6 sm:px-7">
          <div className="flex justify-end">
            <div className="max-w-[78%] rounded-2xl rounded-br-md bg-[var(--ab-navy)] px-4 py-2.5 text-[14px] font-medium leading-relaxed text-white">
              I just finished +2 in Nepal with a 3.2 GPA. Can I study computer science in the UK?
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <img src="/images/abroadly-logo.png" alt="" className="mt-0.5 h-7 w-7 shrink-0 rounded-lg" />
            <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-[var(--ab-line-soft)] bg-[var(--ab-paper)] px-4 py-3 text-[14px] leading-relaxed text-[var(--ab-ink)]">
              Yes — a <strong className="font-semibold">3.2 GPA after +2</strong> puts most UK undergraduate
              CS courses in reach, often via direct entry or a foundation year. You will typically need{" "}
              <strong className="font-semibold">IELTS 6.0–6.5</strong>.
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-lg border border-[var(--ab-line)] bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--ab-ink-soft)]">
                  Upload your transcript &rarr; I&apos;ll check eligibility
                </span>
                <span className="rounded-lg border border-[var(--ab-line)] bg-white px-2.5 py-1 text-[12px] font-semibold text-[var(--ab-ink-soft)]">
                  Which universities fit my grades?
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--ab-paper)] text-[var(--ab-ink)]">
      <NavBar
        sectionLinks={[
          ["How it works", "#how-it-works"],
          ["What it helps with", "#student-problems"],
          ["Topics", "#topics"],
        ]}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="ab-dot-grid relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-5 pb-4 pt-20 text-center sm:px-8 sm:pt-28">
          <div className="ab-fade-up ab-d1 inline-flex items-center gap-2 rounded-full border border-[var(--ab-line)] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[var(--ab-ink-soft)] shadow-[var(--shadow-xs)]">
            <span className="h-2 w-2 rounded-full bg-[var(--ab-brand)]" />
            Free · built for students in Nepal
          </div>

          <h1 className="ab-fade-up ab-d2 ab-display-1 mx-auto mt-7 max-w-3xl">
            Study abroad without
            <br className="hidden sm:block" /> the guesswork.
          </h1>

          <p className="ab-fade-up ab-d3 ab-subhead mx-auto mt-6 max-w-xl">
            Calm, honest answers on eligibility, documents, scholarships, visas, and costs —
            grounded in official sources, never an agency&apos;s sales pitch.
          </p>

          <div className="ab-fade-up ab-d4 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GoogleSignInButton label="Start free with Google" caption="Save your study profile once" />
            <GhostButton href="#how-it-works">See how it works</GhostButton>
          </div>

          <div className="ab-fade-up ab-d4 mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] font-semibold text-[var(--ab-muted-soft)]">
            {assurances.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-[var(--ab-brand)]" fill="none">
                  <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 pb-24 sm:px-8 sm:pb-28">
          <ChatPreview />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="ab-section border-t border-[var(--ab-line)] bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="ab-display-2 mt-3">
              From a confused question to a clear next step.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.no}
                className="rounded-2xl border border-[var(--ab-line)] bg-[var(--ab-paper)] p-7 transition hover:-translate-y-0.5 hover:border-[#D8D3C8] hover:shadow-[var(--shadow-md)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F2EC] text-[15px] font-extrabold tracking-[-0.01em] text-[var(--ab-brand)]">
                  {step.no}
                </span>
                <h3 className="ab-h3 mt-5">{step.title}</h3>
                <p className="ab-body mt-2.5 text-[14px] leading-7">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── What it helps with ───────────────────────────────────────── */}
      <section id="student-problems" className="ab-section border-t border-[var(--ab-line)] bg-[var(--ab-paper)]">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>What it helps with</Eyebrow>
            <h2 className="ab-display-2 mt-3">
              The questions students actually ask.
            </h2>
            <p className="ab-subhead mt-4 max-w-xl">
              Use it before you pay an application fee, choose a country, write an SOP, or tell your
              family a plan you are not sure about yet.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {studentProblems.map((item) => (
              <article
                key={item.title}
                className="group rounded-2xl border border-[var(--ab-line)] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#D8D3C8] hover:shadow-[var(--shadow-md)]"
              >
                <span className="text-2xl">{item.icon}</span>
                <h3 className="ab-h3 mt-4 text-[16px]">{item.title}</h3>
                <p className="ab-body mt-2 text-[14px] leading-7">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Topics ───────────────────────────────────────────────────── */}
      <section id="topics" className="ab-section border-t border-[var(--ab-line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <Eyebrow>Ask in plain language</Eyebrow>
            <h2 className="ab-display-2 mt-3">
              You can start with a half-formed plan.
            </h2>
            <p className="ab-subhead mt-4 max-w-md">
              Abroadly is made for the first draft of your thinking — family pressure, country
              comparisons, and &ldquo;what does this requirement even mean?&rdquo;
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {topics.map((topic) => (
              <span
                key={topic}
                className="rounded-full border border-[var(--ab-line)] bg-[var(--ab-paper)] px-4 py-2.5 text-[14px] font-semibold text-[var(--ab-ink-soft)] transition hover:border-[var(--ab-brand)] hover:text-[var(--ab-brand)]"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="ab-section border-t border-[var(--ab-line)] bg-[var(--ab-navy)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-7 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="ab-display-2 text-white">
              Build your study profile once, then ask better questions every time.
            </h2>
            <p className="ab-body mt-4" style={{ color: "rgba(255,255,255,0.72)" }}>
              Free, honest, and ready whenever you are. No agency, no pressure.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="ab-focus inline-flex h-12 shrink-0 items-center justify-center rounded-[10px] bg-white px-7 text-[14px] font-bold text-[var(--ab-navy)] shadow-[var(--shadow-md)] transition hover:-translate-y-0.5 hover:bg-[var(--ab-brand-soft)]"
          >
            Get started free
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
