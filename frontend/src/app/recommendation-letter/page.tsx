"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getStudent, googleLoginUrl } from "@/lib/api";

/* ------------------------------------------------------------------ *
 * Recommendation-letter generator
 * Public tool: a student fills a few details, we compose a clean,
 * modern letter client-side (no backend), they can copy / print it,
 * and "Save & sign in" stashes it so it shows up on their dashboard.
 * ------------------------------------------------------------------ */

const LOR_STORAGE_KEY = "abroadly_lor_letters";

interface LorForm {
  studentName: string;
  program: string;
  university: string;
  recommenderName: string;
  recommenderTitle: string;
  institution: string;
  relationship: string;
  strengths: string[];
  achievement: string;
}

interface SavedLetter extends LorForm {
  id: string;
  createdAt: string;
}

const EMPTY_FORM: LorForm = {
  studentName: "",
  program: "",
  university: "",
  recommenderName: "",
  recommenderTitle: "",
  institution: "",
  relationship: "",
  strengths: [],
  achievement: "",
};

const STRENGTHS: { id: string; label: string; phrase: string }[] = [
  { id: "analytical", label: "Analytical", phrase: "a sharp analytical mind and a gift for breaking complex problems into workable parts" },
  { id: "diligent", label: "Hard-working", phrase: "an exceptional work ethic and a consistent eye for detail" },
  { id: "leadership", label: "Leadership", phrase: "natural leadership and the confidence to rally a team around a shared goal" },
  { id: "creative", label: "Creative", phrase: "genuine creativity and a willingness to approach problems from unexpected angles" },
  { id: "collaborative", label: "Collaborative", phrase: "a collaborative spirit that makes them a steadying presence in any group" },
  { id: "research", label: "Research-minded", phrase: "real intellectual curiosity and a methodical approach to independent research" },
  { id: "communication", label: "Communicator", phrase: "clear, articulate communication in both writing and discussion" },
  { id: "problem", label: "Problem-solver", phrase: "strong problem-solving instincts and quiet persistence in the face of difficulty" },
];

const MAX_STRENGTHS = 3;

function joinPhrases(arr: string[]): string {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

function firstNameOf(name: string): string {
  const n = name.trim().split(/\s+/)[0];
  return n || "the candidate";
}

interface BuiltLetter {
  date: string;
  recommenderName: string;
  recommenderTitle: string;
  institution: string;
  salutation: string;
  paragraphs: string[];
  signOff: string[];
}

function buildLetter(f: LorForm): BuiltLetter {
  const student = f.studentName.trim() || "[Student name]";
  const first = firstNameOf(f.studentName);
  const program = f.program.trim() || "the graduate program";
  const atUni = f.university.trim() ? ` at ${f.university.trim()}` : "";
  const recName = f.recommenderName.trim() || "[Recommender name]";
  const recTitle = f.recommenderTitle.trim() || "[Title / position]";
  const institution = f.institution.trim() || "[Institution]";
  const relationship = f.relationship.trim() || `as their instructor at ${institution}`;

  const chosen = STRENGTHS.filter((s) => f.strengths.includes(s.id)).map((s) => s.phrase);
  const strengthsSentence =
    chosen.length > 0
      ? `Throughout this time, ${first} has consistently shown ${joinPhrases(chosen)}.`
      : `Throughout this time, ${first} has consistently impressed me with both character and capability.`;

  const intro =
    `It is my sincere pleasure to recommend ${student} for admission to ${program}${atUni}. ` +
    `I am ${recName}, ${recTitle} at ${institution}, and I have had the privilege of knowing ${first} ${relationship}.`;

  const strengthsPara =
    `${strengthsSentence} These qualities set ${first} apart from peers and make them, in my view, ` +
    `exceptionally well-prepared for the demands of study abroad.`;

  const achievement = f.achievement.trim();
  const achievementPara = achievement
    ? `One example stands out in particular. ${achievement} It reflects exactly the kind of initiative and rigour that ${first} brings to everything they take on.`
    : `Time and again, ${first} has taken on responsibility beyond what was asked, and delivered work of a standard I would expect from far more experienced students.`;

  const closing =
    `I recommend ${student} for admission without reservation, and I am confident they will be a genuine asset to your institution. ` +
    `Please do not hesitate to contact me should you require any further information.`;

  return {
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    recommenderName: recName,
    recommenderTitle: recTitle,
    institution,
    salutation: "Dear Admissions Committee,",
    paragraphs: [intro, strengthsPara, achievementPara, closing],
    signOff: ["Sincerely,", recName, recTitle, institution],
  };
}

function letterToPlainText(b: BuiltLetter): string {
  return [
    b.date,
    "",
    b.salutation,
    "",
    b.paragraphs.join("\n\n"),
    "",
    b.signOff[0],
    "",
    b.signOff.slice(1).join("\n"),
  ].join("\n");
}

/* ---- small field primitives ---- */
function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-[#3F3A33]">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ab-focus w-full rounded-[9px] border border-[#E8E5DD] bg-white px-3.5 py-2.5 text-[13.5px] text-[#1B1916] placeholder:text-[#B7B1A6] transition focus:border-[#0A6E45]"
      />
      {hint && <span className="mt-1 block text-[11px] text-[#8A847B]">{hint}</span>}
    </label>
  );
}

