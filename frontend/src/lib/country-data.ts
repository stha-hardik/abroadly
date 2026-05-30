/**
 * Per-country study-abroad data, calibrated for Nepali students applying for
 * 2025-26 / 2026-27 intakes. The dashboard reads from this file so every
 * country surface (visa, deadlines, scholarships, costs) is concrete instead
 * of generic.
 *
 * Numbers are public, verifiable figures from official gov / embassy / agency
 * pages — see `source` per fact strip. They are indicative; for binding
 * decisions the student must check the official portal listed in `links`.
 */

export type CountryCode = "UK" | "Australia" | "Canada" | "USA";

export interface FactChip {
  /** Short label rendered above the value, e.g. "Visa class" */
  label: string;
  /** The headline figure / phrase rendered prominently */
  value: string;
  /** One-line elaboration */
  detail?: string;
}

export interface TimelineEvent {
  /** ISO month — used to anchor the row order; 0 = Jan, 11 = Dec */
  monthIdx: number;
  /** Year offset from "next sensible intake year". 0 = same year, -1 = year before. */
  yearOffset: number;
  /** Kind of event — drives the marker colour */
  kind: "intake" | "deadline" | "visa" | "test" | "prep";
  /** Short headline shown in the row */
  title: string;
  /** Two-line context */
  detail: string;
}

export interface Scholarship {
  name: string;
  /** Funder — short, e.g. "FCDO (UK gov)" */
  funder: string;
  /** What it covers — short phrase */
  covers: string;
  /** Eligibility — one sentence */
  eligibility: string;
  /** When the typical annual cycle opens */
  cycleOpens: string;
  /** Official portal */
  url: string;
}

export interface CountryProfile {
  code: CountryCode;
  /** Display name */
  name: string;
  /** Two-letter ISO-style flag emoji */
  flag: string;
  /** One-line positioning for the country — sets the tone for a Nepali student */
  pitch: string;

  /** Earliest 4-month-out intake season the student can realistically prep for */
  primaryIntake: { month: number; label: string };
  /** Secondary intake if it exists (Australia Feb+Jul, Canada Sept+Jan…) */
  secondaryIntake?: { month: number; label: string };

  /** The 5 chips rendered horizontally as the "fact strip" — order matters */
  factStrip: FactChip[];

  /** Country-specific timeline events, sorted ascending by (yearOffset, monthIdx) */
  timeline: TimelineEvent[];

  /** Verified scholarships — 3-5 per country */
  scholarships: Scholarship[];

  /** Cost snapshot — annual figures for a Nepali student */
  cost: {
    tuitionLabel: string;          // e.g. "Tuition / yr"
    tuitionValue: string;          // e.g. "£14k–£40k"
    livingLabel: string;
    livingValue: string;
    visaLabel: string;
    visaValue: string;
    /** Indicative one-way flight Kathmandu → destination */
    flightValue: string;
  };

  /** Useful official portals — embassy, visa, intake */
  links: { label: string; url: string }[];
}

/* ── Data ─────────────────────────────────────────────────────────────── */

