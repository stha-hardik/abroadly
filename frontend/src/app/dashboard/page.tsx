"use client";

/**
 * Abroadly student dashboard — focused, country-specific coaching surface.
 *
 * Hierarchy (single column, top → bottom):
 *   1. Header strip + country switcher
 *   2. Hero band — "Today's focus" (one directive, two CTAs)
 *   3. Country fact strip (5 chips: visa class, fee, earliest apply, maintenance, post-study work)
 *   4. Timeline — country-specific events (intake, deadline, visa, test, prep)
 *   5. Recommended universities (country-filtered, GPA-matched, Reach/Match/Safety)
 *   6. Documents (compact 8-row checklist, no expanders)
 *   7. Scholarships (country-specific, 4 cards)
 *   8. Cost snapshot
 *   9. Recent chat (ghost band at the bottom)
 *
 * The page is intentionally a single column on every breakpoint — sequence,
 * not grid, communicates priority. The hero is the only module on a tinted
 * band that bleeds to the viewport edge, so it visually dominates.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStudent,
  getStudentDocuments,
  getChatHistory,
  type StudentOut,
  type StudentDocument,
  type ChatTurn,
} from "@/lib/api";
import {
  classifyFit,
  currencySymbol,
  gpaToPercentage,
  inferField,
  pickUniversities,
  type AdmissionFit,
  type University,
} from "@/lib/university-data";
import {
  COUNTRY_PROFILES,
  nextIntakeFor,
  resolveTargetCountries,
  type CountryCode,
  type CountryProfile,
  type TimelineEvent,
} from "@/lib/country-data";

/* ── Static structures ────────────────────────────────────────────────── */

interface DocSlot {
  id: string;
  label: string;
  hint: string;
}

const DOC_SLOTS: DocSlot[] = [
  { id: "grade_sheet", label: "Transcript / grade sheet", hint: "+2 or bachelor's marksheet" },
  { id: "passport", label: "Passport", hint: "Valid for course + 6 months" },
  { id: "ielts", label: "English test", hint: "IELTS / PTE / TOEFL score" },
  { id: "sop", label: "Statement of purpose", hint: "500–1,000 words per university" },
  { id: "recommendation", label: "Recommendation letters", hint: "2 letters from recent teachers" },
  { id: "financial", label: "Financial documents", hint: "Bank statement, sponsor, loan letter" },
  { id: "other", label: "Other documents", hint: "Character cert, portfolio, CV" },
];

/* ── Heuristics ───────────────────────────────────────────────────────── */

interface HeroFocus {
  /** The directive — short imperative sentence. */
  title: string;
  /** Two-line context explaining why. */
  context: string;
  /** 2-3 sub-steps the student can mentally check off this week. */
  subSteps: string[];
  /** Primary CTA — opens chat with a deep-linked question */
  primary: { label: string; query: string };
  /** Secondary CTA — usually navigates to docs or onboarding */
  secondary: { label: string; href: string };
}

/** Pick the single most important thing for the student to do this week,
 *  based on what's already done + the country context. */
