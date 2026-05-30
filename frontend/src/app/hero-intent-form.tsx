"use client";

import { useState } from "react";
import { googleLoginUrl } from "@/lib/api";

/* Hero call-to-action: pick a degree + country, then sign in with Google.
 * The choice is stashed in localStorage so onboarding can pre-fill it. */

const DEGREES = ["Bachelor's", "Master's", "PhD", "MBA"];

const COUNTRIES: { value: string; label: string }[] = [
  { value: "United Kingdom", label: "the UK" },
  { value: "United States", label: "the USA" },
  { value: "Australia", label: "Australia" },
  { value: "Canada", label: "Canada" },
];

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--ab-muted)]"
      fill="none"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const selectClass =
  "ab-focus appearance-none rounded-lg border border-[var(--ab-line)] bg-[var(--ab-paper)] py-2 pl-3 pr-8 text-[15px] font-bold tracking-[-0.01em] text-[var(--ab-ink)] transition hover:border-[#D8D3C8] focus:border-[var(--ab-brand)]";

export function HeroIntentForm() {
  const [degree, setDegree] = useState(DEGREES[1]); // Master's by default
  const [country, setCountry] = useState(COUNTRIES[0].value);

  const start = () => {
    try {
      localStorage.setItem("abroadly_intent", JSON.stringify({ degree, country }));
    } catch {
      /* storage blocked — sign-in still proceeds */
    }
    window.location.href = googleLoginUrl();
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--ab-line)] bg-white/80 p-4 shadow-[var(--shadow-sm)] backdrop-blur-sm sm:p-5">
      <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--ab-muted)]">I want to study</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <label className="sr-only" htmlFor="hero-degree">Degree</label>
          <select id="hero-degree" value={degree} onChange={(e) => setDegree(e.target.value)} className={selectClass}>
            {DEGREES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <Chevron />
        </div>

        <span className="text-[15px] font-medium text-[var(--ab-muted)]">in</span>

        <div className="relative">
          <label className="sr-only" htmlFor="hero-country">Country</label>
          <select id="hero-country" value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <Chevron />
        </div>
      </div>

      <button
        type="button"
        onClick={start}
        className="ab-focus mt-4 inline-flex w-full items-center justify-center gap-3 rounded-md border border-[#E8E5DD] bg-white px-5 py-3 text-sm font-black text-[#1B1916] shadow-[0_4px_12px_rgba(15,15,15,0.06),0_1px_3px_rgba(15,15,15,0.04)] transition hover:-translate-y-0.5 hover:bg-[#F4F2EC]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#EFECE4] bg-white">
          <GoogleMark />
        </span>
        Start free with Google
      </button>

      <p className="mt-2.5 text-center text-[11px] font-semibold text-[var(--ab-muted)]">
        Free · we&apos;ll tailor your plan to this
      </p>
    </div>
  );
}
