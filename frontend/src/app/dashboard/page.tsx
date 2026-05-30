"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getStudent,
  getStudentDocuments,
  getChatHistory,
  type StudentOut,
  type StudentDocument,
} from "@/lib/api";

/* ── Static structures driven by Abroadly's eight upload categories ───── */

interface DocSlot {
  id: string;
  label: string;
  icon: string;
  hint: string;
}

const DOC_SLOTS: DocSlot[] = [
  { id: "grade_sheet", label: "Grade Sheet / Transcript", icon: "📊", hint: "+2, A-levels, or bachelor's marksheet" },
  { id: "citizenship", label: "Citizenship", icon: "🇳🇵", hint: "Nepali citizenship certificate" },
  { id: "passport", label: "Passport", icon: "🛂", hint: "Valid passport bio page" },
  { id: "sop", label: "Statement of Purpose", icon: "✍️", hint: "SOP or personal statement draft" },
  { id: "recommendation", label: "Recommendation Letter", icon: "📨", hint: "LOR from teacher or employer" },
  { id: "financial", label: "Financial Documents", icon: "🏦", hint: "Bank statement, sponsor letter, scholarship" },
  { id: "ielts", label: "IELTS / PTE / TOEFL", icon: "📝", hint: "English proficiency test score" },
  { id: "other", label: "Other Document", icon: "📎", hint: "Anything else relevant" },
];

interface JourneyStep {
  title: string;
  body: string;
  /** Heuristic predicate: given progress signals, is this step DONE? */
  isDone: (s: ProgressSignals) => boolean;
}

interface ProgressSignals {
  hasProfile: boolean;
  countryChosen: boolean;
  docsUploaded: number;
  chatMessages: number;
  hasIeltsDoc: boolean;
}

const JOURNEY: JourneyStep[] = [
  {
    title: "Pick your destination and course",
    body: "Decide which country and broad field you're targeting — UK, Australia, Canada, USA, Germany. You can refine later.",
    isDone: (s) => s.countryChosen,
  },
  {
    title: "Build your study profile",
    body: "Fill in your education level, GPA, target countries, and field of interest so every answer is specific to you.",
    isDone: (s) => s.hasProfile,
  },
  {
    title: "Gather your documents",
    body: "Marksheets, passport, citizenship, financial proof. Upload them here — Abroadly will reference them in chat.",
    isDone: (s) => s.docsUploaded >= 5,
  },
  {
    title: "Take an English test",
    body: "Book IELTS / PTE / TOEFL through the British Council Nepal or an authorised centre. Upload the score when you have it.",
    isDone: (s) => s.hasIeltsDoc,
  },
  {
    title: "Apply to universities",
    body: "Shortlist 5–10 universities, prepare your SOP and references, and submit through the official portal (UCAS for UK undergrad, direct for masters / other countries).",
    isDone: () => false, // out of Abroadly's tracking scope for v1
  },
  {
    title: "Apply for your student visa",
    body: "Once you have a CAS / I-20 / CoE / acceptance letter, apply directly on the official government immigration portal.",
    isDone: () => false,
  },
];

/* ── Progress computation ─────────────────────────────────────────────── */

function computeProgress(
  student: StudentOut | null,
  docs: StudentDocument[],
  chatTurnCount: number,
): { pct: number; currentStep: number; signals: ProgressSignals } {
  const hasProfile = !!student?.profile_completed;
  const countryChosen = (student?.target_countries?.length ?? 0) > 0;
  const docsUploaded = new Set(docs.map((d) => d.doc_type)).size;
  const hasIeltsDoc = docs.some((d) => d.doc_type === "ielts");

  const signals: ProgressSignals = {
    hasProfile,
    countryChosen,
    docsUploaded,
    chatMessages: chatTurnCount,
    hasIeltsDoc,
  };

  // Weighted scoring — caps at 100.
  let pct = 0;
  if (countryChosen) pct += 10;
  if (hasProfile) pct += 20;
  pct += Math.min(docsUploaded, 8) * 6.25; // up to 50%
  if (chatTurnCount >= 1) pct += 5;
  if (chatTurnCount >= 5) pct += 10;
  if (hasIeltsDoc) pct += 5;
  pct = Math.min(100, Math.round(pct));

  // Current step = first not-yet-done step in JOURNEY.
  const currentStep = JOURNEY.findIndex((step) => !step.isDone(signals));
  return {
    pct,
    currentStep: currentStep === -1 ? JOURNEY.length : currentStep,
    signals,
  };
}

