"use client";

/**
 * Abroadly student dashboard — full coaching surface.
 *
 * Seven modules in order:
 *   1. Hero (compass sentence + 3-stop visual progress)
 *   2. Interactive To-Do (checkboxes, persisted in localStorage)
 *   3. Timeline (months strip with today + intake markers)
 *   4. Recommended universities (GPA-matched, tiered Reach/Match/Safety)
 *   5. Recommended courses (field-matched)
 *   6. Document checklist (compact, with rich detail on hover)
 *   7. Cost snapshot (rough annual budget per target country)
 *
 * Reuses existing endpoints (getStudent, getStudentDocuments, getChatHistory).
 * University + course matching is pure-frontend from a curated data file.
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
  UNIVERSITIES,
  classifyFit,
  currencySymbol,
  gpaToPercentage,
  inferField,
  pickCourses,
  pickUniversities,
  type AdmissionFit,
  type University,
} from "@/lib/university-data";

/* ── Local types ──────────────────────────────────────────────────────── */

interface TodoItem {
  id: string;
  title: string;
  detail: string;
  query?: string;          // optional pre-loaded chat query
  href?: string;           // optional direct navigation
  emoji: string;
}

interface DocSlot {
  id: string;
  label: string;
  whatItIs: string;
  whereToGet: string;
  howLong: string;
  icon: string;
}

/* ── Static structures ────────────────────────────────────────────────── */

const DOC_SLOTS: DocSlot[] = [
  {
    id: "grade_sheet",
    label: "Grade Sheet / Transcript",
    whatItIs: "Your +2 (Class 12) marksheet with subject-wise grades and final aggregate. For postgraduate, your bachelor's transcript.",
    whereToGet: "Original from your school / college registrar. For international use, attest at MoEST (Singha Durbar, 1-2 days) then MoFA (Tripureshwor, 1 day).",
    howLong: "1-2 weeks total in Nepal",
    icon: "📊",
  },
  {
    id: "citizenship",
    label: "Citizenship Certificate",
    whatItIs: "Your Nepali citizenship — both sides as a clear scan.",
    whereToGet: "Your local CDO office if you don't have one yet. Most students already have it.",
    howLong: "Have it already, or 2-3 weeks if applying",
    icon: "🇳🇵",
  },
  {
    id: "passport",
    label: "Passport",
    whatItIs: "Must be valid for the full course + 6 months. Universities and embassies use this as your primary ID.",
    whereToGet: "Department of Passports Nepal (Tripureshwor), or your nearest district passport office. Apply online first.",
    howLong: "4-6 weeks for new application; renewal faster",
    icon: "🛂",
  },
  {
    id: "sop",
    label: "Statement of Purpose",
    whatItIs: "500-1,000 words per university. Why this course, why this university, your relevant background, your plan after graduation.",
    whereToGet: "You write it. Abroadly can help you outline and review drafts.",
    howLong: "2-3 weeks of writing + revising per university",
    icon: "✍️",
  },
  {
    id: "recommendation",
    label: "Recommendation Letters",
    whatItIs: "Usually 2 letters from teachers who taught you in the last 2 years and know your work well.",
    whereToGet: "Ask your teachers / professors early. Provide them your CV + the universities you're applying to.",
    howLong: "Give referees 4+ weeks notice",
    icon: "📨",
  },
  {
    id: "financial",
    label: "Financial Documents",
    whatItIs: "Bank statements, sponsor letter, scholarship letters, education loan approval. Proves you can fund your studies.",
    whereToGet: "Your bank in Nepal (NIC Asia, Nabil, Sanima, etc.). Loan letters take longer.",
    howLong: "1-3 weeks depending on bank + loan complexity",
    icon: "🏦",
  },
  {
    id: "ielts",
    label: "IELTS / PTE / TOEFL",
    whatItIs: "Official English-language test score. Most UK universities want 6.5+ overall on IELTS.",
    whereToGet: "British Council Kathmandu (IELTS), IDP (IELTS), authorised PTE centres. Book IELTS for UKVI specifically for UK visas.",
    howLong: "4-6 weeks from booking to result",
    icon: "📝",
  },
  {
    id: "other",
    label: "Other Documents",
    whatItIs: "Anything else specific to your case — character certificate, migration certificate, portfolio (for design/architecture), CV.",
    whereToGet: "Your school / university / employer / personal preparation.",
    howLong: "Variable",
    icon: "📎",
  },
];