export const COUNTRY_PROFILES: Record<CountryCode, CountryProfile> = {
  UK: {
    code: "UK",
    name: "United Kingdom",
    flag: "\u{1F1EC}\u{1F1E7}",
    pitch:
      "Shortest popular degree path (3-year UG, 1-year PG), 24-month Graduate Route post-study work, large Nepali student community.",
    primaryIntake: { month: 8, label: "September 2026" }, // Sept = idx 8
    factStrip: [
      {
        label: "Visa class",
        value: "Student Route",
        detail: "Formerly Tier 4. Issued by UKVI.",
      },
      {
        label: "Visa fee",
        value: "£524",
        detail: "+ £776/year IHS health surcharge.",
      },
      {
        label: "Apply visa from",
        value: "6 months",
        detail: "Earliest = 6 months before course start.",
      },
      {
        label: "Maintenance proof",
        value: "£13,347",
        detail: "9 months living costs outside London. London: £18,621.",
      },
      {
        label: "Post-study work",
        value: "24 months",
        detail: "Graduate Route. 36 mo for PhD.",
      },
    ],
    timeline: [
      {
        monthIdx: 8,
        yearOffset: -1,
        kind: "prep",
        title: "Start: research universities",
        detail: "12 months out. Shortlist 5-8 unis. Identify courses, fees, entry bars.",
      },
      {
        monthIdx: 8,
        yearOffset: -1,
        kind: "test",
        title: "Book IELTS / PTE",
        detail: "British Council Kathmandu slots fill 4-6 weeks ahead. Most UK unis want 6.5+ overall.",
      },
      {
        monthIdx: 9,
        yearOffset: -1,
        kind: "deadline",
        title: "UCAS opens for September intake",
        detail: "Undergrad central applications go live early September. Apply early for stronger consideration.",
      },
      {
        monthIdx: 0,
        yearOffset: 0,
        kind: "deadline",
        title: "UCAS deadline — most courses",
        detail: "29 January is the equal-consideration deadline for most undergrad courses.",
      },
      {
        monthIdx: 2,
        yearOffset: 0,
        kind: "prep",
        title: "CAS — confirm acceptance",
        detail: "Pay deposit, get your Confirmation of Acceptance for Studies (CAS) from the university.",
      },
      {
        monthIdx: 2,
        yearOffset: 0,
        kind: "visa",
        title: "Visa window opens (6 mo before)",
        detail: "Apply online at gov.uk, book biometrics at VFS Kathmandu, attend appointment.",
      },
      {
        monthIdx: 6,
        yearOffset: 0,
        kind: "prep",
        title: "Get tuberculosis test (mandatory)",
        detail: "Required for all Nepali UK Student Route applicants. IOM Kathmandu or approved clinic.",
      },
      {
        monthIdx: 8,
        yearOffset: 0,
        kind: "intake",
        title: "September intake — fly out",
        detail: "Most UK undergrad and PG courses begin late September.",
      },
    ],
    scholarships: [
      {
        name: "Chevening Scholarship",
        funder: "FCDO (UK Gov)",
        covers: "Full tuition + £1,917/mo stipend + flights",
        eligibility: "Nepali graduates with 2+ years work experience, applying for 1-year master's.",
        cycleOpens: "Early August (closes early November)",
        url: "https://www.chevening.org/scholarship/nepal/",
      },
      {
        name: "Commonwealth Master's Scholarship",
        funder: "CSC UK",
        covers: "Full tuition + living + flights",
        eligibility: "Nepali graduates from low/middle-income backgrounds, master's only.",
        cycleOpens: "September (closes October)",
        url: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/",
      },
      {
        name: "GREAT Scholarships",
        funder: "British Council + UK unis",
        covers: "£10,000 toward tuition (1 year)",
        eligibility: "Nepali students offered a place on a 1-year PG course at participating UK unis.",
        cycleOpens: "October-March (varies by uni)",
        url: "https://study-uk.britishcouncil.org/scholarships/great-scholarships",
      },
      {
        name: "University-specific awards",
        funder: "Individual UK universities",
        covers: "£2,000-£10,000 typical",
        eligibility: "Almost every UK uni offers international merit awards. Apply via the uni portal.",
        cycleOpens: "On offer of admission",
        url: "https://study-uk.britishcouncil.org/scholarships",
      },
    ],
    cost: {
      tuitionLabel: "Tuition / year",
      tuitionValue: "£14k–£40k",
      livingLabel: "Living (9 mo)",
      livingValue: "£13,347 outside London · £18,621 in London",
      visaLabel: "Visa + IHS",
      visaValue: "£524 + £776/yr",
      flightValue: "NPR 80k–130k one-way",
    },
    links: [
      { label: "UK visa — Student Route", url: "https://www.gov.uk/student-visa" },
      { label: "UCAS (undergraduate)", url: "https://www.ucas.com/" },
      { label: "British Council Nepal", url: "https://www.britishcouncil.org.np/" },
    ],
  },

  Australia: {
    code: "Australia",
    name: "Australia",
    flag: "\u{1F1E6}\u{1F1FA}",
    pitch:
      "Two intakes per year (Feb + Jul), generous post-study work (2-4 years), strong demand for nursing, IT, engineering.",
    primaryIntake: { month: 6, label: "July 2026" }, // Jul = idx 6
    secondaryIntake: { month: 1, label: "February 2027" },
    factStrip: [
      {
        label: "Visa class",
        value: "Subclass 500",
        detail: "Student visa. Issued by Department of Home Affairs.",
      },
      {
        label: "Visa fee",
        value: "A$1,600",
        detail: "Increased July 2024. Add OSHC ~A$609/yr.",
      },
      {
        label: "Apply visa from",
        value: "After CoE",
        detail: "Apply once you have Confirmation of Enrolment. Allow 4-12 weeks.",
      },
      {
        label: "Maintenance proof",
        value: "A$29,710",
        detail: "12-month financial capacity (Genuine Student requirement).",
      },
      {
        label: "Post-study work",
        value: "2–4 years",
        detail: "Subclass 485. Length depends on degree level + city.",
      },
    ],
    timeline: [
      {
        monthIdx: 6,
        yearOffset: -1,
        kind: "prep",
        title: "Start: shortlist + research",
        detail: "12 months out from July intake. Use the universities section below to start.",
      },
      {
        monthIdx: 8,
        yearOffset: -1,
        kind: "test",
        title: "Book IELTS / PTE",
        detail: "Most Aussie unis accept PTE 50-58 or IELTS 6.0-6.5 for undergrad.",
      },
      {
        monthIdx: 9,
        yearOffset: -1,
        kind: "deadline",
        title: "Apply to universities",
        detail: "Most accept rolling applications. Apply 6-9 months before intake for safest visa timing.",
      },
      {
        monthIdx: 0,
        yearOffset: 0,
        kind: "prep",
        title: "Get offer + pay deposit",
        detail: "Accept offer, pay deposit, receive Confirmation of Enrolment (CoE).",
      },
      {
        monthIdx: 1,
        yearOffset: 0,
        kind: "visa",
        title: "Apply for Subclass 500 visa",
        detail: "Online via ImmiAccount. GTE statement required. Avg processing 4-12 weeks.",
      },
      {
        monthIdx: 3,
        yearOffset: 0,
        kind: "prep",
        title: "Arrange OSHC health cover",
        detail: "Mandatory for full visa length. Bupa, Medibank, ahm, Allianz.",
      },
      {
        monthIdx: 6,
        yearOffset: 0,
        kind: "intake",
        title: "July intake — orientation week",
        detail: "Mid-late July. February intake: book your January flight.",
      },
    ],
    scholarships: [
      {
        name: "Australia Awards Scholarship",
        funder: "DFAT (Australian Gov)",
        covers: "Full tuition + return airfare + A$31k contribution to living",
        eligibility: "Mid-career professionals from Nepal applying for master's. Highly competitive.",
        cycleOpens: "February (closes April)",
        url: "https://www.dfat.gov.au/people-to-people/australia-awards/scholarships/scholarships-information-for-applicants",
      },
      {
        name: "Destination Australia",
        funder: "Australian Gov + regional unis",
        covers: "A$15,000 / year toward study",
        eligibility: "International students studying at regional uni campuses (outside Sydney/Melbourne).",
        cycleOpens: "Varies by university (mostly Jan-Apr)",
        url: "https://www.education.gov.au/destination-australia",
      },
      {
        name: "John Allwright Fellowship",
        funder: "ACIAR",
        covers: "Full tuition + living + return flights",
        eligibility: "Nepali researchers in ACIAR-partner agricultural institutions, PhD only.",
        cycleOpens: "April (closes August)",
        url: "https://www.aciar.gov.au/career-opportunities/research-and-study/john-allwright-fellowship",
      },
      {
        name: "University merit scholarships",
        funder: "Individual Australian universities",
        covers: "A$5,000-A$20,000 / year typical",
        eligibility: "Most Go8 + mid-tier unis offer them. Awarded with admission offer.",
        cycleOpens: "On offer of admission",
        url: "https://www.studyaustralia.gov.au/en/plan-your-studies/scholarships",
      },
    ],
    cost: {
      tuitionLabel: "Tuition / year",
      tuitionValue: "A$25k–A$55k",
      livingLabel: "Living (12 mo)",
      livingValue: "A$29,710 (visa requirement)",
      visaLabel: "Visa + OSHC",
      visaValue: "A$1,600 + ~A$609/yr",
      flightValue: "NPR 100k–160k one-way",
    },
    links: [
      { label: "Aus visa — Subclass 500", url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500" },
      { label: "Study Australia", url: "https://www.studyaustralia.gov.au/" },
      { label: "Australian Embassy Kathmandu", url: "https://nepal.embassy.gov.au/" },
    ],
  },

  Canada: {
    code: "Canada",
    name: "Canada",
    flag: "\u{1F1E8}\u{1F1E6}",
    pitch:
      "Multi-intake (Sept + Jan + May), up to 3-year Post-Graduation Work Permit, clear PR pathway via Express Entry.",
    primaryIntake: { month: 8, label: "September 2026" },
    secondaryIntake: { month: 0, label: "January 2027" },
    factStrip: [
      {
        label: "Visa class",
        value: "Study Permit",
        detail: "Issued by IRCC. Includes auto-issued visitor visa for entry.",
      },
      {
        label: "Visa fee",
        value: "C$150",
        detail: "+ C$85 biometrics fee.",
      },
      {
        label: "Apply visa from",
        value: "After LOA",
        detail: "Once you have Letter of Acceptance + PAL. Allow 8-12 weeks for Nepal SDS.",
      },
      {
        label: "Maintenance proof",
        value: "C$20,635",
        detail: "Doubled in Jan 2024. + first-year tuition. Required as GIC for SDS.",
      },
      {
        label: "Post-study work",
        value: "1–3 years",
        detail: "PGWP. Length matches programme. Bachelor's 4 yr → 3 yr PGWP.",
      },
    ],
    timeline: [
      {
        monthIdx: 8,
        yearOffset: -1,
        kind: "prep",
        title: "Start: shortlist DLI universities",
        detail: "Must be a Designated Learning Institution. Province quotas now limit acceptances — apply early.",
      },
      {
        monthIdx: 9,
        yearOffset: -1,
        kind: "test",
        title: "Book IELTS Academic",
        detail: "SDS stream requires 6.0 each band (or PTE 60). General not accepted.",
      },
      {
        monthIdx: 11,
        yearOffset: -1,
        kind: "deadline",
        title: "Apply to universities",
        detail: "Most Canadian unis open Nov-Jan for Sept intake. Apply with deadlines Feb-May.",
      },
      {
        monthIdx: 2,
        yearOffset: 0,
        kind: "prep",
        title: "Get LOA + PAL + GIC",
        detail: "Letter of Acceptance, Provincial Attestation Letter (new), and C$20,635 GIC from Scotiabank/RBC/CIBC/ICICI.",
      },
      {
        monthIdx: 3,
        yearOffset: 0,
        kind: "visa",
        title: "Apply for Study Permit (SDS)",
        detail: "Online via IRCC portal. Nepal SDS: faster than regular stream if eligible.",
      },
      {
        monthIdx: 5,
        yearOffset: 0,
        kind: "prep",
        title: "Medical exam (mandatory)",
        detail: "IOM Kathmandu — panel physician list on IRCC site.",
      },
      {
        monthIdx: 8,
        yearOffset: 0,
        kind: "intake",
        title: "September intake — arrive",
        detail: "Most courses begin first week of September. Arrange housing 6+ weeks early.",
      },
    ],
    scholarships: [
      {
        name: "Vanier Canada Graduate Scholarships",
        funder: "Government of Canada",
        covers: "C$50,000 / year for 3 years",
        eligibility: "Doctoral students nominated by a Canadian uni. Highly competitive.",
        cycleOpens: "September (uni-internal deadline; CIHR deadline early Nov)",
        url: "https://vanier.gc.ca/en/home-accueil.html",
      },
      {
        name: "Trudeau Foundation Scholarships",
        funder: "Pierre Elliott Trudeau Foundation",
        covers: "C$60,000 / year for 3 years (doctoral)",
        eligibility: "International PhD students in humanities + social sciences at Canadian unis.",
        cycleOpens: "October-December",
        url: "https://www.trudeaufoundation.ca/scholarships",
      },
      {
        name: "University of Toronto Lester B. Pearson",
        funder: "U of T",
        covers: "Full tuition + books + residence (4 yr UG)",
        eligibility: "Internationally recognised top students, nominated by their school. Annual deadline Jan.",
        cycleOpens: "September (school nomination by Nov)",
        url: "https://future.utoronto.ca/pearson/",
      },
      {
        name: "University entrance awards",
        funder: "Individual Canadian universities",
        covers: "C$2,000-C$20,000 / year",
        eligibility: "Most unis (UBC, McGill, Waterloo, McMaster, Queen's) offer entrance awards on admission.",
        cycleOpens: "On offer of admission",
        url: "https://www.educanada.ca/scholarships-bourses/index.aspx",
      },
    ],
    cost: {
      tuitionLabel: "Tuition / year",
      tuitionValue: "C$17k–C$45k",
      livingLabel: "Living (12 mo)",
      livingValue: "C$20,635 (GIC requirement)",
      visaLabel: "Permit + biometrics",
      visaValue: "C$150 + C$85",
      flightValue: "NPR 95k–155k one-way",
    },
    links: [
      { label: "IRCC — Study Permit", url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html" },
      { label: "EduCanada", url: "https://www.educanada.ca/" },
      { label: "Canada Visa Application Centre (Kathmandu)", url: "https://visa.vfsglobal.com/npl/en/can" },
    ],
  },

  USA: {
    code: "USA",
    name: "United States",
    flag: "\u{1F1FA}\u{1F1F8}",
    pitch:
      "Largest range of programmes globally, generous merit aid at private unis, OPT gives 12-36 months of work after graduation.",
    primaryIntake: { month: 7, label: "August 2026" }, // Fall = Aug idx 7
    secondaryIntake: { month: 0, label: "January 2027" },
    factStrip: [
      {
        label: "Visa class",
        value: "F-1",
        detail: "Academic student visa. M-1 for vocational only.",
      },
      {
        label: "Visa fee",
        value: "$185 + $350",
        detail: "MRV fee + SEVIS I-901 fee.",
      },
      {
        label: "Apply visa from",
        value: "5 months",
        detail: "Earliest = 365 days before I-20 start date for application; entry within 30 days.",
      },
      {
        label: "Maintenance proof",
        value: "Varies",
        detail: "I-20 shows the figure (~$25k-$80k including tuition).",
      },
      {
        label: "Post-study work",
        value: "12–36 mo OPT",
        detail: "12 mo standard + 24 mo STEM extension. Plus CPT during studies.",
      },
    ],
    timeline: [
      {
        monthIdx: 7,
        yearOffset: -1,
        kind: "prep",
        title: "Start: SAT/GRE + university list",
        detail: "12 months out from Fall. SAT/ACT for undergrad, GRE/GMAT for many master's (now optional at most).",
      },
      {
        monthIdx: 8,
        yearOffset: -1,
        kind: "test",
        title: "Take TOEFL / IELTS / Duolingo",
        detail: "Top unis: TOEFL 100+ / IELTS 7+. Mid-tier: TOEFL 80 / IELTS 6.5.",
      },
      {
        monthIdx: 10,
        yearOffset: -1,
        kind: "deadline",
        title: "Common App / direct applications open",
        detail: "Aug 1 for Fall intake. Early Decision deadlines mid-Nov.",
      },
      {
        monthIdx: 0,
        yearOffset: 0,
        kind: "deadline",
        title: "Regular Decision deadlines",
        detail: "Most US unis: Jan 1-15 for undergrad. PG varies — top schools Dec-Jan.",
      },
      {
        monthIdx: 3,
        yearOffset: 0,
        kind: "prep",
        title: "Get I-20 from chosen uni",
        detail: "Accept offer, pay SEVIS fee, university issues Form I-20.",
      },
      {
        monthIdx: 4,
        yearOffset: 0,
        kind: "visa",
        title: "Book F-1 interview at US Embassy KTM",
        detail: "Pay MRV fee, complete DS-160, schedule biometrics + visa interview. Slots fill 4-8 weeks ahead.",
      },
      {
        monthIdx: 7,
        yearOffset: 0,
        kind: "intake",
        title: "Fall intake — arrive late August",
        detail: "Enter US no more than 30 days before I-20 start date.",
      },
    ],
    scholarships: [
      {
        name: "Fulbright Foreign Student Program",
        funder: "US State Department + USEF Nepal",
        covers: "Full tuition + living + flights + health insurance (master's)",
        eligibility: "Nepali graduates with strong academic record. Highly competitive, ~10-15 selected/year.",
        cycleOpens: "March (closes May for following year)",
        url: "https://www.usefnepal.org/fulbright-foreign-student-program",
      },
      {
        name: "Hubert Humphrey Fellowship",
        funder: "US State Department + USEF Nepal",
        covers: "Full tuition + living for 10-12 months (non-degree)",
        eligibility: "Mid-career professionals with 5+ years experience in public service.",
        cycleOpens: "April (closes July)",
        url: "https://www.usefnepal.org/humphrey-fellowship-program",
      },
      {
        name: "University need + merit aid",
        funder: "US universities (private esp.)",
        covers: "Up to full-cost-of-attendance at need-blind unis",
        eligibility: "Strong academics. Harvard, Yale, Princeton, MIT, Amherst, Williams are need-blind for internationals.",
        cycleOpens: "With admission application (Jan-Mar)",
        url: "https://educationusa.state.gov/find-financial-aid",
      },
      {
        name: "AAUW International Fellowship",
        funder: "American Association of University Women",
        covers: "$20,000-$50,000 / year (women only)",
        eligibility: "Nepali women pursuing full-time master's/doctoral in US.",
        cycleOpens: "August (closes November)",
        url: "https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/international/",
      },
    ],
    cost: {
      tuitionLabel: "Tuition / year",
      tuitionValue: "$20k–$80k",
      livingLabel: "Living (9 mo)",
      livingValue: "$12k–$25k (varies by city)",
      visaLabel: "MRV + SEVIS",
      visaValue: "$185 + $350",
      flightValue: "NPR 110k–180k one-way",
    },
    links: [
      { label: "US Embassy Nepal — Visas", url: "https://np.usembassy.gov/visas/" },
      { label: "EducationUSA Nepal (USEF)", url: "https://www.usefnepal.org/" },
      { label: "Study in the States (DHS)", url: "https://studyinthestates.dhs.gov/" },
    ],
  },
};

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** All supported country codes — drives the country switcher and validation. */
export const ALL_COUNTRY_CODES: CountryCode[] = ["UK", "Australia", "Canada", "USA"];

/** Map an arbitrary student.target_countries entry to a CountryCode, or null. */
export function normaliseCountry(raw: string | null | undefined): CountryCode | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (["uk", "united kingdom", "britain", "england"].includes(v)) return "UK";
  if (["australia", "aus", "au"].includes(v)) return "Australia";
  if (["canada", "can", "ca"].includes(v)) return "Canada";
  if (["usa", "us", "united states", "america"].includes(v)) return "USA";
  return null;
}

/** From the student's target_countries array, return the supported subset
 *  (preserving order, deduped). Falls back to ["UK"] when nothing is set. */
export function resolveTargetCountries(raw: string[] | null | undefined): CountryCode[] {
  if (!raw || raw.length === 0) return ["UK"];
  const seen = new Set<CountryCode>();
  const out: CountryCode[] = [];
  for (const r of raw) {
    const code = normaliseCountry(r);
    if (code && !seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out.length === 0 ? ["UK"] : out;
}

/** A single pending todo — the chat sidebar's "To-do" section and the
 *  dashboard hero both feed off this same priority list, so the student
 *  never sees two surfaces disagree about what's most important. */
export interface PendingTodo {
  id: string;
  title: string;
  detail: string;
  /** If set, deep-links to /chat with this question pre-loaded */
  query?: string;
  /** If set, navigates directly to this internal URL */
  href?: string;
}

/** Ordered list of what the student still needs to do, given what's already
 *  uploaded + their profile state. Priority is:
 *    1. profile (gates all recommendations)
 *    2. IELTS (long-lead booking)
 *    3. transcript (attestation takes weeks)
 *    4. passport
 *    5. SOP (writing takes weeks)
 *    6. financial proof
 *    7. recommendation letters
 *    8. shortlist (always last, never blocking)
 */
export function pickPendingTodos(
  profileCompleted: boolean,
  uploadedDocTypes: Set<string>,
  countryName: string,
  field: string,
  limit = 3,
): PendingTodo[] {
  const items: PendingTodo[] = [];
  const fieldLabel = field || "my field";

  if (!profileCompleted) {
    items.push({
      id: "profile",
      title: "Finish your study profile",
      detail: "Add GPA, country, field — sharpens every recommendation.",
      href: "/onboarding/details",
    });
  }
  if (!uploadedDocTypes.has("ielts")) {
    items.push({
      id: "ielts",
      title: "Book IELTS / PTE",
      detail: "Slots fill 4–6 weeks ahead in Kathmandu.",
      query: `Help me book IELTS for ${countryName} — when, where, how to prepare.`,
    });
  }
  if (!uploadedDocTypes.has("grade_sheet")) {
    items.push({
      id: "transcript",
      title: "Get transcript attested",
      detail: "MoEST + MoFA. Allow ~2 weeks.",
      query: `Walk me through getting my NEB transcript attested for ${countryName}.`,
    });
  }
  if (!uploadedDocTypes.has("passport")) {
    items.push({
      id: "passport",
      title: "Confirm passport is ready",
      detail: "Valid for course + 6 months.",
      query: `What passport validity do I need for ${countryName}?`,
    });
  }
  if (!uploadedDocTypes.has("sop")) {
    items.push({
      id: "sop",
      title: "Draft your SOP",
      detail: "500–1,000 words per university.",
      query: `Help me outline my SOP for ${fieldLabel} in ${countryName}.`,
    });
  }
  if (!uploadedDocTypes.has("financial")) {
    items.push({
      id: "financial",
      title: "Prepare financial proof",
      detail: "Bank statement + sponsor or loan letter.",
      query: `Help me plan financial proof for a ${countryName} student visa.`,
    });
  }
  if (!uploadedDocTypes.has("recommendation")) {
    items.push({
      id: "lor",
      title: "Line up 2 LORs",
      detail: "Recent teachers. Give 4+ weeks notice.",
      query: `Help me draft an LOR request for a ${fieldLabel} teacher.`,
    });
  }
  items.push({
    id: "shortlist",
    title: "Shortlist 5 universities",
    detail: "2 reach + 2 match + 1 safety.",
    query: `Suggest 5 ${countryName} universities for ${fieldLabel} that fit my profile.`,
  });

  return items.slice(0, limit);
}

/** Get the next sensible intake date for a given country, at least 4 months
 *  away. Returns a Date for the 1st of the month, plus a human label and a
 *  months-out number. */
export function nextIntakeFor(country: CountryCode, now = new Date()): {
  date: Date;
  label: string;
  monthsOut: number;
} {
  const profile = COUNTRY_PROFILES[country];
  const candidates = [profile.primaryIntake];
  if (profile.secondaryIntake) candidates.push(profile.secondaryIntake);

  let best: { date: Date; label: string; monthsOut: number } | null = null;
  for (const intake of candidates) {
    for (let yearOff = 0; yearOff < 2; yearOff++) {
      const year = now.getFullYear() + yearOff;
      const date = new Date(year, intake.month, 1);
      const monthsOut = Math.round(
        (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.4),
      );
      if (monthsOut < 4) continue;
      if (!best || date < best.date) {
        const monthName = date.toLocaleString("default", { month: "long" });
        best = { date, label: `${monthName} ${year}`, monthsOut };
      }
    }
  }
  // Fallback — 12 months out
  if (!best) {
    const date = new Date(now.getFullYear() + 1, profile.primaryIntake.month, 1);
    const monthName = date.toLocaleString("default", { month: "long" });
    best = { date, label: `${monthName} ${date.getFullYear()}`, monthsOut: 12 };
  }
  return best;
}
