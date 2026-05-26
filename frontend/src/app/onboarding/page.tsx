"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStudent, type EducationLevel } from "@/lib/api";

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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Enter a valid email address.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    return true; // all optional in step 2 except education_level which has a default
  }

  async function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    // Submit
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
    "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const labelCls = "block text-sm text-gray-400 mb-1";
  const errorCls = "text-xs text-red-400 mt-1";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-950">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-white">Abroadly</span>
          <p className="text-gray-400 text-sm mt-1">Tell us about yourself</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {([1, 2, 3] as const).map((n) => (
            <div
              key={n}
              className={`flex-1 h-1.5 rounded-full transition-colors duration-200 ${
                n <= step ? "bg-emerald-500" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mb-6">Step {step} of 3</p>

        {/* Step content */}
        <div className="space-y-5">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-white">Basic info</h2>
              <div>
                <label className={labelCls}>Full name *</label>
                <input
                  className={inputCls}
                  placeholder="Aarav Sharma"
                  value={form.full_name}
                  onChange={set("full_name")}
                />
                {errors.full_name && <p className={errorCls}>{errors.full_name}</p>}
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                />
                {errors.email && <p className={errorCls}>{errors.email}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone (optional)</label>
                <input
                  className={inputCls}
                  placeholder="+977 98XXXXXXXX"
                  value={form.phone}
                  onChange={set("phone")}
                />
              </div>
              <div>
                <label className={labelCls}>City / district in Nepal (optional)</label>
                <input
                  className={inputCls}
                  placeholder="Kathmandu"
                  value={form.location}
                  onChange={set("location")}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-white">Education background</h2>
              <div>
                <label className={labelCls}>Education level *</label>
                <select
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
                <label className={labelCls}>Current GPA (optional, 0–4.5)</label>
                <input
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
              <div>
                <label className={labelCls}>Preferred field of study (optional)</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Computer Science, Nursing, Business"
                  value={form.preferred_field}
                  onChange={set("preferred_field")}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold text-white">Your goals</h2>
              <div>
                <label className={labelCls}>Target countries (comma-separated)</label>
                <input
                  className={inputCls}
                  placeholder="Australia, Canada, UK"
                  value={form.target_countries}
                  onChange={set("target_countries")}
                />
                <p className="text-xs text-gray-600 mt-1">
                  e.g. Australia, Canada, UK, USA, Germany
                </p>
              </div>
              <div>
                <label className={labelCls}>What do you want to achieve? (optional)</label>
                <textarea
                  className={inputCls}
                  rows={4}
                  maxLength={500}
                  placeholder="e.g. I want to study nursing in Australia and work there after graduation..."
                  value={form.goals}
                  onChange={set("goals")}
                />
                <p className="text-xs text-gray-600 mt-1">{form.goals.length}/500</p>
              </div>
              {apiError && (
                <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
                  {apiError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={submitting}
            className="flex-1 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-600 text-white font-semibold transition-colors"
          >
            {submitting ? "Creating profile…" : step === 3 ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    </main>
  );
}
