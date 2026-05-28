"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStudent, type EducationLevel } from "@/lib/api";
import { GoogleSignInButton } from "../google-sign-in-button";

type Step = 1 | 2 | 3;

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  education_level: EducationLevel;
  gpa: string;
  preferred_field: string;
  target_countries: string;
  goals: string;
}

const EMPTY: FormData = {
  full_name: "",
  email: "",
  phone: "",
  location: "",
  education_level: "plus_two",
  gpa: "",
  preferred_field: "",
  target_countries: "",
  goals: "",
};

const stepMeta = [
  { step: 1, label: "Identity" },
  { step: 2, label: "Education" },
  { step: 3, label: "Goals" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setErrors((prev) => ({ ...prev, [field]: "" }));
    };
  }

  function validateStep1(): boolean {
    const errs: Partial<Record<keyof FormData, string>> = {};
    if (!form.full_name.trim()) errs.full_name = "Full name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
      return;
    }

    setSubmitting(true);
    setApiError("");
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        ...(form.location.trim() ? { location: form.location.trim() } : {}),
        education_level: form.education_level,
        ...(form.gpa !== "" ? { gpa: parseFloat(form.gpa) } : {}),
        ...(form.preferred_field.trim() ? { preferred_field: form.preferred_field.trim() } : {}),
        target_countries: form.target_countries
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        ...(form.goals.trim() ? { goals: form.goals.trim() } : {}),
      };
      const student = await createStudent(payload);
      localStorage.setItem("abroadly_student_id", student.id);
      router.push("/chat");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-[#d9d3ea] bg-white px-4 py-3 text-sm font-semibold text-[#21143d] placeholder:text-[#948ba8] focus:border-[#673de6] focus:outline-none focus:ring-4 focus:ring-[#673de6]/15";
  const labelCls = "mb-2 block text-sm font-black text-[#342456]";
  const errorCls = "mt-2 text-xs font-bold text-[#d64545]";

  return (
    <main className="min-h-screen bg-[#fbfaf7] text-[#21143d]">
      <div className="ab-grid min-h-screen">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="ab-focus flex items-center gap-3 rounded-md">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#673de6] text-sm font-black text-white">
              A
            </span>
            <span className="text-lg font-black">Abroadly</span>
          </Link>
          <Link
            href="/chat"
            className="ab-focus rounded-md border border-[#d9d3ea] bg-white px-4 py-2 text-sm font-black text-[#342456] transition hover:border-[#673de6]"
          >
            Open chat
          </Link>
        </header>

        <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <aside className="rounded-lg bg-[#21143d] p-7 text-white ab-soft-shadow">
            <p className="text-sm font-black uppercase text-[#00d6a3]">Student profile</p>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
              Set the context once. Ask better questions after.
            </h1>
            <p className="mt-5 text-base leading-8 text-white/76">
              Abroadly uses your profile to shape guidance around your education,
              target countries, and goals. Keep it honest and simple.
            </p>

            <div className="mt-8 space-y-3">
              {stepMeta.map((item) => {
                const active = item.step === step;
                const complete = item.step < step;
                return (
                  <div
                    key={item.step}
                    className={`flex items-center gap-3 rounded-md border px-4 py-3 ${
                      active
                        ? "border-[#00d6a3] bg-white/12"
                        : complete
                        ? "border-white/18 bg-white/8"
                        : "border-white/12 bg-transparent"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-black ${
                        active || complete ? "bg-[#00d6a3] text-[#21143d]" : "bg-white/10"
                      }`}
                    >
                      {item.step}
                    </span>
                    <span className="font-black">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="rounded-lg border border-[#ded8ee] bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-black text-[#673de6]">Step {step} of 3</p>
              <div className="mt-4 h-2 rounded-full bg-[#eee9f7]">
                <div
                  className="h-2 rounded-full bg-[#673de6] transition-all"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            {step === 1 && (
              <div className="mb-8 rounded-md border border-[#ded8ee] bg-[#fbfaf7] p-4">
                <GoogleSignInButton variant="outline" className="w-full" />
                <div className="mt-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[#ded8ee]" />
                  <span className="text-xs font-black uppercase text-[#948ba8]">
                    or fill manually
                  </span>
                  <span className="h-px flex-1 bg-[#ded8ee]" />
                </div>
              </div>
            )}

            <div className="space-y-5">
              {step === 1 && (
                <>
                  <div>
                    <h2 className="text-2xl font-black">Basic information</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6a607f]">
                      Start with the details needed to create your private chat profile.
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelCls} htmlFor="full_name">
                        Full name
                      </label>
                      <input
                        id="full_name"
                        className={inputCls}
                        placeholder="Aarav Sharma"
                        value={form.full_name}
                        onChange={set("full_name")}
                      />
                      {errors.full_name && <p className={errorCls}>{errors.full_name}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls} htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        className={inputCls}
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={set("email")}
                      />
                      {errors.email && <p className={errorCls}>{errors.email}</p>}
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="phone">
                        Phone
                      </label>
                      <input
                        id="phone"
                        className={inputCls}
                        placeholder="+977 98XXXXXXXX"
                        value={form.phone}
                        onChange={set("phone")}
                      />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="location">
                        City or district
                      </label>
                      <input
                        id="location"
                        className={inputCls}
                        placeholder="Kathmandu"
                        value={form.location}
                        onChange={set("location")}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <h2 className="text-2xl font-black">Education background</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6a607f]">
                      Add enough context for better admissions and eligibility guidance.
                    </p>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className={labelCls} htmlFor="education_level">
                        Education level
                      </label>
                      <select
                        id="education_level"
                        className={inputCls}
                        value={form.education_level}
                        onChange={set("education_level")}
                      >
                        <option value="plus_two">+2 (Class 12)</option>
                        <option value="a_levels">A-Levels</option>
                        <option value="bba">BBA</option>
                        <option value="bachelors">Bachelors</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="gpa">
                        Current GPA
                      </label>
                      <input
                        id="gpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="4.5"
                        className={inputCls}
                        placeholder="3.5"
                        value={form.gpa}
                        onChange={set("gpa")}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls} htmlFor="preferred_field">
                        Preferred field of study
                      </label>
                      <input
                        id="preferred_field"
                        className={inputCls}
                        placeholder="Computer Science, Nursing, Business"
                        value={form.preferred_field}
                        onChange={set("preferred_field")}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div>
                    <h2 className="text-2xl font-black">Goals and destinations</h2>
                    <p className="mt-2 text-sm leading-6 text-[#6a607f]">
                      Share your rough plan. You can refine it inside chat later.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="target_countries">
                      Target countries
                    </label>
                    <input
                      id="target_countries"
                      className={inputCls}
                      placeholder="Australia, Canada, UK"
                      value={form.target_countries}
                      onChange={set("target_countries")}
                    />
                    <p className="mt-2 text-xs font-semibold text-[#817793]">
                      Separate countries with commas.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="goals">
                      What do you want to achieve?
                    </label>
                    <textarea
                      id="goals"
                      className={inputCls}
                      rows={5}
                      maxLength={500}
                      placeholder="I want to study nursing in Australia and understand the safest next steps..."
                      value={form.goals}
                      onChange={set("goals")}
                    />
                    <p className="mt-2 text-xs font-semibold text-[#817793]">
                      {form.goals.length}/500
                    </p>
                  </div>
                  {apiError && (
                    <div className="rounded-md border border-[#f1b4b4] bg-[#fff1f1] px-4 py-3 text-sm font-semibold text-[#9b2424]">
                      {apiError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="ab-focus flex-1 rounded-md border border-[#d9d3ea] bg-white px-5 py-3 font-black text-[#342456] transition hover:border-[#673de6]"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="ab-focus flex-1 rounded-md bg-[#673de6] px-5 py-3 font-black text-white transition hover:bg-[#5025d1] disabled:cursor-not-allowed disabled:bg-[#b8a9ee]"
              >
                {submitting ? "Creating profile" : step === 3 ? "Finish" : "Next"}
              </button>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