/* ── Heuristic engines ────────────────────────────────────────────────── */

function buildTodoList(
  student: StudentOut,
  documents: StudentDocument[],
): TodoItem[] {
  const docTypes = new Set(documents.map((d) => d.doc_type));
  const country = student.target_countries?.[0] ?? "the UK";
  const field = student.preferred_field ?? "your field";
  const items: TodoItem[] = [];

  if (!student.profile_completed) {
    items.push({
      id: "profile",
      title: "Finish your study profile",
      detail: "Add GPA, target countries, field, and goals so every suggestion below sharpens up.",
      href: "/onboarding/details",
      emoji: "👤",
    });
  }

  if (!docTypes.has("grade_sheet")) {
    items.push({
      id: "transcript",
      title: "Upload your NEB transcript",
      detail: `Get the original from your school. For ${country} you'll need MoEST + MoFA attestation later — allow ~2 weeks.`,
      query: `Walk me through getting my NEB transcript attested for ${country}.`,
      emoji: "📊",
    });
  }

  if (!docTypes.has("passport")) {
    items.push({
      id: "passport",
      title: "Make sure your passport is ready",
      detail: "Must be valid for full course + 6 months. Apply at Department of Passports Nepal (4-6 weeks) if you don't have one yet.",
      query: `What passport validity do I need for studying in ${country}?`,
      emoji: "🛂",
    });
  }

  if (!docTypes.has("ielts")) {
    items.push({
      id: "ielts",
      title: "Book your IELTS test",
      detail: "British Council Kathmandu slots fill 4-6 weeks ahead. Most UK universities want 6.5+ overall.",
      query: `Help me decide between IELTS and PTE for ${country}.`,
      emoji: "📝",
    });
  }

  items.push({
    id: "shortlist",
    title: `Shortlist 5 ${country} universities`,
    detail: "Aim for 2 reach + 2 match + 1 safety. Use the Recommended universities section below as a starting point.",
    query: `Suggest 5 ${country} universities for ${field} that fit my profile.`,
    emoji: "🎓",
  });

  if (!docTypes.has("sop")) {
    items.push({
      id: "sop",
      title: "Start drafting your statement of purpose",
      detail: "500-1,000 words per university. Begin with your why — Abroadly can help outline.",
      query: `Help me outline my SOP for studying ${field} in ${country}.`,
      emoji: "✍️",
    });
  }

  if (!docTypes.has("financial")) {
    items.push({
      id: "finance",
      title: "Prepare financial proof",
      detail: `For ${country}, you typically need to show 9-12 months of living costs + first-year tuition held in a stable bank account.`,
      query: `Help me plan financial proof for a ${country} student visa.`,
      emoji: "🏦",
    });
  }

  if (!docTypes.has("recommendation")) {
    items.push({
      id: "lor",
      title: "Line up two recommendation letters",
      detail: "Pick teachers who taught you in the last 2 years. Give them 4+ weeks notice and share your CV + university list.",
      query: `Help me draft an LOR request for a ${field} teacher.`,
      emoji: "📨",
    });
  }

  return items;
}