/* ── Inline UI ─────────────────────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="10" cy="10" r="8" fill="#0A6E45" />
      <path d="M6.5 10l2.5 2.5 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CurrentIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#0A6E45" strokeWidth="1.8" />
      <circle cx="10" cy="10" r="3" fill="#0A6E45" />
    </svg>
  );
}

function PendingIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#E8E5DD" strokeWidth="1.8" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <path
        d="M3 8h10m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentOut | null>(null);
  const [docs, setDocs] = useState<StudentDocument[]>([]);
  const [chatTurnCount, setChatTurnCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sid = typeof window !== "undefined" ? localStorage.getItem("abroadly_student_id") : null;
    if (!sid) {
      router.push("/onboarding");
      return;
    }
    Promise.all([
      getStudent(sid).catch((e) => {
        throw new Error("Could not load your profile.");
      }),
      getStudentDocuments(sid).catch(() => [] as StudentDocument[]),
      getChatHistory(sid).catch(() => [] as { id: string; role: string }[]),
    ])
      .then(([s, d, h]) => {
        setStudent(s);
        setDocs(d);
        setChatTurnCount(h.filter((t) => t.role === "user").length);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const { pct, currentStep, signals } = useMemo(
    () => computeProgress(student, docs, chatTurnCount),
    [student, docs, chatTurnCount],
  );

  const uploadedDocTypes = useMemo(() => new Set(docs.map((d) => d.doc_type)), [docs]);
  const firstName = student?.full_name?.split(" ")[0] ?? "there";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] text-[#6B655C]">
        <p className="text-sm">Loading your dashboard…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] text-[#1B1916]">
        <div className="max-w-md rounded-xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-md)]">
          <h1 className="text-lg font-bold">Couldn't load your dashboard</h1>
          <p className="mt-2 text-sm leading-7 text-[#6B655C]">{error}</p>
          <Link
            href="/chat"
            className="ab-focus mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#12244a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1F3D78]"
          >
            Open chat <ArrowRightIcon />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1B1916]">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="border-b border-[#E8E5DD] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="ab-focus flex items-center gap-3 rounded-md">
            <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-8 w-8 rounded-md" />
            <span className="text-base font-bold">Abroadly</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/chat"
              className="ab-focus rounded-md border border-[#E8E5DD] bg-white px-3 py-1.5 font-semibold text-[#1B1916] transition hover:border-[#A8A29A]"
            >
              Open chat
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-8 lg:pt-12">
        {/* ── Welcome + progress ──────────────────────────────── */}
        <section className="rounded-xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
            Your dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-[1.1] tracking-[-0.02em] sm:text-4xl">
            Welcome back, {firstName}.
          </h1>
          {student?.target_countries && student.target_countries.length > 0 && (
            <p className="mt-3 text-sm text-[#6B655C]">
              Targeting{" "}
              <span className="font-semibold text-[#1B1916]">
                {student.target_countries.join(", ")}
              </span>
              {student.preferred_field ? (
                <>
                  {" "}for{" "}
                  <span className="font-semibold text-[#1B1916]">{student.preferred_field}</span>
                </>
              ) : null}
              .
            </p>
          )}

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <p className="text-sm font-semibold text-[#1B1916]">
                Step {Math.min(currentStep + 1, JOURNEY.length)} of {JOURNEY.length} ·{" "}
                <span className="text-[#0A6E45]">{pct}% complete</span>
              </p>
              <p className="text-xs text-[#8A847B]">
                {signals.docsUploaded} of {DOC_SLOTS.length} documents uploaded
              </p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EFECE4]">
              <div
                className="h-full rounded-full bg-[#0A6E45] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </section>

        {/* ── Two-column on desktop: journey + checklist ──────── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Journey */}
          <section className="rounded-xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
            <h2 className="text-lg font-bold tracking-[-0.015em]">
              Your study-abroad journey
            </h2>
            <p className="mt-1 text-sm text-[#6B655C]">
              Six steps from now to landing in your destination country.
            </p>

            <ol className="mt-6 space-y-5">
              {JOURNEY.map((step, i) => {
                const done = step.isDone(signals);
                const current = i === currentStep;
                return (
                  <li key={step.title} className="flex gap-4">
                    <div className="mt-0.5 shrink-0">
                      {done ? <CheckIcon /> : current ? <CurrentIcon /> : <PendingIcon />}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          done
                            ? "text-[#6B655C] line-through decoration-[#A8A29A]"
                            : current
                            ? "text-[#0A6E45]"
                            : "text-[#1B1916]"
                        }`}
                      >
                        {i + 1}. {step.title}
                      </p>
                      <p className="mt-1 text-[13px] leading-[1.65] text-[#6B655C]">
                        {step.body}
                      </p>
                      {current && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-[#E8F2EC] px-2 py-1 text-[11px] font-semibold text-[#0A6E45]">
                          You're here
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Document checklist */}
          <section className="rounded-xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
            <h2 className="text-lg font-bold tracking-[-0.015em]">Document checklist</h2>
            <p className="mt-1 text-sm text-[#6B655C]">
              The eight categories Abroadly tracks. Upload through the chat.
            </p>

            <ul className="mt-6 space-y-2">
              {DOC_SLOTS.map((slot) => {
                const uploaded = uploadedDocTypes.has(slot.id);
                return (
                  <li
                    key={slot.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition ${
                      uploaded
                        ? "border-[#E8F2EC] bg-[#E8F2EC]/40"
                        : "border-[#E8E5DD] bg-white hover:border-[#A8A29A]"
                    }`}
                  >
                    <span className="text-lg leading-none">{slot.icon}</span>
                    <span className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1B1916]">{slot.label}</p>
                      <p className="text-[11px] leading-tight text-[#8A847B]">{slot.hint}</p>
                    </span>
                    {uploaded ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#E8F2EC] px-2 py-1 text-[11px] font-semibold text-[#0A6E45]">
                        <CheckIcon /> Uploaded
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#8A847B]">Pending</span>
                    )}
                  </li>
                );
              })}
            </ul>

            <Link
              href="/chat?docs=open"
              className="ab-focus mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#12244a] px-4 py-3 text-sm font-bold text-white shadow-[var(--shadow-sm)] transition hover:bg-[#1F3D78]"
            >
              Upload documents <ArrowRightIcon />
            </Link>
          </section>
        </div>

        {/* ── Quick actions ───────────────────────────────────── */}
        <section className="mt-8 rounded-xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
          <h2 className="text-lg font-bold tracking-[-0.015em]">Quick actions</h2>
          <p className="mt-1 text-sm text-[#6B655C]">
            Jump back into the flow whenever you have a few minutes.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link
              href="/chat"
              className="ab-focus group flex flex-col gap-2 rounded-lg border border-[#E8E5DD] bg-[#FAF9F6] p-4 transition hover:border-[#A8A29A]"
            >
              <span className="text-2xl">💬</span>
              <span className="text-sm font-semibold text-[#1B1916]">Ask a question</span>
              <span className="text-[12px] leading-[1.5] text-[#6B655C]">
                Eligibility, costs, visa, scholarships — anything.
              </span>
            </Link>
            <Link
              href="/chat?docs=open"
              className="ab-focus group flex flex-col gap-2 rounded-lg border border-[#E8E5DD] bg-[#FAF9F6] p-4 transition hover:border-[#A8A29A]"
            >
              <span className="text-2xl">📤</span>
              <span className="text-sm font-semibold text-[#1B1916]">Upload a document</span>
              <span className="text-[12px] leading-[1.5] text-[#6B655C]">
                Marksheet, passport, SOP, financial proof.
              </span>
            </Link>
            <Link
              href="/onboarding/details"
              className="ab-focus group flex flex-col gap-2 rounded-lg border border-[#E8E5DD] bg-[#FAF9F6] p-4 transition hover:border-[#A8A29A]"
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-sm font-semibold text-[#1B1916]">Edit your profile</span>
              <span className="text-[12px] leading-[1.5] text-[#6B655C]">
                Update GPA, target countries, field, or goals.
              </span>
            </Link>
          </div>
        </section>

        {/* ── Footer note ─────────────────────────────────────── */}
        <p className="mt-10 text-center text-xs text-[#8A847B]">
          Abroadly is a free guide — for binding decisions, always check the official
          university or government immigration portal.
        </p>
      </article>
    </main>
  );
}