function pickHeroFocus(
  student: StudentOut,
  docs: StudentDocument[],
  country: CountryProfile,
): HeroFocus {
  const docTypes = new Set(docs.map((d) => d.doc_type));
  const intake = nextIntakeFor(country.code);
  const monthsOut = intake.monthsOut;

  if (!student.profile_completed) {
    return {
      title: "Finish your study profile.",
      context: `Two minutes of detail (GPA, exact intake, field) sharpens every recommendation on this page — universities, scholarships, even the timeline.`,
      subSteps: ["Add your NEB / +2 percentage", "Confirm your target country", "Pick a field of study"],
      primary: { label: "Edit profile", query: "" },
      secondary: { label: "Open chat", href: "/chat" },
    };
  }

  if (!docTypes.has("ielts")) {
    return {
      title: "Book your IELTS test this week.",
      context: `For ${country.name}, IELTS slots at British Council Kathmandu fill 4-6 weeks ahead. With ${monthsOut} months to ${intake.label}, booking now keeps your application on schedule.`,
      subSteps: [
        "Pick a test date 6+ weeks out",
        "Pay the test fee (~NPR 30,000)",
        country.code === "UK" ? "Book IELTS for UKVI specifically" : "Standard IELTS Academic is fine",
      ],
      primary: {
        label: "How do I book IELTS?",
        query: `Walk me through booking IELTS in Kathmandu for ${country.name} — which test, where, and how to prepare in 6 weeks.`,
      },
      secondary: { label: "Upload score later", href: "/chat?docs=open" },
    };
  }

  if (!docTypes.has("grade_sheet")) {
    return {
      title: "Get your transcript attested.",
      context: `For ${country.name} you'll need your NEB transcript + MoEST + MoFA attestation. Allow ~2 weeks. Universities ask for this with the application.`,
      subSteps: [
        "Collect original from school registrar",
        "Attest at MoEST (Singha Durbar, 1-2 days)",
        "Attest at MoFA (Tripureshwor, 1 day)",
      ],
      primary: {
        label: "Walk me through attestation",
        query: `Step-by-step: how do I get my NEB transcript attested for a ${country.name} application?`,
      },
      secondary: { label: "Upload when ready", href: "/chat?docs=open" },
    };
  }

  if (!docTypes.has("sop")) {
    return {
      title: "Draft your statement of purpose.",
      context: `Strong SOPs take 2-3 weeks of writing + revisions. With ${monthsOut} months to ${intake.label}, start your first draft now so you have room to improve it.`,
      subSteps: [
        "Outline: why this course, why this uni, why now",
        "Write a 400-word zero draft (no editing)",
        "Share it in chat — I'll review for tone + clarity",
      ],
      primary: {
        label: "Help me outline my SOP",
        query: `Help me outline a strong SOP for ${student.preferred_field ?? "my field"} in ${country.name}.`,
      },
      secondary: { label: "Upload draft", href: "/chat?docs=open" },
    };
  }

  if (!docTypes.has("financial")) {
    return {
      title: `Plan financial proof for ${country.name}.`,
      context: `${country.name} requires you to show ${country.factStrip[3].value} (${country.factStrip[3].detail ?? ""}). Banks take 1-3 weeks for usable statements.`,
      subSteps: [
        "Decide: own funds, sponsor, or education loan",
        "Open a stable bank account if needed",
        "Request balance certificate + 6-month statement",
      ],
      primary: {
        label: "How do I prove funds?",
        query: `Help me plan financial proof for a ${country.name} student visa. What documents, what format?`,
      },
      secondary: { label: "Upload statement", href: "/chat?docs=open" },
    };
  }

  return {
    title: "Shortlist universities and start applications.",
    context: `Your documents are coming together. Aim for 5 universities: 2 reach, 2 match, 1 safety. Use the recommended list below as your starting point.`,
    subSteps: [
      "Pick 5 from the Recommended section below",
      "Check each university's exact requirements",
      "Start the strongest application first",
    ],
    primary: {
      label: "Help me pick 5 universities",
      query: `Suggest 5 ${country.name} universities for ${student.preferred_field ?? "my field"} that fit my profile, with a mix of reach / match / safety.`,
    },
    secondary: { label: "Open chat", href: "/chat" },
  };
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/* ── UI primitives ────────────────────────────────────────────────────── */

function FitBadge({ fit }: { fit: AdmissionFit }) {
  const styles: Record<AdmissionFit, { bg: string; fg: string; label: string }> = {
    match: { bg: "bg-[#E8F2EC]", fg: "text-[#0A6E45]", label: "Match" },
    safety: { bg: "bg-[#EEF1FA]", fg: "text-[#1F3D78]", label: "Safe pick" },
    reach: { bg: "bg-[#FBF4E6]", fg: "text-[#9B6200]", label: "Reach" },
    unknown: { bg: "bg-[#F4F2EC]", fg: "text-[#6B655C]", label: "—" },
  };
  const s = styles[fit];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.04em] ${s.bg} ${s.fg}`}>
      {s.label}
    </span>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleSm() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8l2 2 4-4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
      <path d="M9 3h4v4M13 3 7 9M11 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Section header (used by every supporting module) ────────────────── */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0A6E45]">{children}</p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-1.5 text-[22px] font-bold leading-[1.2] tracking-[-0.018em] text-[#1B1916] sm:text-[24px]">
      {children}
    </h2>
  );
}

/* ── Country switcher ─────────────────────────────────────────────────── */

function CountrySwitcher({
  countries,
  active,
  onChange,
}: {
  countries: CountryCode[];
  active: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  if (countries.length <= 1) {
    const profile = COUNTRY_PROFILES[active];
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E5DD] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1B1916] shadow-[var(--shadow-xs)]">
        <span aria-hidden className="text-[14px] leading-none">{profile.flag}</span>
        <span>Plan for {profile.name}</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[#F4F2EC] p-1 shadow-[inset_0_1px_2px_rgba(15,15,15,0.04)]">
      {countries.map((c) => {
        const isActive = c === active;
        const profile = COUNTRY_PROFILES[c];
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={isActive}
            className={`ab-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
              isActive
                ? "bg-white text-[#1B1916] shadow-[var(--shadow-xs)]"
                : "text-[#6B655C] hover:text-[#1B1916]"
            }`}
          >
            <span aria-hidden className="text-[13px] leading-none">{profile.flag}</span>
            <span>{profile.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────── */

function HeroModule({
  student,
  docs,
  country,
  onSendQuery,
}: {
  student: StudentOut;
  docs: StudentDocument[];
  country: CountryProfile;
  onSendQuery: (q: string) => void;
}) {
  const focus = pickHeroFocus(student, docs, country);
  const firstName = student.full_name?.split(" ")[0] ?? "there";
  const intake = nextIntakeFor(country.code);

  return (
    <section className="relative -mx-5 bg-[#F4F2EC] px-5 py-10 sm:-mx-8 sm:px-8 sm:py-14">
      <article
        className="mx-auto max-w-3xl rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-md)] sm:p-10"
        style={{ animation: "dash-fade-in 0.45s ease both" }}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="block h-1.5 w-1.5 rounded-full bg-[#0A6E45]" />
          <span aria-hidden className="block h-px w-10 bg-[#0A6E45]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A6E45]">
            Today &middot; {formatToday()}
          </p>
        </div>

        <h2 className="mt-5 text-[28px] font-bold leading-[1.05] tracking-[-0.025em] text-[#1B1916] sm:text-[34px] lg:text-[40px]">
          {focus.title}
        </h2>

        <p className="mt-4 text-[14.5px] leading-[1.7] text-[#3F3A33] sm:text-[15px]">
          Hey {firstName} — {focus.context}
        </p>

        {focus.subSteps.length > 0 && (
          <ul className="mt-6 flex flex-col gap-2.5">
            {focus.subSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.55] text-[#3F3A33]">
                <span aria-hidden className="mt-[3px] text-[#7DDBB1]"><CheckCircleSm /></span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          {focus.primary.query ? (
            <button
              type="button"
              onClick={() => onSendQuery(focus.primary.query)}
              className="ab-focus inline-flex items-center justify-center gap-1.5 rounded-md bg-[#12244a] px-4 py-2.5 text-[13px] font-bold text-white shadow-[var(--shadow-sm)] transition hover:bg-[#1F3D78]"
            >
              {focus.primary.label} <ArrowRight />
            </button>
          ) : (
            <Link
              href="/onboarding/details"
              className="ab-focus inline-flex items-center justify-center gap-1.5 rounded-md bg-[#12244a] px-4 py-2.5 text-[13px] font-bold text-white shadow-[var(--shadow-sm)] transition hover:bg-[#1F3D78]"
            >
              {focus.primary.label} <ArrowRight />
            </Link>
          )}
          <Link
            href={focus.secondary.href}
            className="ab-focus inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E8E5DD] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
          >
            {focus.secondary.label}
          </Link>
        </div>

        <p className="mt-6 border-t border-[#EFECE4] pt-4 text-[11.5px] leading-[1.55] text-[#8A847B]">
          Targeting <span className="font-semibold text-[#3F3A33]">{country.name}</span> &middot;
          {" "}Next intake: <span className="font-semibold text-[#3F3A33]">{intake.label}</span>
          {" "}(~{intake.monthsOut} months out)
        </p>
      </article>
    </section>
  );
}

/* ── Country fact strip ───────────────────────────────────────────────── */

function FactStrip({ country }: { country: CountryProfile }) {
  return (
    <section className="mx-auto max-w-3xl">
      <SectionEyebrow>At a glance &middot; {country.name}</SectionEyebrow>
      <SectionTitle>What you&apos;re working with</SectionTitle>
      <p className="mt-2 text-[13.5px] leading-[1.65] text-[#6B655C]">{country.pitch}</p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {country.factStrip.map((fact) => (
          <div
            key={fact.label}
            className="rounded-xl border border-[#E8E5DD] bg-white p-3.5 shadow-[var(--shadow-xs)]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#8A847B]">{fact.label}</p>
            <p className="mt-1 text-[15px] font-bold leading-[1.2] tracking-[-0.01em] text-[#1B1916]">
              {fact.value}
            </p>
            {fact.detail && (
              <p className="mt-1 text-[11px] leading-[1.45] text-[#6B655C]">{fact.detail}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Timeline ─────────────────────────────────────────────────────────── */

function TimelineModule({ country }: { country: CountryProfile }) {
  const intake = nextIntakeFor(country.code);
  const intakeYear = intake.date.getFullYear();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Sort events by absolute date
  const sortedEvents = [...country.timeline].sort((a, b) => {
    const aDate = (intakeYear + a.yearOffset) * 12 + a.monthIdx;
    const bDate = (intakeYear + b.yearOffset) * 12 + b.monthIdx;
    return aDate - bDate;
  });

  const kindColor: Record<TimelineEvent["kind"], { dot: string; chip: string; label: string }> = {
    prep: { dot: "bg-[#A8A29A]", chip: "bg-[#F4F2EC] text-[#6B655C]", label: "Prep" },
    test: { dot: "bg-[#F0D89A]", chip: "bg-[#FBF4E6] text-[#9B6200]", label: "Test" },
    deadline: { dot: "bg-[#E11D2A]", chip: "bg-[#FDECEE] text-[#E11D2A]", label: "Deadline" },
    visa: { dot: "bg-[#1F3D78]", chip: "bg-[#EEF1FA] text-[#1F3D78]", label: "Visa" },
    intake: { dot: "bg-[#0A6E45]", chip: "bg-[#E8F2EC] text-[#0A6E45]", label: "Intake" },
  };

  return (
    <section className="mx-auto max-w-3xl">
      <SectionEyebrow>Timeline &middot; {country.name}</SectionEyebrow>
      <SectionTitle>From now to {intake.label}</SectionTitle>
      <p className="mt-2 text-[13.5px] leading-[1.65] text-[#6B655C]">
        Anchored to your most realistic next intake. Country-specific — UK UCAS, Aus CoE, Canada
        PAL/GIC and US I-20 all sit on different rails.
      </p>

      <ol className="mt-6 relative border-l border-[#E8E5DD] pl-6">
        {sortedEvents.map((event, i) => {
          const color = kindColor[event.kind];
          const monthLabel = monthNames[event.monthIdx];
          const yearLabel = intakeYear + event.yearOffset;
          return (
            <li key={i} className="relative pb-6 last:pb-0">
              <span
                aria-hidden
                className={`absolute -left-[31px] top-1 flex h-3 w-3 items-center justify-center rounded-full ${color.dot} ring-4 ring-[#FAF9F6]`}
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#8A847B]">
                  {monthLabel} {yearLabel}
                </p>
                <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.04em] ${color.chip}`}>
                  {color.label}
                </span>
              </div>
              <p className="mt-1 text-[14px] font-bold tracking-[-0.01em] text-[#1B1916]">{event.title}</p>
              <p className="mt-1 text-[12.5px] leading-[1.6] text-[#6B655C]">{event.detail}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ── Universities ─────────────────────────────────────────────────────── */

function UniversitiesModule({
  student,
  country,
  onSendQuery,
}: {
  student: StudentOut;
  country: CountryCode;
  onSendQuery: (q: string) => void;
}) {
  const studentPct = gpaToPercentage(student.gpa, student.expected_gpa);
  const field = inferField(student.preferred_field);
  const unis = useMemo(
    () => pickUniversities(country as University["country"], studentPct, field, 6),
    [country, studentPct, field],
  );

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <SectionEyebrow>Universities &middot; {COUNTRY_PROFILES[country].name}</SectionEyebrow>
          <SectionTitle>Six picks worth shortlisting</SectionTitle>
        </div>
        {studentPct ? (
          <p className="text-[11.5px] text-[#6B655C]">
            Matched against your <span className="font-semibold text-[#1B1916]">{studentPct}%</span>
          </p>
        ) : (
          <p className="text-[11.5px] text-[#9B6200]">
            Add your GPA in profile for sharper tagging.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {unis.map((u) => {
          const fit = classifyFit(studentPct, u.entry_pct_min);
          return (
            <article
              key={u.id}
              className="rounded-xl border border-[#E8E5DD] bg-white p-4 transition hover:border-[#A8A29A] hover:shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[14px] font-bold leading-snug tracking-[-0.01em] text-[#1B1916]">
                    {u.name}
                  </h3>
                  <p className="mt-0.5 text-[11.5px] text-[#6B655C]">{u.city}</p>
                </div>
                <FitBadge fit={fit} />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px]">
                <div>
                  <dt className="text-[#8A847B]">Tuition / yr</dt>
                  <dd className="font-semibold text-[#1B1916]">
                    {currencySymbol(u.tuition_currency)}
                    {(u.tuition_min / 1000).toFixed(0)}k–{(u.tuition_max / 1000).toFixed(0)}k
                  </dd>
                </div>
                <div>
                  <dt className="text-[#8A847B]">IELTS</dt>
                  <dd className="font-semibold text-[#1B1916]">{u.ielts_min}+</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSendQuery(
                      `Tell me more about ${u.name} for ${student.preferred_field ?? "my field"}. Entry requirements, fees, what kind of student fits there.`,
                    )
                  }
                  className="ab-focus inline-flex items-center gap-1 rounded-md bg-[#12244a] px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-[#1F3D78]"
                >
                  Ask Abroadly <ArrowRight />
                </button>
                <a
                  href={u.official_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ab-focus inline-flex items-center gap-1 rounded-md border border-[#E8E5DD] px-2.5 py-1 text-[11.5px] font-semibold text-[#1F3D78] transition hover:border-[#1F3D78]"
                >
                  Official site <OpenIcon />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-3 text-[11.5px] leading-[1.55] text-[#8A847B]">
        Verify on each university&apos;s official &quot;International students&quot; page before applying.
      </p>
    </section>
  );
}

/* ── Compact documents list (8 single-line rows) ─────────────────────── */

function DocumentsModule({ documents }: { documents: StudentDocument[] }) {
  const docTypes = new Set(documents.map((d) => d.doc_type));
  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <SectionEyebrow>Documents</SectionEyebrow>
          <SectionTitle>Your file</SectionTitle>
        </div>
        <p className="text-[12px] font-semibold text-[#6B655C]">
          {docTypes.size} / {DOC_SLOTS.length} uploaded
        </p>
      </div>

      <ul className="mt-5 overflow-hidden rounded-xl border border-[#E8E5DD] bg-white">
        {DOC_SLOTS.map((slot, i) => {
          const uploaded = docTypes.has(slot.id);
          return (
            <li
              key={slot.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < DOC_SLOTS.length - 1 ? "border-b border-[#EFECE4]" : ""}`}
            >
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  uploaded ? "bg-[#0A6E45] text-white" : "border border-[#D1CABD] bg-white"
                }`}
              >
                {uploaded && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                    <path d="M3 6.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[13px] ${uploaded ? "font-semibold text-[#1B1916]" : "text-[#3F3A33]"}`}>
                  {slot.label}
                </p>
                <p className="truncate text-[11px] text-[#8A847B]">{slot.hint}</p>
              </div>
              <span
                className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.04em] ${
                  uploaded ? "text-[#0A6E45]" : "text-[#A8A29A]"
                }`}
              >
                {uploaded ? "Done" : "Pending"}
              </span>
            </li>
          );
        })}
      </ul>

      <Link
        href="/chat?docs=open"
        className="ab-focus mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#E8E5DD] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
      >
        Upload next document <ArrowRight />
      </Link>
    </section>
  );
}

/* ── Recommendation letters ──────────────────────────────────────────── */

interface LorDraft {
  id: string;
  createdAt: string;
  studentName?: string;
  program?: string;
  recommenderName?: string;
}

function RecommendationLetterModule() {
  const [drafts, setDrafts] = useState<LorDraft[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("abroadly_lor_letters");
      if (raw) setDrafts(JSON.parse(raw) as LorDraft[]);
    } catch {
      /* ignore parse errors */
    }
  }, []);

  return (
    <section className="mx-auto max-w-3xl">
      <SectionEyebrow>Recommendation letters</SectionEyebrow>
      <SectionTitle>Draft a letter in minutes</SectionTitle>

      <Link
        href="/recommendation-letter"
        className="ab-focus group mt-5 flex items-center gap-4 rounded-xl border border-[#E8E5DD] bg-white p-4 transition hover:border-[#0A6E45] sm:p-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-[#0A6E45]/10 text-[#0A6E45]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="M5 3.5h9l5 5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M13.5 3.5V9h5.5M8 13h6M8 16.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#1B1916]">Create a recommendation letter</p>
          <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[#6B655C]">
            Add your details and your teacher&apos;s, and we&apos;ll compose a clean, modern draft you can share and edit.
          </p>
        </div>
        <span className="shrink-0 text-[#8A847B] transition group-hover:text-[#0A6E45]">
          <ArrowRight />
        </span>
      </Link>

      {drafts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.05em] text-[#8A847B]">Your drafts</p>
          <ul className="overflow-hidden rounded-xl border border-[#E8E5DD] bg-white">
            {drafts.slice(0, 4).map((d, i, arr) => (
              <li
                key={d.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-[#EFECE4]" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#1B1916]">
                    {d.studentName || "Untitled draft"}
                    {d.program ? <span className="font-medium text-[#6B655C]"> · {d.program}</span> : null}
                  </p>
                  <p className="truncate text-[11px] text-[#8A847B]">
                    {d.recommenderName ? `For ${d.recommenderName}` : "Draft"} ·{" "}
                    {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <Link
                  href="/recommendation-letter"
                  className="ab-focus shrink-0 rounded-md border border-[#E8E5DD] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#3F3A33] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ── Scholarships ─────────────────────────────────────────────────────── */

function ScholarshipsModule({ country, onSendQuery }: { country: CountryProfile; onSendQuery: (q: string) => void }) {
  return (
    <section className="mx-auto max-w-3xl">
      <SectionEyebrow>Scholarships &middot; {country.name}</SectionEyebrow>
      <SectionTitle>Funding worth applying for</SectionTitle>
      <p className="mt-2 text-[13.5px] leading-[1.65] text-[#6B655C]">
        Real awards open to Nepali students. Deadlines and figures change every cycle — verify on the official portal.
      </p>

      <ul className="mt-5 divide-y divide-[#EFECE4] overflow-hidden rounded-xl border border-[#E8E5DD] bg-white">
        {country.scholarships.map((s) => (
          <li key={s.name} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="text-[14px] font-bold tracking-[-0.01em] text-[#1B1916]">{s.name}</h3>
              <p className="text-[11px] font-semibold text-[#6B655C]">{s.funder}</p>
            </div>
            <p className="mt-1 text-[12.5px] leading-[1.55] text-[#3F3A33]">
              <span className="font-semibold text-[#0A6E45]">Covers.</span> {s.covers}
            </p>
            <p className="mt-1 text-[12.5px] leading-[1.55] text-[#6B655C]">
              <span className="font-semibold text-[#1B1916]">Eligibility.</span> {s.eligibility}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-[#8A847B]">
                <span className="font-semibold text-[#1B1916]">Cycle:</span> {s.cycleOpens}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSendQuery(`Tell me more about the ${s.name} for Nepali students — am I eligible, how do I apply, what's the realistic chance?`)}
                  className="ab-focus inline-flex items-center gap-1 rounded-md border border-[#E8E5DD] bg-[#FAF9F6] px-2.5 py-1 text-[11px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
                >
                  Ask Abroadly <ArrowRight />
                </button>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ab-focus inline-flex items-center gap-1 rounded-md border border-[#E8E5DD] px-2.5 py-1 text-[11px] font-semibold text-[#1F3D78] transition hover:border-[#1F3D78]"
                >
                  Portal <OpenIcon />
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Cost snapshot ────────────────────────────────────────────────────── */

function CostModule({ country }: { country: CountryProfile }) {
  const items: { label: string; value: string }[] = [
    { label: country.cost.tuitionLabel, value: country.cost.tuitionValue },
    { label: country.cost.livingLabel, value: country.cost.livingValue },
    { label: country.cost.visaLabel, value: country.cost.visaValue },
    { label: "Flight (one-way)", value: country.cost.flightValue },
  ];
  return (
    <section className="mx-auto max-w-3xl">
      <SectionEyebrow>Costs &middot; {country.name}</SectionEyebrow>
      <SectionTitle>Rough annual budget</SectionTitle>

      <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-[#E8E5DD] bg-white p-4">
            <dt className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#8A847B]">{item.label}</dt>
            <dd className="mt-1 text-[15px] font-bold leading-[1.25] tracking-[-0.01em] text-[#1B1916]">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 rounded-md border border-[#F0D89A] bg-[#FBF4E6] px-3 py-2.5 text-[11.5px] leading-[1.55] text-[#6B5224]">
        Indicative figures. Actual cost depends heavily on city, lifestyle, and your specific
        university. Always check the &quot;Cost of attendance&quot; page on the uni&apos;s site.
      </p>
    </section>
  );
}

/* ── Recent chat (ghost band at the bottom) ──────────────────────────── */

function RecentChat({ history }: { history: ChatTurn[] }) {
  if (history.length === 0) {
    return (
      <section className="mx-auto max-w-3xl">
        <SectionEyebrow>Recent chat</SectionEyebrow>
        <p className="mt-2 text-[13px] leading-[1.65] text-[#6B655C]">
          No conversation yet. Start one — every answer is tailored to your profile.
        </p>
        <Link
          href="/chat"
          className="ab-focus mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#12244a] px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-[#1F3D78]"
        >
          Open chat <ArrowRight />
        </Link>
      </section>
    );
  }
  const last = history.slice(-3);
  return (
    <section className="mx-auto max-w-3xl">
      <SectionEyebrow>Pick up where you left off</SectionEyebrow>
      <ul className="mt-4 flex flex-col gap-2">
        {last.map((t) => {
          const role = t.role === "user" ? "You" : t.role === "counselor" ? "Counsellor" : "Abroadly";
          const roleColor = t.role === "user" ? "text-[#1B1916]" : t.role === "counselor" ? "text-[#12244a]" : "text-[#0A6E45]";
          return (
            <li key={t.id} className="rounded-md border border-[#EFECE4] bg-white/60 px-3 py-2.5">
              <p className="flex items-center justify-between text-[10.5px]">
                <span className={`font-bold uppercase tracking-[0.04em] ${roleColor}`}>{role}</span>
                <span className="text-[#8A847B]">{new Date(t.created_at).toLocaleDateString()}</span>
              </p>
              <p className="dash-clamp-2 mt-1 text-[12.5px] leading-[1.55] text-[#3F3A33]">{t.content}</p>
            </li>
          );
        })}
      </ul>
      <Link
        href="/chat"
        className="ab-focus mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#E8E5DD] bg-white px-4 py-2 text-[12.5px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
      >
        Continue the conversation <ArrowRight />
      </Link>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentOut | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCountry, setActiveCountry] = useState<CountryCode>("UK");

  useEffect(() => {
    const sid = typeof window !== "undefined" ? window.localStorage.getItem("abroadly_student_id") : null;
    if (!sid) {
      router.push("/onboarding");
      return;
    }
    Promise.all([
      getStudent(sid).catch(() => {
        throw new Error("Couldn't load your profile.");
      }),
      getStudentDocuments(sid).catch(() => [] as StudentDocument[]),
      getChatHistory(sid).catch(() => [] as ChatTurn[]),
    ])
      .then(([s, d, h]) => {
        setStudent(s);
        setDocuments(d);
        setHistory(h);
        const supported = resolveTargetCountries(s.target_countries);
        setActiveCountry(supported[0]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const onSendQuery = useCallback(
    (q: string) => {
      if (!q) return;
      router.push(`/chat?send=${encodeURIComponent(q)}`);
    },
    [router],
  );

  const supportedCountries = useMemo(
    () => (student ? resolveTargetCountries(student.target_countries) : ["UK" as CountryCode]),
    [student],
  );

  const countryProfile = COUNTRY_PROFILES[activeCountry];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] text-[#6B655C]">
        <p className="text-sm">Loading your dashboard…</p>
      </main>
    );
  }

  if (error || !student) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] text-[#1B1916]">
        <div className="max-w-md rounded-xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-md)]">
          <h1 className="text-lg font-bold">Couldn&apos;t load your dashboard</h1>
          <p className="mt-2 text-sm leading-7 text-[#6B655C]">{error || "Profile not found."}</p>
          <Link
            href="/chat"
            className="ab-focus mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#12244a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1F3D78]"
          >
            Open chat <ArrowRight />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1B1916]">
      {/* Header */}
      <header className="border-b border-[#E8E5DD] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="ab-focus flex items-center gap-3 rounded-md">
            <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-8 w-8 rounded-md" />
            <span className="text-base font-bold">Abroadly</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/chat"
              className="ab-focus inline-flex items-center gap-1.5 rounded-md border border-[#E8E5DD] bg-white px-3 py-1.5 font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
            >
              Open chat <ArrowRight />
            </Link>
          </nav>
        </div>
      </header>

      {/* Country switcher row */}
      <div className="mx-auto max-w-3xl px-5 pt-7 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#8A847B]">Your plan</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CountrySwitcher
            countries={supportedCountries}
            active={activeCountry}
            onChange={setActiveCountry}
          />
          <p className="text-[11.5px] text-[#8A847B]">
            Switch to see how visa, deadlines, and scholarships differ.
          </p>
        </div>
      </div>

      {/* Main scrollable content — single column, sectioned narrative */}
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-6 sm:px-8">
        <div className="flex flex-col gap-14 sm:gap-16">
          <HeroModule student={student} docs={documents} country={countryProfile} onSendQuery={onSendQuery} />
          <FactStrip country={countryProfile} />
          <TimelineModule country={countryProfile} />
          <UniversitiesModule student={student} country={activeCountry} onSendQuery={onSendQuery} />
          <DocumentsModule documents={documents} />
          <RecommendationLetterModule />
          <ScholarshipsModule country={countryProfile} onSendQuery={onSendQuery} />
          <CostModule country={countryProfile} />
          <RecentChat history={history} />
        </div>

        <p className="mt-14 text-center text-[11px] text-[#8A847B]">
          Abroadly is a free guide — for binding decisions, always check the official university or
          government immigration portal.
        </p>
      </article>
    </main>
  );
}