function compassSentence(s: StudentOut, docs: StudentDocument[]): string {
  const docTypes = new Set(docs.map((d) => d.doc_type));
  const hasIelts = docTypes.has("ielts");
  if (!s.profile_completed) return "Let's finish your profile — it powers every recommendation below.";
  if (docs.length === 0) return "Profile is set. Time to start collecting documents.";
  if (docs.length < 3) return "You've started uploading documents. Aim for 5 of 8 before applying.";
  if (docs.length >= 3 && !hasIelts) return "Documents are coming together. Next focus: book your English test.";
  if (hasIelts) return "Documents look solid. Now's the time to shortlist universities and start applications.";
  return "You're well into your study-abroad journey. Keep moving forward.";
}

/** "What stage are you in" — 3-stop progress: Explore → Apply → Land */
type Stage = "explore" | "apply" | "land";
function currentStage(s: StudentOut, docs: StudentDocument[]): Stage {
  const docTypes = new Set(docs.map((d) => d.doc_type));
  const docCount = docTypes.size;
  const hasIelts = docTypes.has("ielts");
  const hasSop = docTypes.has("sop");
  const hasFinance = docTypes.has("financial");
  // Land = visa/finance phase
  if (hasIelts && hasSop && hasFinance && docCount >= 6) return "land";
  // Apply = you've started the prep but not visa-ready
  if (hasIelts || hasSop || docCount >= 4) return "apply";
  return "explore";
}

