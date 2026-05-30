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

function optionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

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
        setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("signed_out");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const progress = useMemo(() => {
    const checks = [
      form.full_name.trim(),
      form.phone.trim(),
      form.education_level,
      form.gpa.trim() || form.expected_gpa.trim(),
      form.target_countries.length > 0,
      form.preferred_field.trim(),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form]);

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

  const inputClass =
    "w-full rounded-md border border-[#E8E5DD] bg-white px-4 py-3 text-sm font-bold text-[#1B1916] placeholder:text-[#A8A29A] focus:border-[#365CC4] focus:outline-none focus:ring-4 focus:ring-[#365CC4]/12";
  const labelClass = "mb-2 block text-sm font-black text-[#24314a]";
  const errorClass = "mt-2 text-xs font-bold text-[#b42318]";

  if (loadState === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-5 text-[#1B1916]">
        <section className="w-full max-w-md rounded-lg border border-[#E8E5DD] bg-white p-7 text-center shadow-sm">
          <div className="mx-auto h-11 w-11 animate-pulse rounded-md bg-[#dce7f8]" />
          <h1 className="mt-5 text-2xl font-black">Checking your Google session</h1>
          <p className="mt-3 text-sm font-semibold text-[#647086]">
            Preparing your student profile.
          </p>
        </section>
      </main>
    );
  }

  if (loadState === "signed_out") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF9F6] px-5 text-[#1B1916]">
        <section className="w-full max-w-md rounded-lg border border-[#E8E5DD] bg-white p-7 shadow-sm">
          <Link href="/" className="ab-focus flex items-center gap-3 rounded-md">
            <img
              src="/images/abroadly-logo.png"
              alt="Abroadly"
              className="h-9 w-9 rounded-md"
            />
            <span className="text-lg font-black">Abroadly</span>
          </Link>
          <h1 className="mt-7 text-2xl font-black">Google sign-in is required</h1>
          <p className="mt-3 text-sm leading-6 text-[#647086]">
            Sign in first so Abroadly can save this profile to your verified email.
          </p>
          <GoogleSignInButton
            variant="outline"
            label="Continue with Google"
            className="mt-6 w-full justify-start py-4"
          />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-[#1B1916]">
      <header className="border-b border-[#E8E5DD] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="ab-focus flex items-center gap-3 rounded-md">
            <img
              src="/images/abroadly-logo.png"
              alt="Abroadly"
              className="h-9 w-9 rounded-md"
            />
            <span className="text-lg font-black">Abroadly</span>
          </Link>
          <span className="rounded-md border border-[#dce3ef] bg-[#F4F2EC] px-3 py-2 text-xs font-black text-[#546176]">
            Verified Google email
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:py-12">
        <aside className="lg:sticky lg:top-8">
          <div className="rounded-lg bg-[#12244a] p-6 text-white shadow-[0_24px_70px_rgba(18,36,74,0.22)]">
            <p className="text-xs font-black uppercase text-[#7DDBB1]">
              One-time student profile
            </p>
            <h1 className="mt-3 text-3xl font-black leading-tight">
              Add the context Abroadly needs before chat starts.
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/74">
              The profile is saved to {student?.email}. Once complete, Abroadly will
              skip this screen on future sign-ins.
            </p>

            <div className="mt-7">
              <div className="flex items-center justify-between text-xs font-black text-white/72">
                <span>Profile readiness</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/14">
                <div
                  className="h-2 rounded-full bg-[#7DDBB1] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mt-7 grid gap-3 text-sm font-bold text-white/86">
              <div className="rounded-md border border-white/14 bg-white/8 px-4 py-3">
                GPA and expected GPA help eligibility answers.
              </div>
              <div className="rounded-md border border-white/14 bg-white/8 px-4 py-3">
                Country choices shape visa, cost, and document guidance.
              </div>
              <div className="rounded-md border border-white/14 bg-white/8 px-4 py-3">
                Your email comes from Google, not a typed form.
              </div>
            </div>
          </div>
        </aside>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[#E8E5DD] bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="flex flex-col gap-4 border-b border-[#EFECE4] pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-[#365CC4]">
                Profile details
              </p>
              <h2 className="mt-2 text-2xl font-black">Tell us where you are heading.</h2>
            </div>
            <div className="rounded-md bg-[#E8F2EC] px-3 py-2 text-xs font-black text-[#0A6E45]">
              Asked once
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="full_name">
                Full name
              </label>
              <input
                id="full_name"
                className={inputClass}
                value={form.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                placeholder="Your full legal name"
              />
              {errors.full_name && <p className={errorClass}>{errors.full_name}</p>}
            </div>

            <div>
              <label className={labelClass} htmlFor="phone">
                Phone <span className="text-[#b42318]">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="+977 98XXXXXXXX"
              />
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>

            <div>
              <label className={labelClass} htmlFor="location">
                City or district
              </label>
              <input
                id="location"
                className={inputClass}
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Kathmandu"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="education_level">
                Education level
              </label>
              <select
                id="education_level"
                className={inputClass}
                value={form.education_level}
                onChange={(e) => setField("education_level", e.target.value as EducationLevel)}
              >
                {EDUCATION_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="preferred_field">
                Preferred field
              </label>
              <input
                id="preferred_field"
                className={inputClass}
                value={form.preferred_field}
                onChange={(e) => setField("preferred_field", e.target.value)}
                placeholder="Computer Science, Nursing, Business"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="gpa">
                Current GPA
              </label>
              <input
                id="gpa"
                type="number"
                step="0.01"
                min="0"
                max="4.5"
                className={inputClass}
                value={form.gpa}
                onChange={(e) => setField("gpa", e.target.value)}
                placeholder="3.25"
              />
              {errors.gpa && <p className={errorClass}>{errors.gpa}</p>}
            </div>

            <div>
              <label className={labelClass} htmlFor="expected_gpa">
                Expected GPA
              </label>
              <input
                id="expected_gpa"
                type="number"
                step="0.01"
                min="0"
                max="4.5"
                className={inputClass}
                value={form.expected_gpa}
                onChange={(e) => setField("expected_gpa", e.target.value)}
                placeholder="3.60"
              />
              {errors.expected_gpa && (
                <p className={errorClass}>{errors.expected_gpa}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <div className="mb-3 flex items-end justify-between gap-4">
                <label className="block text-sm font-black text-[#24314a]">
                  Interested countries
                </label>
                <span className="text-xs font-bold text-[#8A847B]">
                  {form.target_countries.length} selected
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {COUNTRY_OPTIONS.map((country) => {
                  const checked = form.target_countries.includes(country);
                  return (
                    <label
                      key={country}
                      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm font-black transition ${
                        checked
                          ? "border-[#365CC4] bg-[#EEF1FA] text-[#1B1916]"
                          : "border-[#dce3ef] bg-white text-[#48556a] hover:border-[#aab8cf]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCountry(country)}
                        className="h-4 w-4 rounded border-[#b7c2d4] text-[#365CC4] focus:ring-[#365CC4]"
                      />
                      <span>{country}</span>
                    </label>
                  );
                })}
              </div>
              {errors.target_countries && (
                <p className={errorClass}>{errors.target_countries}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="goals">
                Goals
              </label>
              <textarea
                id="goals"
                rows={5}
                maxLength={1200}
                className={inputClass}
                value={form.goals}
                onChange={(e) => setField("goals", e.target.value)}
                placeholder="Example: I want to study Nursing in Australia and understand the safest next steps for documents, budget, and visa planning."
              />
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#8A847B]">
                <span>Optional, but useful for better replies.</span>
                <span>{form.goals.length}/1200</span>
              </div>
            </div>
          </div>

          {apiError && (
            <div className="mt-6 rounded-md border border-[#f5c2bc] bg-[#fff4f2] px-4 py-3 text-sm font-bold text-[#b42318]">
              {apiError}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#EFECE4] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/onboarding"
              className="ab-focus rounded-md border border-[#E8E5DD] bg-white px-5 py-3 text-center text-sm font-black text-[#344158] transition hover:border-[#365CC4]"
            >
              Back
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="ab-focus rounded-md bg-[#12244a] px-6 py-3 text-sm font-black text-white shadow-[0_14px_32px_rgba(18,36,74,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1F3D78] disabled:cursor-not-allowed disabled:bg-[#A8A29A]"
            >
              {submitting ? "Saving profile" : "Save profile and open chat"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
