"use client";

/**
 * DashboardPanel — five-module command-center surface rendered inside /chat.
 *
 * Three responsive shapes:
 *   - lg+ collapsed: 56px vertical rail with section-icon shortcuts
 *   - lg+ expanded:  360px right-edge sibling panel (chat-main re-flows)
 *   - <lg:           full-screen drawer overlaying chat, with backdrop
 *
 * Zero backend calls — receives data via props. Generates "next actions" from
 * a pure heuristic engine, no LLM round-trip.
 */

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import type { StudentOut, StudentDocument, ChatTurn } from "@/lib/api";

/* ── Public API ───────────────────────────────────────────────────────── */

export interface DashboardPanelProps {
  student: StudentOut;
  documents: StudentDocument[];
  chatHistory: ChatTurn[];

  /** Drives both desktop expanded state and mobile drawer open-state. */
  open: boolean;
  /** When true and !isMobile, render rail only. Ignored on mobile. */
  collapsed: boolean;
  isMobile: boolean;

  onClose: () => void;
  onToggleCollapsed: () => void;
  onSendMessage: (query: string) => void;
  onOpenDocPanel: () => void;
  onScrollChatToBottom: () => void;
}

/* ── Heuristic action engine ──────────────────────────────────────────── */

interface NextAction {
  number: string;
  title: string;
  detail: string;
  query: string;
  emoji: string;
}

const CIRCLED = ["❶", "❷", "❸", "❹", "❺"];

export function computeNextActions(
  student: StudentOut,
  documents: StudentDocument[],
  chatTurnCount: number,
): NextAction[] {
  const docTypes = new Set(documents.map((d) => d.doc_type));
  const country = student.target_countries?.[0] ?? "the UK";
  const field = student.preferred_field ?? "your field";

  const candidates: Omit<NextAction, "number">[] = [];

  if (!student.profile_completed) {
    candidates.push({
      title: "Finish your study profile",
      detail:
        "Tell us your GPA, target countries, field, and goals — every answer below sharpens with this.",
      query: "Help me complete my study profile step by step.",
      emoji: "👤",
    });
  }

  if (!docTypes.has("grade_sheet")) {
    candidates.push({
      title: "Upload your NEB transcript",
      detail:
        "Original from your school first. For UK / Australia applications you'll need MoEST + MoFA attestation — allow ~2 weeks.",
      query: `Walk me through getting my NEB transcript attested for ${country}.`,
      emoji: "📊",
    });
  }

  if (!docTypes.has("citizenship")) {
    candidates.push({
      title: "Upload your citizenship",
      detail:
        "Clear scan of both sides of your Nepali citizenship certificate. Universities and visa officers ask for this.",
      query: "What identification documents do I need for studying abroad?",
      emoji: "🇳🇵",
    });
  }

  if (!docTypes.has("passport")) {
    candidates.push({
      title: "Have your passport ready",
      detail:
        "Must be valid for full course + 6 months. No passport yet? Apply at Department of Passports Nepal — 4-6 weeks.",
      query: `What passport requirements do I need for studying in ${country}?`,
      emoji: "🛂",
    });
  }

  if (!docTypes.has("ielts")) {
    candidates.push({
      title: "Book your IELTS test",
      detail:
        "British Council Kathmandu slots fill 4-6 weeks out. Most UK universities want 6.5+ overall. ₹27,000-30,000.",
      query: `Help me decide between IELTS and PTE for ${country}.`,
      emoji: "📝",
    });
  }

  if (!docTypes.has("financial")) {
    candidates.push({
      title: "Start preparing financial proof",
      detail:
        "UK needs £13,761 (London) or £10,539 (outside London) held for 28 days. Parents' account works with a consent letter.",
      query: `Help me plan financial proof for a ${country} student visa.`,
      emoji: "🏦",
    });
  }

  if (!docTypes.has("sop") && (student.target_countries?.length ?? 0) > 0) {
    candidates.push({
      title: "Draft your statement of purpose",
      detail:
        "500-1,000 words per university. Start with your why, your relevant background, and what you plan to do after.",
      query: `Help me outline my SOP for studying ${field} in ${country}.`,
      emoji: "✍️",
    });
  }

  if (!docTypes.has("recommendation")) {
    candidates.push({
      title: "Line up two recommendation letters",
      detail:
        "Pick teachers who taught you in the last two years and know your work. Give them 4+ weeks to write.",
      query: `Help me draft an LOR request for a ${field} teacher.`,
      emoji: "📨",
    });
  }

  if (chatTurnCount < 5 && student.profile_completed) {
    candidates.push({
      title: "Shortlist 5 universities",
      detail:
        "Aim for 2 reach + 2 match + 1 safety based on your GPA and field. Abroadly can suggest specific names.",
      query: `Suggest 5 ${country} universities for ${field} that fit my profile.`,
      emoji: "🎓",
    });
  }

  return candidates.slice(0, 5).map((a, i) => ({ ...a, number: CIRCLED[i] }));
}