/** Next sensible Sept intake — at least 4 months from today. */
function nextSensibleIntake(): { date: Date; label: string; monthsOut: number } {
  const now = new Date();
  let year = now.getFullYear();
  const thisSept = new Date(year, 8, 1);
  const monthsToThisSept = (thisSept.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
  if (monthsToThisSept < 4) year += 1;
  const date = new Date(year, 8, 1);
  const monthsOut = Math.max(0, Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
  return { date, label: `September ${year}`, monthsOut };
}

/* ── Small UI primitives ──────────────────────────────────────────────── */

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

function ChevronRight() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
      <path d="M9 3h4v4M13 3 7 9M11 9v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Modules ──────────────────────────────────────────────────────────── */

function HeroModule({ student, docs }: { student: StudentOut; docs: StudentDocument[] }) {
  const firstName = student.full_name?.split(" ")[0] ?? "there";
  const sentence = compassSentence(student, docs);
  const stage = currentStage(student, docs);
  const stages: { id: Stage; label: string; sub: string }[] = [
    { id: "explore", label: "Explore", sub: "Pick countries, build profile" },
    { id: "apply", label: "Apply", sub: "Documents, IELTS, SOP, universities" },
    { id: "land", label: "Land", sub: "Visa, flights, arrival" },
  ];
  const stageIdx = stages.findIndex((s) => s.id === stage);
  const intake = nextSensibleIntake();
  const country = student.target_countries?.[0] ?? "your destination";

  return (
    <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
        Where you are now
      </p>
      <h1 className="mt-2 text-2xl font-bold leading-[1.15] tracking-[-0.02em] sm:text-3xl">
        Hey {firstName} — {sentence}
      </h1>
      <p className="mt-3 text-[13px] text-[#6B655C]">
        Targeting <span className="font-semibold text-[#1B1916]">{country}</span> ·{" "}
        Target intake: <span className="font-semibold text-[#1B1916]">{intake.label}</span>{" "}
        (~{intake.monthsOut} months out)
      </p>

      <div className="mt-6 flex items-center gap-2 sm:gap-3" aria-label="Your stage">
        {stages.map((s, i) => {
          const isPast = i < stageIdx;
          const isCurrent = i === stageIdx;
          return (
            <div key={s.id} className="flex flex-1 items-center gap-2 sm:gap-3">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isPast
                    ? "bg-[#0A6E45] text-white"
                    : isCurrent
                    ? "bg-[#7DDBB1] text-[#0A6E45] ring-4 ring-[#E8F2EC]"
                    : "bg-[#EFECE4] text-[#8A847B]"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isPast ? "✓" : i + 1}
              </div>
              <div className="min-w-0">
                <p className={`text-[12px] font-bold leading-tight ${isCurrent ? "text-[#0A6E45]" : isPast ? "text-[#1B1916]" : "text-[#8A847B]"}`}>
                  {s.label}
                </p>
                <p className="hidden text-[11px] leading-tight text-[#8A847B] sm:block">{s.sub}</p>
              </div>
              {i < stages.length - 1 && (
                <div className={`mx-auto h-0.5 flex-1 rounded ${i < stageIdx ? "bg-[#0A6E45]" : "bg-[#EFECE4]"}`} aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TodoModule({
  items,
  studentId,
  onSendQuery,
}: {
  items: TodoItem[];
  studentId: string;
  onSendQuery: (q: string) => void;
}) {
  const storageKey = `abroadly_todo_done_${studentId}`;
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setDone(new Set(JSON.parse(raw)));
    } catch {
      /* corrupt localStorage = fresh start */
    }
  }, [storageKey]);

  const toggle = useCallback(
    (id: string) => {
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
          } catch {
            /* quota or privacy mode — ignore */
          }
        }
        return next;
      });
    },
    [storageKey],
  );

  const doneCount = useMemo(() => items.filter((i) => done.has(i.id)).length, [items, done]);

  return (
    <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
            Your to-do
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.015em]">What to do next</h2>
        </div>
        <p className="text-[12.5px] font-semibold text-[#6B655C]">
          {doneCount} / {items.length} done
        </p>
      </header>

      {items.length === 0 ? (
        <p className="mt-4 text-[13px] leading-[1.65] text-[#6B655C]">
          You're caught up. Use the chat to keep refining your university shortlist and SOP.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {items.map((item) => {
            const isDone = done.has(item.id);
            return (
              <li
                key={item.id}
                className={`rounded-xl border p-3 transition ${
                  isDone
                    ? "border-[#E8E5DD] bg-[#FAF9F6] opacity-70"
                    : "border-[#E8E5DD] bg-white hover:border-[#A8A29A]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isDone}
                    onClick={() => toggle(item.id)}
                    className={`ab-focus mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      isDone
                        ? "border-[#0A6E45] bg-[#0A6E45] text-white"
                        : "border-[#D1CABD] bg-white hover:border-[#0A6E45]"
                    }`}
                  >
                    {isDone && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                        <path d="M3 6.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[14px] font-semibold leading-snug tracking-[-0.01em] ${
                        isDone ? "text-[#6B655C] line-through decoration-[#A8A29A]" : "text-[#1B1916]"
                      }`}
                    >
                      <span className="mr-1.5" aria-hidden>{item.emoji}</span>
                      {item.title}
                    </p>
                    <p className={`mt-1 text-[12.5px] leading-[1.6] text-[#6B655C] ${isDone ? "" : ""}`}>
                      {item.detail}
                    </p>
                    {(item.query || item.href) && !isDone && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.query && (
                          <Link
                            href={`/chat?send=${encodeURIComponent(item.query)}`}
                            className="ab-focus inline-flex items-center gap-1 rounded-md border border-[#E8E5DD] bg-[#FAF9F6] px-2.5 py-1 text-[11.5px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
                            onClick={(e) => {
                              if (item.query) {
                                e.preventDefault();
                                onSendQuery(item.query);
                              }
                            }}
                          >
                            Ask Abroadly <ChevronRight />
                          </Link>
                        )}
                        {item.href && (
                          <Link
                            href={item.href}
                            className="ab-focus inline-flex items-center gap-1 rounded-md border border-[#E8E5DD] bg-[#FAF9F6] px-2.5 py-1 text-[11.5px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
                          >
                            Open <ChevronRight />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-[11px] leading-[1.55] text-[#8A847B]">
        Check off tasks as you finish them. Your progress is saved on this device.
      </p>
    </section>
  );
}

function TimelineModule() {
  const intake = nextSensibleIntake();
  const now = new Date();
  // Build a 14-month strip starting at this month
  const months: { d: Date; isToday: boolean; tag?: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ d, isToday: i === 0 });
  }
  // Mark visa earliest = 6 months before intake
  const visaEarliest = new Date(intake.date);
  visaEarliest.setMonth(visaEarliest.getMonth() - 6);
  // Mark application opens (UCAS-style) = 12 months before intake
  const apply = new Date(intake.date);
  apply.setMonth(apply.getMonth() - 12);

  months.forEach((m) => {
    if (m.d.getMonth() === intake.date.getMonth() && m.d.getFullYear() === intake.date.getFullYear()) m.tag = "Intake";
    else if (m.d.getMonth() === visaEarliest.getMonth() && m.d.getFullYear() === visaEarliest.getFullYear()) m.tag = "Visa window opens";
    else if (m.d.getMonth() === apply.getMonth() && m.d.getFullYear() === apply.getFullYear()) m.tag = "Apply now";
  });

  return (
    <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
        Your timeline
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-[-0.015em]">When things happen</h2>
      <p className="mt-2 text-[13px] leading-[1.65] text-[#6B655C]">
        14 months from today. The key dates assume a {intake.label} intake — your most realistic
        next September.
      </p>

      <div className="mt-5 overflow-x-auto">
        <div className="flex min-w-[760px] gap-1.5 pb-2">
          {months.map((m, i) => {
            const monthLabel = m.d.toLocaleString("default", { month: "short" });
            const yearLabel = m.d.getFullYear().toString().slice(-2);
            return (
              <div key={i} className="flex flex-1 min-w-[52px] flex-col items-center">
                <p
                  className={`text-[10px] font-semibold uppercase tracking-[0.04em] ${
                    m.isToday ? "text-[#0A6E45]" : m.tag ? "text-[#1F3D78]" : "text-[#8A847B]"
                  }`}
                >
                  {monthLabel}
                </p>
                <p className="text-[9px] text-[#A8A29A]">'{yearLabel}</p>
                <div
                  className={`mt-1 h-12 w-full rounded-md border ${
                    m.isToday
                      ? "border-[#0A6E45] bg-[#E8F2EC]"
                      : m.tag === "Intake"
                      ? "border-[#1F3D78] bg-[#EEF1FA]"
                      : m.tag === "Visa window opens"
                      ? "border-[#F0D89A] bg-[#FBF4E6]"
                      : m.tag === "Apply now"
                      ? "border-[#7DDBB1] bg-white"
                      : "border-[#E8E5DD] bg-[#FAF9F6]"
                  }`}
                />
                {(m.isToday || m.tag) && (
                  <p
                    className={`mt-1.5 text-center text-[10px] font-bold leading-tight ${
                      m.isToday ? "text-[#0A6E45]" : "text-[#1F3D78]"
                    }`}
                  >
                    {m.isToday ? "Today" : m.tag}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-[1.55] text-[#8A847B]">
        Scroll horizontally to see all 14 months. Mark these on your calendar — IELTS bookings + visa appointments fill up fast.
      </p>
    </section>
  );
}

function UniversitiesModule({
  student,
  onSendQuery,
}: {
  student: StudentOut;
  onSendQuery: (q: string) => void;
}) {
  const country = (student.target_countries?.[0] as University["country"]) ?? "UK";
  const studentPct = gpaToPercentage(student.gpa, student.expected_gpa);
  const field = inferField(student.preferred_field);
  const unis = useMemo(() => pickUniversities(country, studentPct, field, 8), [country, studentPct, field]);

  return (
    <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
            Recommended universities
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.015em]">
            {country} picks for you
          </h2>
        </div>
        {studentPct ? (
          <p className="text-[11.5px] text-[#6B655C]">
            Matched against your <span className="font-semibold text-[#1B1916]">{studentPct}%</span> profile
          </p>
        ) : (
          <p className="text-[11.5px] text-[#9B6200]">
            Add your GPA in profile for sharper Reach / Match / Safety tagging.
          </p>
        )}
      </header>

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

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11.5px]">
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
                  onClick={() => onSendQuery(`Tell me more about ${u.name} for ${student.preferred_field ?? "my field"}. Entry requirements, fees, what kind of student fits there.`)}
                  className="ab-focus inline-flex items-center gap-1 rounded-md bg-[#12244a] px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-[#1F3D78]"
                >
                  Ask Abroadly <ChevronRight />
                </button>
                <a
                  href={u.official_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ab-focus inline-flex items-center gap-1 rounded-md border border-[#E8E5DD] px-2.5 py-1 text-[11.5px] font-semibold text-[#1F3D78] transition hover:border-[#1F3D78]"
                >
                  Official site <ExternalLinkIcon />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-[11.5px] leading-[1.55] text-[#8A847B]">
        Tuition and entry bars are indicative — always verify on the university's official "International students" page before applying.
      </p>
    </section>
  );
}

function CoursesModule({
  student,
  onSendQuery,
}: {
  student: StudentOut;
  onSendQuery: (q: string) => void;
}) {
  const country = (student.target_countries?.[0] as University["country"]) ?? "UK";
  const field = inferField(student.preferred_field);
  const courses = useMemo(() => pickCourses(country, field, 8), [country, field]);

  if (!field) {
    return (
      <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
          Recommended courses
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-[-0.015em]">Tell us your field first</h2>
        <p className="mt-3 text-[13px] leading-[1.65] text-[#6B655C]">
          Add a preferred field (computer science, business, nursing, engineering, etc.) in your profile and we'll show concrete programs that fit.
        </p>
        <Link
          href="/onboarding/details"
          className="ab-focus mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#365CC4] transition hover:text-[#1F3D78]"
        >
          Edit profile <ChevronRight />
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
        Recommended courses
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-[-0.015em]">
        {country} programs in {student.preferred_field}
      </h2>

      {courses.length === 0 ? (
        <p className="mt-3 text-[13px] leading-[1.65] text-[#6B655C]">
          We're still building our course database for this country + field. Ask Abroadly directly and we'll help.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-[#EFECE4]">
          {courses.map(({ course, university }) => (
            <li key={course.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold tracking-[-0.005em] text-[#1B1916]">{course.name}</p>
                <p className="mt-0.5 text-[11.5px] text-[#6B655C]">
                  {university.name} · {course.duration_years} {course.duration_years === 1 ? "year" : "years"} · {course.level === "postgraduate" ? "Postgraduate" : "Undergraduate"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSendQuery(`Tell me about ${course.name} at ${university.name} — entry requirements, what I'll study, career outcomes.`)}
                className="ab-focus shrink-0 rounded-md border border-[#E8E5DD] px-2.5 py-1 text-[11.5px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
              >
                Ask
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DocumentsModule({ documents }: { documents: StudentDocument[] }) {
  const docTypes = new Set(documents.map((d) => d.doc_type));
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
            Documents
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.015em]">Your file</h2>
        </div>
        <p className="text-[12.5px] font-semibold text-[#6B655C]">
          {docTypes.size} / {DOC_SLOTS.length} uploaded
        </p>
      </header>

      <ul className="mt-5 divide-y divide-[#EFECE4]">
        {DOC_SLOTS.map((slot) => {
          const uploaded = docTypes.has(slot.id);
          const isOpen = open === slot.id;
          return (
            <li key={slot.id}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : slot.id)}
                className="ab-focus flex w-full items-center gap-3 py-3 text-left"
                aria-expanded={isOpen}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    uploaded ? "bg-[#0A6E45] text-white" : "border border-[#D1CABD] bg-white"
                  }`}
                  aria-hidden
                >
                  {uploaded && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                      <path d="M3 6.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-base" aria-hidden>{slot.icon}</span>
                <span className={`flex-1 truncate text-[13.5px] ${uploaded ? "text-[#1B1916]" : "text-[#6B655C]"}`}>
                  {slot.label}
                </span>
                <span className={`text-[10.5px] font-bold uppercase tracking-[0.04em] ${uploaded ? "text-[#0A6E45]" : "text-[#A8A29A]"}`}>
                  {uploaded ? "Done" : "Pending"}
                </span>
                <span className="text-[#8A847B]"><ChevronDown open={isOpen} /></span>
              </button>
              {isOpen && (
                <div className="mb-3 ml-8 rounded-md border border-[#EFECE4] bg-[#FAF9F6] p-3 text-[12.5px] leading-[1.65] text-[#6B655C]">
                  <p><span className="font-semibold text-[#1B1916]">What it is.</span> {slot.whatItIs}</p>
                  <p className="mt-1.5"><span className="font-semibold text-[#1B1916]">Where to get it.</span> {slot.whereToGet}</p>
                  <p className="mt-1.5"><span className="font-semibold text-[#1B1916]">How long.</span> {slot.howLong}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Link
        href="/chat?docs=open"
        className="ab-focus mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#12244a] py-2.5 text-[13px] font-bold text-white transition hover:bg-[#1F3D78]"
      >
        Upload next document <ChevronRight />
      </Link>
    </section>
  );
}

function CostModule({ student }: { student: StudentOut }) {
  const country = (student.target_countries?.[0] as University["country"]) ?? "UK";
  const studentPct = gpaToPercentage(student.gpa, student.expected_gpa);
  const field = inferField(student.preferred_field);
  const unis = pickUniversities(country, studentPct, field, 4);
  if (unis.length === 0) return null;

  // Average min + max tuition across the 4 picks
  const tuitionMin = Math.round(unis.reduce((a, u) => a + u.tuition_min, 0) / unis.length);
  const tuitionMax = Math.round(unis.reduce((a, u) => a + u.tuition_max, 0) / unis.length);
  const symbol = currencySymbol(unis[0].tuition_currency);

  // Indicative country-specific 9-month maintenance + visa fee (rough public figures)
  const maintenance: Record<University["country"], { amt: number; cur: string; visa: number }> = {
    UK: { amt: 13761, cur: "£", visa: 558 },
    Australia: { amt: 27000, cur: "A$", visa: 710 },
    Canada: { amt: 20635, cur: "C$", visa: 150 },
    USA: { amt: 22000, cur: "$", visa: 185 },
    Germany: { amt: 11904, cur: "€", visa: 75 },
  };
  const m = maintenance[country];

  return (
    <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
        Cost snapshot
      </p>
      <h2 className="mt-1 text-xl font-bold tracking-[-0.015em]">
        Rough annual budget · {country}
      </h2>
      <p className="mt-3 text-[13px] leading-[1.65] text-[#6B655C]">
        Indicative figures based on the universities recommended above.
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
        <div>
          <dt className="text-[11.5px] uppercase tracking-[0.04em] text-[#8A847B]">Tuition (avg)</dt>
          <dd className="mt-0.5 font-bold text-[#1B1916]">
            {symbol}
            {(tuitionMin / 1000).toFixed(0)}k–{(tuitionMax / 1000).toFixed(0)}k / yr
          </dd>
        </div>
        <div>
          <dt className="text-[11.5px] uppercase tracking-[0.04em] text-[#8A847B]">Living costs (9 mo)</dt>
          <dd className="mt-0.5 font-bold text-[#1B1916]">{m.cur}{m.amt.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-[11.5px] uppercase tracking-[0.04em] text-[#8A847B]">Visa fee</dt>
          <dd className="mt-0.5 font-bold text-[#1B1916]">{m.cur}{m.visa}</dd>
        </div>
        <div>
          <dt className="text-[11.5px] uppercase tracking-[0.04em] text-[#8A847B]">Flights (one-way)</dt>
          <dd className="mt-0.5 font-bold text-[#1B1916]">NPR 80k–130k</dd>
        </div>
      </dl>

      <p className="mt-4 rounded-md border border-[#F0D89A] bg-[#FBF4E6] px-3 py-2.5 text-[11.5px] leading-[1.55] text-[#6B5224]">
        These are starting points. Actual cost depends heavily on city, lifestyle, and the specific university. Always verify with the university's "Cost of attendance" page.
      </p>
    </section>
  );
}

function PickUpModule({ history }: { history: ChatTurn[] }) {
  if (history.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
          Recent chat
        </p>
        <p className="mt-3 text-[13px] leading-[1.65] text-[#6B655C]">
          No conversation yet. Start one now.
        </p>
        <Link
          href="/chat"
          className="ab-focus mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#12244a] px-4 py-2 text-[13px] font-bold text-white transition hover:bg-[#1F3D78]"
        >
          Open chat <ChevronRight />
        </Link>
      </section>
    );
  }
  const last = history.slice(-3);
  return (
    <section className="rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
        Pick up where you left off
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {last.map((t) => {
          const role = t.role === "user" ? "You" : t.role === "counselor" ? "Counsellor" : "Abroadly";
          const roleColor = t.role === "user" ? "text-[#1B1916]" : t.role === "counselor" ? "text-[#12244a]" : "text-[#0A6E45]";
          return (
            <li key={t.id} className="rounded-md border border-[#E8E5DD] bg-[#FAF9F6] p-3">
              <p className="flex items-center justify-between text-[11px]">
                <span className={`font-semibold ${roleColor}`}>{role}</span>
                <span className="text-[#8A847B]">{new Date(t.created_at).toLocaleDateString()}</span>
              </p>
              <p className="dash-clamp-2 mt-1 text-[12.5px] leading-[1.55] text-[#3F3A33]">
                {t.content}
              </p>
            </li>
          );
        })}
      </ul>
      <Link
        href="/chat"
        className="ab-focus mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#E8E5DD] bg-white py-2.5 text-[13px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
      >
        Continue the conversation <ChevronRight />
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
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  const onSendQuery = useCallback(
    (q: string) => {
      router.push(`/chat?send=${encodeURIComponent(q)}`);
    },
    [router],
  );

  const todoItems = useMemo(() => (student ? buildTodoList(student, documents) : []), [student, documents]);

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
          <h1 className="text-lg font-bold">Couldn't load your dashboard</h1>
          <p className="mt-2 text-sm leading-7 text-[#6B655C]">{error || "Profile not found."}</p>
          <Link
            href="/chat"
            className="ab-focus mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#12244a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1F3D78]"
          >
            Open chat <ChevronRight />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1B1916]">
      <header className="border-b border-[#E8E5DD] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="ab-focus flex items-center gap-3 rounded-md">
            <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-8 w-8 rounded-md" />
            <span className="text-base font-bold">Abroadly</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/chat"
              className="ab-focus rounded-md border border-[#E8E5DD] bg-white px-3 py-1.5 font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
            >
              Open chat
            </Link>
          </nav>
        </div>
      </header>

      <article className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 lg:pt-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column — primary work surface (2/3) */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <HeroModule student={student} docs={documents} />
            <TodoModule items={todoItems} studentId={student.id} onSendQuery={onSendQuery} />
            <TimelineModule />
            <UniversitiesModule student={student} onSendQuery={onSendQuery} />
            <CoursesModule student={student} onSendQuery={onSendQuery} />
          </div>

          {/* Right column — supporting (1/3) */}
          <div className="flex flex-col gap-6">
            <DocumentsModule documents={documents} />
            <CostModule student={student} />
            <PickUpModule history={history} />
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-[#8A847B]">
          Abroadly is a free guide — for binding decisions, always check the official university or government immigration portal.
        </p>
      </article>
    </main>
  );
}