export default function RecommendationLetterPage() {
  const [form, setForm] = useState<LorForm>(EMPTY_FORM);
  const [authed, setAuthed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = useCallback(<K extends keyof LorForm>(key: K, value: LorForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const toggleStrength = useCallback((id: string) => {
    setForm((prev) => {
      const has = prev.strengths.includes(id);
      if (has) return { ...prev, strengths: prev.strengths.filter((s) => s !== id) };
      if (prev.strengths.length >= MAX_STRENGTHS) return prev;
      return { ...prev, strengths: [...prev.strengths, id] };
    });
    setSaved(false);
  }, []);

  /* Prefill the student's own name / field if they're already signed in. */
  useEffect(() => {
    const sid = typeof window !== "undefined" ? localStorage.getItem("abroadly_student_id") : null;
    if (!sid) return;
    setAuthed(true);
    getStudent(sid)
      .then((s) => {
        setForm((prev) => ({
          ...prev,
          studentName: prev.studentName || s.full_name || "",
          program: prev.program || s.preferred_field || "",
          university: prev.university || (s.target_countries?.[0] ? `a university in ${s.target_countries[0]}` : ""),
        }));
      })
      .catch(() => {});
  }, []);

  const letter = useMemo(() => buildLetter(form), [form]);

  const persist = useCallback((): SavedLetter => {
    const entry: SavedLetter = { ...form, id: `lor_${Date.now()}`, createdAt: new Date().toISOString() };
    try {
      const raw = localStorage.getItem(LOR_STORAGE_KEY);
      const list: SavedLetter[] = raw ? JSON.parse(raw) : [];
      list.unshift(entry);
      localStorage.setItem(LOR_STORAGE_KEY, JSON.stringify(list.slice(0, 25)));
    } catch {
      /* ignore quota / parse errors */
    }
    return entry;
  }, [form]);

  const onSaveAndContinue = useCallback(() => {
    persist();
    setSaved(true);
    if (authed) return; // already signed in — it'll show on the dashboard
    window.location.href = googleLoginUrl();
  }, [persist, authed]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(letterToPlainText(letter));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  }, [letter]);

  const onPrint = useCallback(() => window.print(), []);

  const canSave = form.studentName.trim() && form.recommenderName.trim();

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1B1916]">
      {/* top bar */}
      <header className="lor-noprint sticky top-0 z-20 border-b border-[#E8E5DD] bg-[#FAF9F6]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#0A6E45] text-[13px] font-black text-white">A</span>
            <span className="text-[15px] font-extrabold tracking-[-0.02em]">Abroadly</span>
          </Link>
          <Link
            href={authed ? "/dashboard" : "/"}
            className="ab-focus rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-[#6B655C] transition hover:text-[#1B1916]"
          >
            {authed ? "Dashboard" : "Home"} →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-24 pt-9">
        {/* heading */}
        <div className="lor-noprint mb-8 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E5DD] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[#0A6E45]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0A6E45]" />
            Free tool
          </span>
          <h1 className="mt-3 text-[28px] font-extrabold leading-[1.15] tracking-[-0.025em] sm:text-[33px]">
            Recommendation letter generator
          </h1>
          <p className="mt-2.5 text-[14.5px] leading-[1.6] text-[#6B655C]">
            Give your teacher a clean first draft. Fill in a few details and we&apos;ll compose a modern,
            ready-to-edit letter you can copy, print, or save to your dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          {/* ---------------- FORM ---------------- */}
          <section className="lor-noprint">
            <div className="space-y-6 rounded-2xl border border-[#E8E5DD] bg-white p-5 shadow-[0_1px_2px_rgba(27,25,22,0.04)] sm:p-6">
              <div>
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#8A847B]">About you</p>
                <div className="space-y-3.5">
                  <Field label="Your full name" value={form.studentName} onChange={(v) => set("studentName", v)} placeholder="Sita Sharma" />
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Field label="Program you're applying for" value={form.program} onChange={(v) => set("program", v)} placeholder="MSc Computer Science" />
                    <Field label="Target university (optional)" value={form.university} onChange={(v) => set("university", v)} placeholder="University of Melbourne" />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#EFECE4] pt-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.05em] text-[#8A847B]">Your recommender</p>
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Field label="Recommender's name" value={form.recommenderName} onChange={(v) => set("recommenderName", v)} placeholder="Dr. Ramesh Koirala" />
                    <Field label="Their title / role" value={form.recommenderTitle} onChange={(v) => set("recommenderTitle", v)} placeholder="Associate Professor" />
                  </div>
                  <Field label="Their institution" value={form.institution} onChange={(v) => set("institution", v)} placeholder="Tribhuvan University" />
                  <Field
                    label="How they know you"
                    value={form.relationship}
                    onChange={(v) => set("relationship", v)}
                    placeholder="who taught me Database Systems for two years"
                    hint="Finish the sentence: “I have known them …”"
                  />
                </div>
              </div>

              <div className="border-t border-[#EFECE4] pt-5">
                <div className="mb-2.5 flex items-baseline justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#8A847B]">Your strengths</p>
                  <span className="text-[11px] font-medium text-[#8A847B]">{form.strengths.length}/{MAX_STRENGTHS}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STRENGTHS.map((s) => {
                    const active = form.strengths.includes(s.id);
                    const disabled = !active && form.strengths.length >= MAX_STRENGTHS;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStrength(s.id)}
                        disabled={disabled}
                        className={`ab-focus rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
                          active
                            ? "border-[#0A6E45] bg-[#0A6E45] text-white"
                            : disabled
                              ? "cursor-not-allowed border-[#EFECE4] bg-[#FAF9F6] text-[#C2BCB1]"
                              : "border-[#E8E5DD] bg-white text-[#3F3A33] hover:border-[#0A6E45] hover:text-[#0A6E45]"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-[#EFECE4] pt-5">
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] font-semibold text-[#3F3A33]">A standout moment or piece of work</span>
                  <textarea
                    value={form.achievement}
                    onChange={(e) => set("achievement", e.target.value)}
                    rows={4}
                    placeholder="e.g. She led a four-person team building a flood-alert app for her district, and presented it at the national science fair."
                    className="ab-focus w-full resize-y rounded-[9px] border border-[#E8E5DD] bg-white px-3.5 py-2.5 text-[13.5px] leading-[1.6] text-[#1B1916] placeholder:text-[#B7B1A6] transition focus:border-[#0A6E45]"
                  />
                  <span className="mt-1 block text-[11px] text-[#8A847B]">Write it however you like — we&apos;ll frame it formally in the letter.</span>
                </label>
              </div>
            </div>
          </section>

          {/* ---------------- PREVIEW ---------------- */}
          <section>
            <div className="lg:sticky lg:top-20">
              <div className="lor-noprint mb-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onSaveAndContinue}
                  disabled={!canSave}
                  className={`ab-focus inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-[12.5px] font-bold text-white transition ${
                    canSave ? "bg-[#0A6E45] hover:bg-[#075B39]" : "cursor-not-allowed bg-[#BFD6CB]"
                  }`}
                >
                  {authed ? (saved ? "Saved to dashboard ✓" : "Save to dashboard") : "Save & sign in to keep it"}
                </button>
                <button
                  type="button"
                  onClick={onCopy}
                  className="ab-focus inline-flex min-h-10 items-center gap-2 rounded-md border border-[#E8E5DD] bg-white px-3.5 text-[12.5px] font-semibold text-[#3F3A33] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
                >
                  {copied ? "Copied ✓" : "Copy text"}
                </button>
                <button
                  type="button"
                  onClick={onPrint}
                  className="ab-focus inline-flex min-h-10 items-center gap-2 rounded-md border border-[#E8E5DD] bg-white px-3.5 text-[12.5px] font-semibold text-[#3F3A33] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
                >
                  Print / PDF
                </button>
              </div>

              {/* the letter sheet */}
              <article id="lor-sheet" className="overflow-hidden rounded-2xl border border-[#E8E5DD] bg-white shadow-[0_10px_40px_-12px_rgba(27,25,22,0.16)]">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#0A6E45] to-[#12244a]" />
                <div className="px-7 py-8 sm:px-9 sm:py-10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[15px] font-extrabold tracking-[-0.01em] text-[#1B1916]">{letter.recommenderName}</p>
                      <p className="mt-0.5 text-[12.5px] text-[#6B655C]">{letter.recommenderTitle}</p>
                      <p className="text-[12.5px] text-[#6B655C]">{letter.institution}</p>
                    </div>
                    <p className="shrink-0 pt-1 text-[12px] text-[#8A847B]">{letter.date}</p>
                  </div>

                  <div className="my-6 h-px w-full bg-[#EFECE4]" />

                  <p className="text-[14px] font-semibold text-[#1B1916]">{letter.salutation}</p>

                  <div className="mt-4 space-y-4">
                    {letter.paragraphs.map((p, i) => (
                      <p key={i} className="text-[14px] leading-[1.75] text-[#2C2822]">
                        {p}
                      </p>
                    ))}
                  </div>

                  <div className="mt-7 space-y-0.5">
                    <p className="text-[14px] text-[#2C2822]">{letter.signOff[0]}</p>
                    <p className="pt-3 text-[14px] font-bold text-[#1B1916]">{letter.signOff[1]}</p>
                    <p className="text-[12.5px] text-[#6B655C]">{letter.signOff[2]}</p>
                    <p className="text-[12.5px] text-[#6B655C]">{letter.signOff[3]}</p>
                  </div>
                </div>
              </article>

              <p className="lor-noprint mt-3 text-[11.5px] leading-[1.55] text-[#8A847B]">
                This is a starting draft. Always review it with your recommender and let them make it their own —
                a genuine letter in their voice carries far more weight.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* print: show only the letter sheet, clean page */}
      <style jsx global>{`
        @media print {
          .lor-noprint {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
          #lor-sheet {
            border: none !important;
            box-shadow: none !important;
          }
          @page {
            margin: 18mm;
          }
        }
      `}</style>
    </main>
  );
}
