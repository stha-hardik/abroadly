"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  completeGoogleProfile,
  getCurrentStudent,
  type EducationLevel,
  type StudentOut,
} from "@/lib/api";
import { GoogleSignInButton } from "@/app/google-sign-in-button";
import { NavBar } from "@/app/nav-bar";
import { SiteFooter } from "@/app/site-footer";

type LoadState = "loading" | "ready" | "signed_out";

interface ProfileForm {
  full_name: string;
  phone: string;
  location: string;
  education_level: EducationLevel;
  gpa: string;
  expected_gpa: string;
  preferred_field: string;
  target_countries: string[];
  goals: string;
}

const EMPTY_FORM: ProfileForm = {
  full_name: "",
  phone: "",
  location: "",
  education_level: "plus_two",
  gpa: "",
  expected_gpa: "",
  preferred_field: "",
  target_countries: [],
  goals: "",
};

const EDUCATION_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "plus_two", label: "+2 / Class 12" },
  { value: "a_levels", label: "A-Levels" },
  { value: "bba", label: "BBA" },
  { value: "bachelors", label: "Bachelors" },
  { value: "other", label: "Other" },
];

const COUNTRY_OPTIONS = [
  "United Kingdom",
  "Australia",
  "Canada",
  "United States",
  "New Zealand",
  "Germany",
  "Finland",
  "Japan",
  "South Korea",
  "Ireland",
];

const WHY_ITEMS: { title: string; body: string }[] = [
  {
    title: "Tailored answers",
    body: "GPA and expected GPA let Abroadly tell you which programs are realistic — not generic advice.",
  },
  {
    title: "Country-specific guidance",
    body: "Visa, cost, and document answers change a lot by country. Picking yours unlocks the right details.",
  },
  {
    title: "Asked once",
    body: "Saved to your Google-verified email, reused on every future answer. You'll never re-enter this.",
  },
];

function optionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/* ── Shared form-control styling (Notion-style: hairline border, emerald focus,
 *    44px height, generous padding). Used by every input/textarea below. */
const INPUT_CLS =
  "w-full rounded-lg border border-[var(--ab-line)] bg-white px-3.5 py-2.5 text-[14px] font-medium text-[var(--ab-ink)] placeholder:text-[#A8A296] transition focus:border-[var(--ab-brand)] focus:outline-none focus:ring-4 focus:ring-[rgba(10,110,69,0.12)]";
const LABEL_CLS = "mb-1.5 block text-[13px] font-semibold text-[var(--ab-ink)]";
const HELP_CLS = "mt-1.5 text-[11.5px] text-[var(--ab-muted-soft)]";
const ERROR_CLS = "mt-1.5 text-[12px] font-semibold text-[#B91722]";

