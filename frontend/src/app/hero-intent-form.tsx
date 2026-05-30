"use client";

import { useState } from "react";
import { googleLoginUrl } from "@/lib/api";

/* Hero call-to-action: pick a degree + country, then sign in with Google.
 * The choice is stashed in localStorage so onboarding can pre-fill it.
 * Light-theme styling — sits on the warm paper hero. */

const DEGREES = ["Bachelor's", "Master's", "PhD", "MBA", "Diploma"];

const COUNTRIES: { value: string; label: string }[] = [
  { value: "United Kingdom", label: "the UK" },
  { value: "United States", label: "the USA" },
  { value: "Australia", label: "Australia" },
  { value: "Canada", label: "Canada" },
];

function Chevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--ab-muted)]"
      fill="none"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

const selectClass =
  "ab-focus cursor-pointer appearance-none rounded-xl border border-[var(--ab-line)] bg-white py-2.5 pl-3.5 pr-9 text-[15px] font-bold tracking-[-0.01em] text-[var(--ab-ink)] shadow-[var(--shadow-xs)] transition hover:border-[#D8D3C8] focus:border-[var(--ab-brand)] sm:text-[16px]";

export function HeroIntentForm() {
  const [degree, setDegree] = useState("");
  const [country, setCountry] = useState("");

  const start = () => {
    try {
      if (degree && country) {
        localStorage.setItem("abroadly_intent", JSON.stringify({ degree, country }));
      }
    } catch {
      /* storage blocked — sign-in still proceeds */
    }
    window.location.href = googleLoginUrl();
  };

  return (
    <div className="flex w-full flex-col items-start gap-5">
      {/* selector sentence */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2.5 text-[16px] font-semibold text-[var(--ab-ink-soft)] sm:text-[17px]">
        <span>I want to study</span>

        <div className="relative">
          <label className="sr-only" htmlFor="hero-degree">Degree</label>
          <select id="hero-degree" value={degree} onChange={(e) => setDegree(e.target.value)} className={selectClass}>
            <option value="" disabled>Select degree</option>
            {DEGREES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <Chevron />
        </div>

        <span className="text-[var(--ab-muted)]">in</span>

        <div className="relative">
          <label className="sr-only" htmlFor="hero-country">Country</label>
          <select id="hero-country" value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
            <option value="" disabled>Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <Chevron />
        </div>
      </div>

      {/* primary CTA — Google-branded, free */}
      <button
        type="button"
        onClick={start}
        className="ab-focus inline-flex items-center gap-2.5 rounded-xl bg-[var(--ab-ink)] py-3 pl-3 pr-6 text-[15px] font-extrabold text-white shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:bg-black active:translate-y-0"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white">
          <GoogleMark />
        </span>
        Find my fit
        <span className="font-semibold text-white/65">· free</span>
      </button>
    </div>
  );
}
