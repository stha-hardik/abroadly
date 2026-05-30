"use client";

import { useState } from "react";
import { googleLoginUrl } from "@/lib/api";

/* Hero call-to-action: pick a degree + country, then sign in with Google.
 * The choice is stashed in localStorage so onboarding can pre-fill it.
 * Dark-hero styling — sits on the navy hero band. */

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
      className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-white/55"
      fill="none"
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const selectClass =
  "ab-focus cursor-pointer appearance-none rounded-xl border border-white/15 bg-white/[0.07] py-2.5 pl-4 pr-10 text-[16px] font-bold text-white transition hover:border-white/35 focus:border-[#F2682C] sm:text-[17px]";

const OPTION_CLASS = "bg-[#15294C] text-white";

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
    <div className="flex w-full flex-col items-center gap-7">
      {/* selector sentence */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 text-[17px] font-semibold text-white/90 sm:text-[19px]">
        <span>I want to study</span>

        <div className="relative">
          <label className="sr-only" htmlFor="hero-degree">Degree</label>
          <select id="hero-degree" value={degree} onChange={(e) => setDegree(e.target.value)} className={selectClass}>
            <option value="" disabled className={OPTION_CLASS}>Select degree</option>
            {DEGREES.map((d) => (
              <option key={d} value={d} className={OPTION_CLASS}>{d}</option>
            ))}
          </select>
          <Chevron />
        </div>

        <span className="text-white/55">in</span>

        <div className="relative">
          <label className="sr-only" htmlFor="hero-country">Country</label>
          <select id="hero-country" value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
            <option value="" disabled className={OPTION_CLASS}>Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value} className={OPTION_CLASS}>{c.label}</option>
            ))}
          </select>
          <Chevron />
        </div>
      </div>

      {/* primary CTA */}
      <div className="relative">
        <button
          type="button"
          onClick={start}
          className="ab-focus inline-flex items-center gap-2 rounded-xl bg-[#F2682C] px-7 py-3.5 text-[15px] font-extrabold text-white shadow-[0_14px_34px_-10px_rgba(242,104,44,0.65)] transition hover:-translate-y-0.5 hover:bg-[#E55A1F] active:translate-y-0"
        >
          Find my fit
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none">
            <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="pointer-events-none absolute -right-3.5 -top-2.5 rotate-[8deg] rounded-full bg-[#5B8DEF] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.04em] text-white shadow-[0_4px_10px_rgba(91,141,239,0.4)]">
          Free
        </span>
      </div>
    </div>
  );
}