export default function ProfileDetailsPage() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [student, setStudent] = useState<StudentOut | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentStudent()
      .then((current) => {
        if (cancelled) return;
        localStorage.setItem("abroadly_student_id", current.id);
        if (current.profile_completed && current.phone?.trim()) {
          router.replace("/chat");
          return;
        }
        setStudent(current);
        setForm({
          full_name: current.full_name || "",
          phone: current.phone || "",
          location: current.location || "",
          education_level: current.education_level || "plus_two",
          gpa: current.gpa == null ? "" : String(current.gpa),
          expected_gpa: current.expected_gpa == null ? "" : String(current.expected_gpa),
          preferred_field: current.preferred_field || "",
          target_countries: current.target_countries || [],
          goals: current.goals || "",
        });
        // One-shot pre-fill from the landing hero ("I want to study X in Y").
        try {
          const rawIntent = localStorage.getItem("abroadly_intent");
          if (rawIntent) {
            const intent = JSON.parse(rawIntent) as { degree?: string; country?: string };
            setForm((prev) => ({
              ...prev,
              target_countries:
                prev.target_countries.length > 0
                  ? prev.target_countries
                  : intent.country
                    ? [intent.country]
                    : prev.target_countries,
              goals: prev.goals || (intent.degree ? `Aiming for a ${intent.degree} abroad.` : prev.goals),
            }));
            localStorage.removeItem("abroadly_intent");
          }
        } catch {
          /* ignore malformed intent */
        }
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("signed_out");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const sectionsComplete = useMemo(() => {
    return [
      form.full_name.trim(),
      form.phone.trim(),
      form.education_level,
      form.gpa.trim() || form.expected_gpa.trim(),
      form.target_countries.length > 0,
      form.preferred_field.trim(),
    ].filter(Boolean).length;
  }, [form]);
  const totalSections = 6;
  const progressPct = Math.round((sectionsComplete / totalSections) * 100);

  function setField<K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function toggleCountry(country: string) {
    setForm((prev) => {
      const selected = prev.target_countries.includes(country);
      return {
        ...prev,
        target_countries: selected
          ? prev.target_countries.filter((item) => item !== country)
          : [...prev.target_countries, country],
      };
    });
    setErrors((prev) => ({ ...prev, target_countries: "" }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof ProfileForm, string>> = {};
    const gpa = optionalNumber(form.gpa);
    const expectedGpa = optionalNumber(form.expected_gpa);

    if (!form.full_name.trim()) next.full_name = "Full name is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    if (Number.isNaN(gpa) || (gpa !== undefined && (gpa < 0 || gpa > 4.5))) {
      next.gpa = "Use a GPA between 0 and 4.5.";
    }
    if (
      Number.isNaN(expectedGpa) ||
      (expectedGpa !== undefined && (expectedGpa < 0 || expectedGpa > 4.5))
    ) {
      next.expected_gpa = "Use an expected GPA between 0 and 4.5.";
    }
    if (form.target_countries.length === 0) {
      next.target_countries = "Select at least one country.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError("");
    try {
      const updated = await completeGoogleProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        ...(form.location.trim() ? { location: form.location.trim() } : {}),
        education_level: form.education_level,
        ...(form.gpa.trim() ? { gpa: Number(form.gpa) } : {}),
        ...(form.expected_gpa.trim() ? { expected_gpa: Number(form.expected_gpa) } : {}),
        target_countries: form.target_countries,
        ...(form.preferred_field.trim()
          ? { preferred_field: form.preferred_field.trim() }
          : {}),
        ...(form.goals.trim() ? { goals: form.goals.trim() } : {}),
      });
      localStorage.setItem("abroadly_student_id", updated.id);
      router.replace("/chat");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Profile could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Loading state — minimal centered card with shared design language */
  if (loadState === "loading") {
    return (
      <main className="min-h-screen bg-[var(--ab-paper)] text-[var(--ab-ink)]">
        <NavBar showSignIn={false} primary={{ href: "/chat", label: "Open chat" }} />
        <section className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center sm:px-8 sm:py-32">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-[var(--ab-line)]" />
          <h1 className="ab-h1 mt-6">Checking your session</h1>
          <p className="ab-body mt-3 text-[14px]">
            Preparing your student profile.
          </p>
        </section>
      </main>
    );
  }

  /* ── Signed-out state */
  if (loadState === "signed_out") {
    return (
      <main className="min-h-screen bg-[var(--ab-paper)] text-[var(--ab-ink)]">
        <NavBar showSignIn={false} primary={{ href: "/chat", label: "Open chat" }} />
        <section className="ab-dot-grid relative">
          <div className="mx-auto max-w-md px-5 py-24 text-center sm:px-8 sm:py-32">
            <p className="ab-eyebrow">Sign-in required</p>
            <h1 className="ab-display-2 mt-3">Continue with Google to begin.</h1>
            <p className="ab-subhead mt-4">
              Sign in first so Abroadly can save this profile to your verified email.
            </p>
            <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-[var(--ab-line)] bg-white p-6 shadow-[var(--shadow-md)]">
              <GoogleSignInButton
                variant="outline"
                label="Continue with Google"
                className="w-full justify-start"
              />
            </div>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--ab-paper)] text-[var(--ab-ink)] pb-24">
      <NavBar showSignIn={false} primary={{ href: "/chat", label: "Open chat" }} />

      {/* ── Hero (light, focused) ────────────────────────────────────── */}
      <section className="ab-dot-grid relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-14 text-center sm:px-8 sm:pt-20 sm:pb-14">
          <p className="ab-eyebrow ab-fade-up ab-d1 justify-center inline-flex">One-time profile</p>
          <h1 className="ab-fade-up ab-d2 ab-display-2 mx-auto mt-4 max-w-2xl">
            Tell us where you&apos;re heading.
          </h1>
          <p className="ab-fade-up ab-d3 ab-subhead mx-auto mt-4 max-w-xl">
            About 60 seconds. Saved to {student?.email || "your verified email"} — Abroadly
            will skip this screen on every future sign-in.
          </p>

          {/* Progress */}
          <div className="ab-fade-up ab-d4 mx-auto mt-7 max-w-xs">
            <div className="flex items-baseline justify-between text-[12px] font-semibold text-[var(--ab-muted)]">
              <span>{sectionsComplete} of {totalSections} sections</span>
              <span className="font-mono text-[11px] text-[var(--ab-muted-soft)]">{progressPct}%</span>
            </div>
            <div className="mt-1.5 h-1 rounded-full bg-[var(--ab-line-soft)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--ab-brand)] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Form + Why-we-ask rail ───────────────────────────────────── */}
      <section className="border-t border-[var(--ab-line)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[1.4fr_0.6fr] lg:gap-14">
          {/* Form */}
          <form onSubmit={handleSubmit} className="min-w-0">
            {/* Section: Who you are */}
            <fieldset>
              <legend className="ab-eyebrow mb-5">Who you are</legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS} htmlFor="full_name">Full name</label>
                  <input
                    id="full_name"
                    className={INPUT_CLS}
                    value={form.full_name}
                    onChange={(e) => setField("full_name", e.target.value)}
                    placeholder="Your full legal name"
                  />
                  {errors.full_name && <p className={ERROR_CLS}>{errors.full_name}</p>}
                </div>

                <div>
                  <label className={LABEL_CLS} htmlFor="phone">Phone <span className="text-[#B91722]">*</span></label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    className={INPUT_CLS}
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="+977 98XXXXXXXX"
                  />
                  {errors.phone && <p className={ERROR_CLS}>{errors.phone}</p>}
                </div>

                <div>
                  <label className={LABEL_CLS} htmlFor="location">City or district</label>
                  <input
                    id="location"
                    className={INPUT_CLS}
                    value={form.location}
                    onChange={(e) => setField("location", e.target.value)}
                    placeholder="Kathmandu"
                  />
                </div>
              </div>
            </fieldset>

            {/* Section: Academic */}
            <fieldset className="mt-12 border-t border-[var(--ab-line-soft)] pt-12">
              <legend className="ab-eyebrow mb-5">Academic</legend>

              <div>
                <label className={LABEL_CLS}>Education level</label>
                <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[var(--ab-line-soft)] bg-[var(--ab-paper)] p-1 sm:grid-cols-5">
                  {EDUCATION_OPTIONS.map((opt) => {
                    const active = form.education_level === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField("education_level", opt.value)}
                        className={`ab-focus rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                          active
                            ? "bg-white text-[var(--ab-ink)] shadow-[var(--shadow-xs)]"
                            : "text-[var(--ab-muted)] hover:text-[var(--ab-ink)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS} htmlFor="preferred_field">Preferred field</label>
                  <input
                    id="preferred_field"
                    className={INPUT_CLS}
                    value={form.preferred_field}
                    onChange={(e) => setField("preferred_field", e.target.value)}
                    placeholder="Computer Science, Nursing, Business…"
                  />
                </div>

                <div>
                  <label className={LABEL_CLS} htmlFor="gpa">Current GPA</label>
                  <input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.5"
                    className={INPUT_CLS}
                    value={form.gpa}
                    onChange={(e) => setField("gpa", e.target.value)}
                    placeholder="3.25"
                  />
                  <p className={HELP_CLS}>0 – 4.5 scale.</p>
                  {errors.gpa && <p className={ERROR_CLS}>{errors.gpa}</p>}
                </div>

                <div>
                  <label className={LABEL_CLS} htmlFor="expected_gpa">Expected GPA</label>
                  <input
                    id="expected_gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.5"
                    className={INPUT_CLS}
                    value={form.expected_gpa}
                    onChange={(e) => setField("expected_gpa", e.target.value)}
                    placeholder="3.60"
                  />
                  <p className={HELP_CLS}>Where you think you&apos;ll finish.</p>
                  {errors.expected_gpa && <p className={ERROR_CLS}>{errors.expected_gpa}</p>}
                </div>
              </div>
            </fieldset>

            {/* Section: Goals & countries */}
            <fieldset className="mt-12 border-t border-[var(--ab-line-soft)] pt-12">
              <legend className="ab-eyebrow mb-5">Goals &amp; countries</legend>

              <div>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <label className={LABEL_CLS}>Interested countries</label>
                  <span className="text-[11.5px] font-semibold text-[var(--ab-muted-soft)]">
                    {form.target_countries.length} selected
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {COUNTRY_OPTIONS.map((country) => {
                    const checked = form.target_countries.includes(country);
                    return (
                      <button
                        key={country}
                        type="button"
                        onClick={() => toggleCountry(country)}
                        className={`ab-focus flex min-h-11 items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[13.5px] font-semibold transition ${
                          checked
                            ? "border-[var(--ab-brand)] bg-[#E8F2EC] text-[var(--ab-ink)]"
                            : "border-[var(--ab-line)] bg-white text-[var(--ab-ink-soft)] hover:border-[#D8D3C8]"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            checked ? "border-[var(--ab-brand)] bg-[var(--ab-brand)] text-white" : "border-[var(--ab-line)] bg-white"
                          }`}
                          aria-hidden
                        >
                          {checked && (
                            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                              <path d="M2.5 6.5l2.5 2 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span>{country}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.target_countries && (
                  <p className={ERROR_CLS}>{errors.target_countries}</p>
                )}
              </div>

              <div className="mt-6">
                <label className={LABEL_CLS} htmlFor="goals">Goals</label>
                <textarea
                  id="goals"
                  rows={5}
                  maxLength={1200}
                  className={INPUT_CLS}
                  value={form.goals}
                  onChange={(e) => setField("goals", e.target.value)}
                  placeholder="Example: I want to study Nursing in Australia. I'm worried about budget and visa documents."
                />
                <div className="mt-1.5 flex items-center justify-between text-[11.5px] font-medium text-[var(--ab-muted-soft)]">
                  <span>Optional — but it sharpens the first answer.</span>
                  <span className="font-mono">{form.goals.length}/1200</span>
                </div>
              </div>
            </fieldset>

            {apiError && (
              <div className="mt-8 rounded-xl border border-red-100 bg-red-50/80 px-4 py-3 text-[13px] font-medium text-[#B91722]">
                {apiError}
              </div>
            )}

            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-[var(--ab-line-soft)] pt-8 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/onboarding"
                className="ab-focus ab-btn ab-btn-ghost"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="ab-focus ab-btn ab-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save profile and open chat"}
              </button>
            </div>
          </form>

          {/* Right rail — Why we ask (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="ab-eyebrow">Why we ask</p>
              <h2 className="ab-h2 mt-3">Every field earns its place.</h2>
              <p className="ab-body mt-3 text-[14px] leading-7">
                We collect the minimum that makes the AI genuinely useful — nothing
                more. Each item maps to a specific answer it can give later.
              </p>
              <ul className="mt-7 space-y-5">
                {WHY_ITEMS.map((it) => (
                  <li key={it.title}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#E8F2EC] text-[var(--ab-brand)]">
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                          <path d="M2.5 6.5l2.5 2 4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-[13px] font-bold text-[var(--ab-ink)]">{it.title}</p>
                        <p className="text-[12.5px] leading-6 text-[var(--ab-muted)] mt-1">{it.body}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