/* ── Compass heuristics ───────────────────────────────────────────────── */

function compassSentence(
  student: StudentOut,
  docs: StudentDocument[],
  chatTurnCount: number,
): string {
  const docTypes = new Set(docs.map((d) => d.doc_type));
  const hasIelts = docTypes.has("ielts");
  if (!student.profile_completed) return "Let's finish your study profile — every answer below depends on it.";
  if (docs.length === 0) return "Profile is set. Time to start gathering your documents.";
  if (docs.length < 3) return "You've started uploading documents. Aim for 5 of 8 before applying.";
  if (docs.length >= 3 && !hasIelts) return "Documents are coming together. Next focus: book your English test.";
  if (hasIelts && chatTurnCount < 5) return "Documents look solid. Let's start picking universities.";
  return "You're well into your study-abroad journey. Keep the momentum going.";
}

/**
 * Next sensible Sept intake — at least 4 months from today.
 * Used as the "target intake" anchor in the compass line.
 */
function nextSensibleIntake(): { date: Date; label: string; monthsOut: number } {
  const now = new Date();
  let year = now.getFullYear();
  // If September of this year is too close (< 4 months), bump to next year.
  const thisSept = new Date(year, 8, 1); // month index 8 = September
  const monthsToThisSept = (thisSept.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4);
  if (monthsToThisSept < 4) year += 1;
  const date = new Date(year, 8, 1);
  const monthsOut = Math.max(0, Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
  return { date, label: `Sept ${year}`, monthsOut };
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Rail icons ───────────────────────────────────────────────────────── */

function ChevronIcon({ pointingLeft }: { pointingLeft: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path
        d={pointingLeft ? "M10 4l-4 4 4 4" : "M6 4l4 4-4 4"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13 7l-3 3-3 3 3-3 3-3z" fill="currentColor" />
    </svg>
  );
}
function CheckListIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M2.5 5.5a2 2 0 0 1 2-2h3.17a2 2 0 0 1 1.42.59l.82.82a2 2 0 0 0 1.42.59h4.17a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 17c.5-3.5 3.5-5 7-5s6.5 1.5 7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5l-4 3v-3H5a2 2 0 0 1-2-2V5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

/* ── Rail (lg+ collapsed) ─────────────────────────────────────────────── */

interface RailButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

function CollapsedRail({
  buttons,
  onExpand,
}: {
  buttons: RailButton[];
  onExpand: (sectionId?: string) => void;
}) {
  return (
    <aside
      className="hidden h-full w-14 shrink-0 flex-col items-center border-l border-[#E8E5DD] bg-[#F4F2EC] py-3 lg:flex"
      aria-label="Dashboard rail"
    >
      <button
        type="button"
        onClick={() => onExpand()}
        className="ab-focus mb-3 flex h-9 w-9 items-center justify-center rounded-md text-[#6B655C] transition hover:bg-white hover:text-[#1B1916]"
        aria-label="Expand dashboard"
        title="Expand dashboard"
      >
        <ChevronIcon pointingLeft />
      </button>
      <div className="h-px w-6 bg-[#E8E5DD]" />
      <nav className="mt-3 flex flex-col gap-1.5">
        {buttons.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onExpand(b.id)}
            className="ab-focus relative flex h-9 w-9 items-center justify-center rounded-md text-[#6B655C] transition hover:bg-white hover:text-[#1B1916]"
            aria-label={b.label}
            title={b.label}
          >
            {b.icon}
            {b.badge && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0A6E45] px-1 text-[9px] font-bold leading-none text-white">
                {b.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* ── The main panel content (shared between desktop expanded + mobile drawer) ── */

function PanelBody({
  student,
  documents,
  chatHistory,
  onSendMessage,
  onOpenDocPanel,
  onScrollChatToBottom,
  onClose,
}: Pick<
  DashboardPanelProps,
  "student" | "documents" | "chatHistory" | "onSendMessage" | "onOpenDocPanel" | "onScrollChatToBottom" | "onClose"
>) {
  const userTurnCount = chatHistory.filter((t) => t.role === "user").length;
  const actions = useMemo(
    () => computeNextActions(student, documents, userTurnCount),
    [student, documents, userTurnCount],
  );
  const compass = compassSentence(student, documents, userTurnCount);
  const intake = nextSensibleIntake();

  const country = student.target_countries?.[0] ?? "your destination";
  const docTypes = new Set(documents.map((d) => d.doc_type));
  const uploadedCount = docTypes.size;
  const firstName = student.full_name?.split(" ")[0] ?? "you";

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#FAF9F6]">
      {/* ── Module 1: Compass ─────────────────────────────────── */}
      <section id="dash-compass" className="px-5 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
          Where you are now
        </p>
        <p className="mt-3 text-[15px] font-semibold leading-[1.45] tracking-[-0.005em] text-[#1B1916]">
          {compass}
        </p>
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-[#6B655C]">
          <span aria-hidden>📍</span>
          <span>
            <span className="font-semibold text-[#1B1916]">{country}</span> ·{" "}
            <span className="font-semibold text-[#1B1916]">{intake.label}</span> intake · ~{intake.monthsOut} months out
          </span>
        </p>
      </section>

      {/* ── Module 2: This Week ────────────────────────────────── */}
      <section id="dash-actions" className="mt-7 border-t border-[#EFECE4] px-5 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
            This week
          </p>
          <span className="text-[11px] text-[#8A847B]">{actions.length} for {firstName}</span>
        </div>
        {actions.length === 0 ? (
          <p className="mt-3 text-[13px] leading-[1.65] text-[#6B655C]">
            You're caught up on the basics. Keep using the chat to refine your university shortlist
            and SOP.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {actions.map((a) => (
              <li
                key={a.title}
                className="rounded-xl border border-[#E8E5DD] bg-white p-4 shadow-[var(--shadow-xs)]"
              >
                <div className="flex items-start gap-2">
                  <span className="text-base font-bold text-[#0A6E45]" aria-hidden>
                    {a.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold leading-snug tracking-[-0.01em] text-[#1B1916]">
                      <span className="mr-1" aria-hidden>
                        {a.emoji}
                      </span>
                      {a.title}
                    </p>
                    <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#6B655C]">{a.detail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSendMessage(a.query);
                    onClose();
                  }}
                  className="ab-focus mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#E8E5DD] bg-[#FAF9F6] py-2 text-[12.5px] font-semibold text-[#1B1916] transition hover:border-[#A8A29A] hover:bg-[#F4F2EC]"
                >
                  Help me with this <ArrowRightIcon />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Module 3: Your File ────────────────────────────────── */}
      <section id="dash-file" className="mt-7 border-t border-[#EFECE4] px-5 pt-6">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
            Your file
          </p>
          <span className="text-[11px] font-semibold text-[#6B655C]">
            {uploadedCount} / {DOC_SLOTS.length} uploaded
          </span>
        </div>
        <ul className="mt-3 divide-y divide-[#EFECE4]">
          {DOC_SLOTS.map((s) => {
            const uploaded = docTypes.has(s.id);
            return (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                    uploaded ? "bg-[#0A6E45] text-white" : "border border-[#D1CABD] bg-white"
                  }`}
                  aria-hidden
                >
                  {uploaded && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                      <path d="M3 6.5l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={`flex-1 truncate text-[13px] ${uploaded ? "text-[#1B1916]" : "text-[#6B655C]"}`}>
                  {s.label}
                </span>
                <span className={`text-[10.5px] font-semibold uppercase tracking-[0.04em] ${uploaded ? "text-[#0A6E45]" : "text-[#A8A29A]"}`}>
                  {uploaded ? "Done" : "Pending"}
                </span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            onOpenDocPanel();
            onClose();
          }}
          className="ab-focus mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#12244a] py-2.5 text-[13px] font-bold text-white transition hover:bg-[#1F3D78]"
        >
          Upload next document <ArrowRightIcon />
        </button>
      </section>

      {/* ── Module 4: What we know ─────────────────────────────── */}
      <section id="dash-profile" className="mt-7 border-t border-[#EFECE4] px-5 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
          What we know about you
        </p>
        <p className="mt-3 text-[13px] leading-[1.7] text-[#1B1916]">
          {renderProfileSummary(student)}
        </p>
        {(() => {
          const prompt = profileGapPrompt(student);
          if (!prompt) return null;
          return (
            <p className="mt-3 rounded-md border border-[#F0D89A] bg-[#FBF4E6] px-3 py-2 text-[12px] leading-[1.55] text-[#6B5224]">
              <span aria-hidden className="mr-1">⚠️</span>
              {prompt}
            </p>
          );
        })()}
        <Link
          href="/onboarding/details"
          className="ab-focus mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#365CC4] transition hover:text-[#1F3D78]"
        >
          Edit profile <ArrowRightIcon />
        </Link>
      </section>

      {/* ── Module 5: Pick up where you left off ───────────────── */}
      <section id="dash-recent" className="mt-7 border-t border-[#EFECE4] px-5 pb-6 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0A6E45]">
          Pick up where you left off
        </p>
        {chatHistory.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[#E8E5DD] bg-white p-4">
            <p className="text-[13px] leading-[1.6] text-[#6B655C]">
              No conversation yet. Use the question launcher on the chat to get started.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="ab-focus mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0A6E45] transition hover:text-[#0a5c39]"
            >
              Open the launcher <ArrowRightIcon />
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-3 flex flex-col gap-2.5">
              {chatHistory.slice(-3).map((t) => {
                const roleLabel = t.role === "user" ? "You" : t.role === "counselor" ? "Counsellor" : "Abroadly";
                const roleColor =
                  t.role === "user"
                    ? "text-[#1B1916]"
                    : t.role === "counselor"
                    ? "text-[#12244a]"
                    : "text-[#0A6E45]";
                return (
                  <article
                    key={t.id}
                    className="rounded-md border border-[#E8E5DD] bg-white p-3"
                  >
                    <p className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${roleColor}`}>{roleLabel}</span>
                      <span className="text-[#8A847B]">{relativeTime(t.created_at)}</span>
                    </p>
                    <p className="dash-clamp-2 mt-1.5 text-[12.5px] leading-[1.55] text-[#3F3A33]">
                      {t.content}
                    </p>
                  </article>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => {
                onScrollChatToBottom();
                onClose();
              }}
              className="ab-focus mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#E8E5DD] bg-white py-2.5 text-[13px] font-semibold text-[#1B1916] transition hover:border-[#A8A29A] hover:bg-[#F4F2EC]"
            >
              Continue the conversation <ArrowRightIcon />
            </button>
          </>
        )}
      </section>
    </div>
  );
}

/* ── Shared structures ────────────────────────────────────────────────── */

const DOC_SLOTS = [
  { id: "grade_sheet", label: "Grade Sheet / Transcript" },
  { id: "citizenship", label: "Citizenship" },
  { id: "passport", label: "Passport" },
  { id: "sop", label: "Statement of Purpose" },
  { id: "recommendation", label: "Recommendation Letter" },
  { id: "financial", label: "Financial Documents" },
  { id: "ielts", label: "IELTS / PTE / TOEFL" },
  { id: "other", label: "Other Document" },
];

function renderProfileSummary(s: StudentOut): string {
  const parts: string[] = [];
  if (s.target_countries?.length) {
    parts.push(
      `You're targeting **${s.target_countries.join(", ")}**${
        s.preferred_field ? ` for **${s.preferred_field}**` : ""
      }.`,
    );
  } else {
    parts.push(`You haven't picked a target country yet.`);
  }
  if (s.education_level) {
    const label =
      s.education_level === "plus_two" ? "+2 (Class 12)"
      : s.education_level === "a_levels" ? "A-Levels"
      : s.education_level === "bba" ? "BBA"
      : s.education_level === "bachelors" ? "Bachelors"
      : "your current level";
    const gpaBit = s.gpa
      ? ` (GPA **${s.gpa}**)`
      : s.expected_gpa
      ? ` (expected GPA **${s.expected_gpa}**)`
      : "";
    parts.push(`Currently at **${label}**${gpaBit}.`);
  }
  if (s.location) parts.push(`Based in **${s.location}**.`);
  // Render markdown bolds as <strong> via dangerouslySetInnerHTML would be a pain;
  // strip the ** markers and accept slightly less rich rendering.
  return parts.join(" ").replace(/\*\*/g, "");
}

function profileGapPrompt(s: StudentOut): string | null {
  if (!s.gpa && !s.expected_gpa)
    return "Tell us your GPA (or expected GPA) to sharpen the eligibility check.";
  if (!s.preferred_field)
    return "Add your preferred field so we can recommend specific courses.";
  if (!s.target_countries?.length)
    return "Pick a target country so we can give country-specific answers.";
  if (!s.location)
    return "Add your city so we can flag location-specific tips (e.g. nearest IELTS centre).";
  return null;
}

/* ── Top-level component ──────────────────────────────────────────────── */

export function DashboardPanel(props: DashboardPanelProps) {
  const { open, collapsed, isMobile, onClose } = props;
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Escape closes mobile drawer
  useEffect(() => {
    if (!isMobile || !open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isMobile, open, onClose]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (!isMobile) return;
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isMobile, open]);

  // Compute rail button data once
  const docTypes = new Set(props.documents.map((d) => d.doc_type));
  const railButtons: RailButton[] = useMemo(
    () => [
      { id: "dash-compass", label: "Where you are now", icon: <CompassIcon /> },
      {
        id: "dash-actions",
        label: "This week",
        icon: <CheckListIcon />,
        badge: String(computeNextActions(props.student, props.documents, props.chatHistory.filter((t) => t.role === "user").length).length || ""),
      },
      {
        id: "dash-file",
        label: "Your file",
        icon: <FolderIcon />,
        badge: `${docTypes.size}/${DOC_SLOTS.length}`,
      },
      { id: "dash-profile", label: "What we know about you", icon: <ProfileIcon /> },
      { id: "dash-recent", label: "Pick up where you left off", icon: <ChatBubbleIcon /> },
    ],
    [props.student, props.documents, props.chatHistory],
  );

  const onRailExpand = (sectionId?: string) => {
    props.onToggleCollapsed(); // expand
    if (sectionId) {
      // wait a frame for layout then scroll the section into view
      requestAnimationFrame(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  /* ── Mobile drawer ────────────────────────────────────────── */
  if (isMobile) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close dashboard"
          onClick={onClose}
          className="dash-backdrop absolute inset-0 cursor-default"
        />
        <div
          ref={drawerRef}
          className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#FAF9F6] shadow-[var(--shadow-lg)]"
          style={{ animation: "dash-slide-in 280ms cubic-bezier(0.32, 0.72, 0, 1)" }}
        >
          <header className="flex items-center justify-between border-b border-[#E8E5DD] bg-white px-4 py-3">
            <p className="text-[13px] font-bold tracking-[-0.01em] text-[#1B1916]">Dashboard</p>
            <button
              type="button"
              onClick={onClose}
              className="ab-focus flex h-8 w-8 items-center justify-center rounded-md text-[#6B655C] transition hover:bg-[#F4F2EC] hover:text-[#1B1916]"
              aria-label="Close dashboard"
            >
              <CloseIcon />
            </button>
          </header>
          <PanelBody {...props} />
        </div>
      </div>
    );
  }

  /* ── Desktop: rail when collapsed, expanded panel when not ── */
  if (!open) return null;
  if (collapsed) {
    return <CollapsedRail buttons={railButtons} onExpand={onRailExpand} />;
  }
  return (
    <aside
      className="hidden h-full w-[360px] shrink-0 flex-col border-l border-[#E8E5DD] bg-[#FAF9F6] lg:flex"
      aria-label="Dashboard"
      style={{ animation: "dash-fade-in 220ms ease-out" }}
    >
      <header className="flex items-center justify-between border-b border-[#E8E5DD] bg-white px-5 py-3">
        <p className="text-[13px] font-bold tracking-[-0.01em] text-[#1B1916]">Dashboard</p>
        <button
          type="button"
          onClick={props.onToggleCollapsed}
          className="ab-focus flex h-8 w-8 items-center justify-center rounded-md text-[#6B655C] transition hover:bg-[#F4F2EC] hover:text-[#1B1916]"
          aria-label="Collapse dashboard"
          title="Collapse"
        >
          <ChevronIcon pointingLeft={false} />
        </button>
      </header>
      <PanelBody {...props} />
    </aside>
  );
}
