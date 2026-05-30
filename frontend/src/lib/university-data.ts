/**
 * Curated university + course data for the Abroadly student dashboard.
 *
 * This is INTENTIONALLY hand-curated rather than scraped — it lets us encode
 * realistic entry expectations for Nepali students (where the official
 * "minimum GPA" published by a university is often higher than what they
 * actually accept). Numbers are indicative for 2025-26; verify on each
 * university's official "International students" page before applying.
 *
 * The matching tier (Reach / Match / Safety) is computed from the student's
 * NEB +2 percentage relative to `entry_pct_min`:
 *   - Reach:  student is 0–6 pts below
 *   - Match:  student is at or above
 *   - Safety: student is 8+ pts above (high confidence of admission)
 *
 * If we can't compute (no GPA on profile), we mark all as "Match" so the
 * student still sees options.
 */

export type UniversityTier = "russell" | "go8" | "u15" | "ivy_plus" | "mid_research" | "modern" | "regional";
export type AdmissionFit = "reach" | "match" | "safety" | "unknown";

export interface University {
  /** Stable slug — used as key */
  id: string;
  name: string;
  country: "UK" | "Australia" | "Canada" | "USA" | "Germany";
  city: string;
  tier: UniversityTier;
  /** Indicative annual tuition for international students, in destination currency */
  tuition_min: number;
  tuition_max: number;
  tuition_currency: "GBP" | "AUD" | "CAD" | "USD" | "EUR";
  /** Approximate minimum NEB +2 percentage they consider for international students.
   *  This is the realistic floor — not the published "minimum GPA" which is often inflated. */
  entry_pct_min: number;
  /** Minimum IELTS overall band typically accepted (for undergraduate; postgraduate is usually higher) */
  ielts_min: number;
  /** Fields this university is genuinely known for — drives course recommendations */
  strengths: ("cs" | "engineering" | "business" | "nursing" | "design" | "social_science" | "law" | "medicine" | "data_science")[];
  /** Public URL students can click through to */
  official_url: string;
}

export interface Course {
  id: string;
  university_id: string;
  level: "undergraduate" | "postgraduate";
  /** Display name as the university lists it */
  name: string;
  /** Internal field tag — matched against student.preferred_field */
  field: "cs" | "engineering" | "business" | "nursing" | "design" | "social_science" | "law" | "medicine" | "data_science";
  /** Duration in years (1, 1.5, 2, 3, 4) */
  duration_years: number;
}

/* ── Universities — UK (deepest list, our home corpus) ────────────────── */

export const UNIVERSITIES: University[] = [
  // Russell Group / elite
  { id: "ox", name: "University of Oxford", country: "UK", city: "Oxford", tier: "russell", tuition_min: 33000, tuition_max: 48000, tuition_currency: "GBP", entry_pct_min: 88, ielts_min: 7.5, strengths: ["cs", "engineering", "business", "law", "medicine", "social_science"], official_url: "https://www.ox.ac.uk/admissions/undergraduate" },
  { id: "cam", name: "University of Cambridge", country: "UK", city: "Cambridge", tier: "russell", tuition_min: 33000, tuition_max: 48000, tuition_currency: "GBP", entry_pct_min: 88, ielts_min: 7.5, strengths: ["cs", "engineering", "business", "law", "medicine", "social_science", "data_science"], official_url: "https://www.undergraduate.study.cam.ac.uk/" },
  { id: "imperial", name: "Imperial College London", country: "UK", city: "London", tier: "russell", tuition_min: 37900, tuition_max: 45300, tuition_currency: "GBP", entry_pct_min: 82, ielts_min: 7.0, strengths: ["cs", "engineering", "data_science", "medicine"], official_url: "https://www.imperial.ac.uk/study/" },
  { id: "ucl", name: "University College London (UCL)", country: "UK", city: "London", tier: "russell", tuition_min: 29400, tuition_max: 40300, tuition_currency: "GBP", entry_pct_min: 78, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "social_science", "law", "medicine", "design"], official_url: "https://www.ucl.ac.uk/prospective-students/" },
  { id: "lse", name: "London School of Economics (LSE)", country: "UK", city: "London", tier: "russell", tuition_min: 25608, tuition_max: 29712, tuition_currency: "GBP", entry_pct_min: 82, ielts_min: 7.0, strengths: ["business", "social_science", "law"], official_url: "https://www.lse.ac.uk/" },
  { id: "kcl", name: "King's College London", country: "UK", city: "London", tier: "russell", tuition_min: 24000, tuition_max: 40000, tuition_currency: "GBP", entry_pct_min: 75, ielts_min: 6.5, strengths: ["business", "nursing", "law", "medicine", "social_science"], official_url: "https://www.kcl.ac.uk/" },
  { id: "manchester", name: "University of Manchester", country: "UK", city: "Manchester", tier: "russell", tuition_min: 24500, tuition_max: 35500, tuition_currency: "GBP", entry_pct_min: 72, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "nursing", "data_science"], official_url: "https://www.manchester.ac.uk/" },
  { id: "edinburgh", name: "University of Edinburgh", country: "UK", city: "Edinburgh", tier: "russell", tuition_min: 25300, tuition_max: 35900, tuition_currency: "GBP", entry_pct_min: 75, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "data_science", "social_science"], official_url: "https://www.ed.ac.uk/" },
  { id: "bristol", name: "University of Bristol", country: "UK", city: "Bristol", tier: "russell", tuition_min: 25300, tuition_max: 29600, tuition_currency: "GBP", entry_pct_min: 72, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "design"], official_url: "https://www.bristol.ac.uk/" },
  { id: "warwick", name: "University of Warwick", country: "UK", city: "Coventry", tier: "russell", tuition_min: 24800, tuition_max: 34200, tuition_currency: "GBP", entry_pct_min: 75, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "data_science"], official_url: "https://warwick.ac.uk/" },
  { id: "glasgow", name: "University of Glasgow", country: "UK", city: "Glasgow", tier: "russell", tuition_min: 22500, tuition_max: 29650, tuition_currency: "GBP", entry_pct_min: 70, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "nursing"], official_url: "https://www.gla.ac.uk/" },
  { id: "durham", name: "Durham University", country: "UK", city: "Durham", tier: "russell", tuition_min: 23250, tuition_max: 32200, tuition_currency: "GBP", entry_pct_min: 75, ielts_min: 6.5, strengths: ["business", "social_science", "law"], official_url: "https://www.durham.ac.uk/" },
  { id: "leeds", name: "University of Leeds", country: "UK", city: "Leeds", tier: "russell", tuition_min: 22500, tuition_max: 31500, tuition_currency: "GBP", entry_pct_min: 70, ielts_min: 6.5, strengths: ["engineering", "business", "nursing", "design"], official_url: "https://www.leeds.ac.uk/" },
  { id: "sheffield", name: "University of Sheffield", country: "UK", city: "Sheffield", tier: "russell", tuition_min: 22000, tuition_max: 31000, tuition_currency: "GBP", entry_pct_min: 68, ielts_min: 6.5, strengths: ["cs", "engineering", "data_science"], official_url: "https://www.sheffield.ac.uk/" },
  { id: "newcastle", name: "Newcastle University", country: "UK", city: "Newcastle", tier: "russell", tuition_min: 22000, tuition_max: 30000, tuition_currency: "GBP", entry_pct_min: 65, ielts_min: 6.5, strengths: ["engineering", "business", "nursing"], official_url: "https://www.ncl.ac.uk/" },
  // Strong mid-tier
  { id: "lancaster", name: "Lancaster University", country: "UK", city: "Lancaster", tier: "mid_research", tuition_min: 22500, tuition_max: 30000, tuition_currency: "GBP", entry_pct_min: 68, ielts_min: 6.5, strengths: ["cs", "engineering", "business"], official_url: "https://www.lancaster.ac.uk/" },
  { id: "loughborough", name: "Loughborough University", country: "UK", city: "Loughborough", tier: "mid_research", tuition_min: 22500, tuition_max: 29500, tuition_currency: "GBP", entry_pct_min: 65, ielts_min: 6.5, strengths: ["engineering", "business", "design"], official_url: "https://www.lboro.ac.uk/" },
  { id: "bath", name: "University of Bath", country: "UK", city: "Bath", tier: "mid_research", tuition_min: 23000, tuition_max: 28000, tuition_currency: "GBP", entry_pct_min: 70, ielts_min: 6.5, strengths: ["cs", "engineering", "business"], official_url: "https://www.bath.ac.uk/" },
  { id: "surrey", name: "University of Surrey", country: "UK", city: "Guildford", tier: "mid_research", tuition_min: 20000, tuition_max: 26000, tuition_currency: "GBP", entry_pct_min: 60, ielts_min: 6.5, strengths: ["business", "engineering", "nursing"], official_url: "https://www.surrey.ac.uk/" },
  { id: "york", name: "University of York", country: "UK", city: "York", tier: "mid_research", tuition_min: 22000, tuition_max: 27500, tuition_currency: "GBP", entry_pct_min: 65, ielts_min: 6.5, strengths: ["cs", "social_science", "design"], official_url: "https://www.york.ac.uk/" },
  // Modern / post-1992 (Nepali-friendly mid-tier)
  { id: "coventry", name: "Coventry University", country: "UK", city: "Coventry", tier: "modern", tuition_min: 18000, tuition_max: 22000, tuition_currency: "GBP", entry_pct_min: 55, ielts_min: 6.0, strengths: ["engineering", "business", "nursing", "cs"], official_url: "https://www.coventry.ac.uk/" },
  { id: "uwe", name: "University of the West of England (UWE Bristol)", country: "UK", city: "Bristol", tier: "modern", tuition_min: 16000, tuition_max: 20000, tuition_currency: "GBP", entry_pct_min: 55, ielts_min: 6.0, strengths: ["business", "engineering", "nursing"], official_url: "https://www.uwe.ac.uk/" },
  { id: "hertfordshire", name: "University of Hertfordshire", country: "UK", city: "Hatfield", tier: "modern", tuition_min: 14975, tuition_max: 18250, tuition_currency: "GBP", entry_pct_min: 50, ielts_min: 6.0, strengths: ["business", "cs", "engineering", "nursing"], official_url: "https://www.herts.ac.uk/" },
  { id: "northumbria", name: "Northumbria University", country: "UK", city: "Newcastle", tier: "modern", tuition_min: 16500, tuition_max: 20500, tuition_currency: "GBP", entry_pct_min: 55, ielts_min: 6.0, strengths: ["business", "cs", "nursing", "design"], official_url: "https://www.northumbria.ac.uk/" },
  { id: "westminster", name: "University of Westminster", country: "UK", city: "London", tier: "modern", tuition_min: 16400, tuition_max: 20500, tuition_currency: "GBP", entry_pct_min: 55, ielts_min: 6.0, strengths: ["business", "cs", "law", "design"], official_url: "https://www.westminster.ac.uk/" },
  { id: "greenwich", name: "University of Greenwich", country: "UK", city: "London", tier: "modern", tuition_min: 17000, tuition_max: 19000, tuition_currency: "GBP", entry_pct_min: 50, ielts_min: 6.0, strengths: ["business", "engineering", "cs", "nursing"], official_url: "https://www.gre.ac.uk/" },
  { id: "demontfort", name: "De Montfort University", country: "UK", city: "Leicester", tier: "modern", tuition_min: 15750, tuition_max: 18250, tuition_currency: "GBP", entry_pct_min: 50, ielts_min: 6.0, strengths: ["business", "cs", "engineering", "design", "nursing"], official_url: "https://www.dmu.ac.uk/" },
  { id: "bcu", name: "Birmingham City University", country: "UK", city: "Birmingham", tier: "modern", tuition_min: 14310, tuition_max: 17950, tuition_currency: "GBP", entry_pct_min: 50, ielts_min: 6.0, strengths: ["business", "cs", "nursing", "design"], official_url: "https://www.bcu.ac.uk/" },
  { id: "salford", name: "University of Salford", country: "UK", city: "Manchester", tier: "modern", tuition_min: 16380, tuition_max: 19170, tuition_currency: "GBP", entry_pct_min: 50, ielts_min: 6.0, strengths: ["business", "engineering", "nursing"], official_url: "https://www.salford.ac.uk/" },

  /* ── Australia — Group of Eight + strong mid-tier ──────────────────── */
  { id: "melbourne", name: "University of Melbourne", country: "Australia", city: "Melbourne", tier: "go8", tuition_min: 42000, tuition_max: 52000, tuition_currency: "AUD", entry_pct_min: 80, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "medicine", "law"], official_url: "https://study.unimelb.edu.au/" },
  { id: "sydney", name: "University of Sydney", country: "Australia", city: "Sydney", tier: "go8", tuition_min: 47000, tuition_max: 55000, tuition_currency: "AUD", entry_pct_min: 78, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "medicine"], official_url: "https://www.sydney.edu.au/" },
  { id: "anu", name: "Australian National University (ANU)", country: "Australia", city: "Canberra", tier: "go8", tuition_min: 46000, tuition_max: 53000, tuition_currency: "AUD", entry_pct_min: 75, ielts_min: 6.5, strengths: ["cs", "engineering", "social_science", "data_science"], official_url: "https://www.anu.edu.au/" },
  { id: "unsw", name: "UNSW Sydney", country: "Australia", city: "Sydney", tier: "go8", tuition_min: 42000, tuition_max: 53000, tuition_currency: "AUD", entry_pct_min: 75, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "data_science"], official_url: "https://www.unsw.edu.au/" },
  { id: "monash", name: "Monash University", country: "Australia", city: "Melbourne", tier: "go8", tuition_min: 38000, tuition_max: 50000, tuition_currency: "AUD", entry_pct_min: 70, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "nursing", "medicine"], official_url: "https://www.monash.edu/" },
  { id: "uq", name: "University of Queensland (UQ)", country: "Australia", city: "Brisbane", tier: "go8", tuition_min: 38000, tuition_max: 50000, tuition_currency: "AUD", entry_pct_min: 70, ielts_min: 6.5, strengths: ["engineering", "business", "nursing", "medicine"], official_url: "https://www.uq.edu.au/" },
  { id: "uwa", name: "University of Western Australia (UWA)", country: "Australia", city: "Perth", tier: "go8", tuition_min: 38000, tuition_max: 50000, tuition_currency: "AUD", entry_pct_min: 68, ielts_min: 6.5, strengths: ["engineering", "business", "nursing"], official_url: "https://www.uwa.edu.au/" },
  { id: "deakin", name: "Deakin University", country: "Australia", city: "Melbourne", tier: "mid_research", tuition_min: 32000, tuition_max: 42000, tuition_currency: "AUD", entry_pct_min: 60, ielts_min: 6.0, strengths: ["business", "cs", "engineering", "nursing"], official_url: "https://www.deakin.edu.au/" },
  { id: "rmit", name: "RMIT University", country: "Australia", city: "Melbourne", tier: "mid_research", tuition_min: 32000, tuition_max: 45000, tuition_currency: "AUD", entry_pct_min: 60, ielts_min: 6.0, strengths: ["design", "engineering", "business", "cs"], official_url: "https://www.rmit.edu.au/" },
  { id: "latrobe", name: "La Trobe University", country: "Australia", city: "Melbourne", tier: "mid_research", tuition_min: 30000, tuition_max: 40000, tuition_currency: "AUD", entry_pct_min: 55, ielts_min: 6.0, strengths: ["business", "nursing", "cs"], official_url: "https://www.latrobe.edu.au/" },

  /* ── Canada — strong picks ─────────────────────────────────────────── */
  { id: "toronto", name: "University of Toronto", country: "Canada", city: "Toronto", tier: "u15", tuition_min: 45000, tuition_max: 67000, tuition_currency: "CAD", entry_pct_min: 80, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "medicine", "data_science"], official_url: "https://www.utoronto.ca/" },
  { id: "ubc", name: "University of British Columbia (UBC)", country: "Canada", city: "Vancouver", tier: "u15", tuition_min: 42000, tuition_max: 58000, tuition_currency: "CAD", entry_pct_min: 78, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "medicine"], official_url: "https://www.ubc.ca/" },
  { id: "mcgill", name: "McGill University", country: "Canada", city: "Montreal", tier: "u15", tuition_min: 35000, tuition_max: 60000, tuition_currency: "CAD", entry_pct_min: 78, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "medicine"], official_url: "https://www.mcgill.ca/" },
  { id: "waterloo", name: "University of Waterloo", country: "Canada", city: "Waterloo", tier: "u15", tuition_min: 40000, tuition_max: 65000, tuition_currency: "CAD", entry_pct_min: 78, ielts_min: 6.5, strengths: ["cs", "engineering", "data_science"], official_url: "https://uwaterloo.ca/" },
  { id: "mcmaster", name: "McMaster University", country: "Canada", city: "Hamilton", tier: "u15", tuition_min: 40000, tuition_max: 55000, tuition_currency: "CAD", entry_pct_min: 72, ielts_min: 6.5, strengths: ["engineering", "nursing", "medicine", "business"], official_url: "https://www.mcmaster.ca/" },
  { id: "alberta", name: "University of Alberta", country: "Canada", city: "Edmonton", tier: "u15", tuition_min: 30000, tuition_max: 45000, tuition_currency: "CAD", entry_pct_min: 65, ielts_min: 6.5, strengths: ["engineering", "business", "nursing", "cs"], official_url: "https://www.ualberta.ca/" },
  { id: "calgary", name: "University of Calgary", country: "Canada", city: "Calgary", tier: "u15", tuition_min: 28000, tuition_max: 42000, tuition_currency: "CAD", entry_pct_min: 62, ielts_min: 6.5, strengths: ["engineering", "business", "nursing", "cs"], official_url: "https://www.ucalgary.ca/" },
  { id: "manitoba", name: "University of Manitoba", country: "Canada", city: "Winnipeg", tier: "u15", tuition_min: 22000, tuition_max: 35000, tuition_currency: "CAD", entry_pct_min: 55, ielts_min: 6.5, strengths: ["engineering", "business", "nursing"], official_url: "https://umanitoba.ca/" },
  { id: "concordia", name: "Concordia University", country: "Canada", city: "Montreal", tier: "mid_research", tuition_min: 28000, tuition_max: 42000, tuition_currency: "CAD", entry_pct_min: 60, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "design"], official_url: "https://www.concordia.ca/" },
  { id: "windsor", name: "University of Windsor", country: "Canada", city: "Windsor", tier: "mid_research", tuition_min: 26000, tuition_max: 38000, tuition_currency: "CAD", entry_pct_min: 55, ielts_min: 6.5, strengths: ["cs", "engineering", "business", "nursing"], official_url: "https://www.uwindsor.ca/" },

  /* ── USA — selective picks ─────────────────────────────────────────── */
  { id: "mit", name: "Massachusetts Institute of Technology (MIT)", country: "USA", city: "Cambridge MA", tier: "ivy_plus", tuition_min: 60000, tuition_max: 65000, tuition_currency: "USD", entry_pct_min: 90, ielts_min: 7.0, strengths: ["cs", "engineering", "data_science", "business"], official_url: "https://www.mit.edu/" },
  { id: "stanford", name: "Stanford University", country: "USA", city: "Stanford CA", tier: "ivy_plus", tuition_min: 60000, tuition_max: 65000, tuition_currency: "USD", entry_pct_min: 90, ielts_min: 7.0, strengths: ["cs", "engineering", "business", "medicine", "law"], official_url: "https://www.stanford.edu/" },
  { id: "harvard", name: "Harvard University", country: "USA", city: "Cambridge MA", tier: "ivy_plus", tuition_min: 60000, tuition_max: 65000, tuition_currency: "USD", entry_pct_min: 90, ielts_min: 7.0, strengths: ["business", "law", "medicine", "social_science"], official_url: "https://www.harvard.edu/" },
  { id: "cmu", name: "Carnegie Mellon University", country: "USA", city: "Pittsburgh PA", tier: "ivy_plus", tuition_min: 55000, tuition_max: 65000, tuition_currency: "USD", entry_pct_min: 85, ielts_min: 7.0, strengths: ["cs", "engineering", "data_science", "design"], official_url: "https://www.cmu.edu/" },
  { id: "ucla", name: "UCLA", country: "USA", city: "Los Angeles CA", tier: "ivy_plus", tuition_min: 45000, tuition_max: 55000, tuition_currency: "USD", entry_pct_min: 80, ielts_min: 7.0, strengths: ["cs", "engineering", "business", "medicine"], official_url: "https://www.ucla.edu/" },
  { id: "purdue", name: "Purdue University", country: "USA", city: "West Lafayette IN", tier: "mid_research", tuition_min: 30000, tuition_max: 35000, tuition_currency: "USD", entry_pct_min: 70, ielts_min: 6.5, strengths: ["engineering", "cs", "business"], official_url: "https://www.purdue.edu/" },
  { id: "asu", name: "Arizona State University", country: "USA", city: "Tempe AZ", tier: "mid_research", tuition_min: 32000, tuition_max: 38000, tuition_currency: "USD", entry_pct_min: 60, ielts_min: 6.5, strengths: ["cs", "engineering", "business"], official_url: "https://www.asu.edu/" },
  { id: "syracuse", name: "Syracuse University", country: "USA", city: "Syracuse NY", tier: "mid_research", tuition_min: 55000, tuition_max: 60000, tuition_currency: "USD", entry_pct_min: 65, ielts_min: 6.5, strengths: ["business", "social_science", "design"], official_url: "https://www.syracuse.edu/" },
  { id: "umass", name: "UMass Amherst", country: "USA", city: "Amherst MA", tier: "mid_research", tuition_min: 38000, tuition_max: 42000, tuition_currency: "USD", entry_pct_min: 65, ielts_min: 6.5, strengths: ["cs", "engineering", "business"], official_url: "https://www.umass.edu/" },
  { id: "iastate", name: "Iowa State University", country: "USA", city: "Ames IA", tier: "regional", tuition_min: 26000, tuition_max: 30000, tuition_currency: "USD", entry_pct_min: 55, ielts_min: 6.5, strengths: ["engineering", "business", "cs"], official_url: "https://www.iastate.edu/" },
];

/* ── Courses (representative — students will search specific names anyway) ── */

export const COURSES: Course[] = [
  // UK CS
  { id: "ucl-msc-cs", university_id: "ucl", level: "postgraduate", name: "MSc Computer Science", field: "cs", duration_years: 1 },
  { id: "imperial-msc-cs", university_id: "imperial", level: "postgraduate", name: "MSc Computing", field: "cs", duration_years: 1 },
  { id: "manchester-msc-ds", university_id: "manchester", level: "postgraduate", name: "MSc Data Science", field: "data_science", duration_years: 1 },
  { id: "edinburgh-msc-ai", university_id: "edinburgh", level: "postgraduate", name: "MSc Artificial Intelligence", field: "cs", duration_years: 1 },
  { id: "sheffield-msc-cs", university_id: "sheffield", level: "postgraduate", name: "MSc Advanced Computer Science", field: "cs", duration_years: 1 },
  { id: "coventry-msc-cs", university_id: "coventry", level: "postgraduate", name: "MSc Computer Science", field: "cs", duration_years: 1 },
  { id: "hertfordshire-msc-cs", university_id: "hertfordshire", level: "postgraduate", name: "MSc Software Engineering", field: "cs", duration_years: 1 },
  // UK engineering
  { id: "imperial-meng", university_id: "imperial", level: "undergraduate", name: "MEng Mechanical Engineering", field: "engineering", duration_years: 4 },
  { id: "manchester-eng", university_id: "manchester", level: "undergraduate", name: "BEng Civil Engineering", field: "engineering", duration_years: 3 },
  { id: "coventry-eng", university_id: "coventry", level: "undergraduate", name: "BEng Mechanical Engineering", field: "engineering", duration_years: 3 },
  // UK business
  { id: "lse-bsc-management", university_id: "lse", level: "undergraduate", name: "BSc Management", field: "business", duration_years: 3 },
  { id: "warwick-bsc-business", university_id: "warwick", level: "undergraduate", name: "BSc International Business", field: "business", duration_years: 3 },
  { id: "manchester-bsc-business", university_id: "manchester", level: "undergraduate", name: "BSc Management", field: "business", duration_years: 3 },
  { id: "hertfordshire-bsc-business", university_id: "hertfordshire", level: "undergraduate", name: "BA Business Management", field: "business", duration_years: 3 },
  // UK nursing
  { id: "manchester-bsc-nursing", university_id: "manchester", level: "undergraduate", name: "BSc Adult Nursing", field: "nursing", duration_years: 3 },
  { id: "leeds-bsc-nursing", university_id: "leeds", level: "undergraduate", name: "BSc Nursing (Adult)", field: "nursing", duration_years: 3 },
  { id: "hertfordshire-bsc-nursing", university_id: "hertfordshire", level: "undergraduate", name: "BSc Adult Nursing", field: "nursing", duration_years: 3 },
  // Australia CS
  { id: "melbourne-mit-it", university_id: "melbourne", level: "postgraduate", name: "Master of Information Technology", field: "cs", duration_years: 2 },
  { id: "unsw-msit", university_id: "unsw", level: "postgraduate", name: "Master of Information Technology", field: "cs", duration_years: 2 },
  { id: "monash-bcs", university_id: "monash", level: "undergraduate", name: "Bachelor of Computer Science", field: "cs", duration_years: 3 },
  { id: "rmit-bsc-cs", university_id: "rmit", level: "undergraduate", name: "Bachelor of Information Technology", field: "cs", duration_years: 3 },
  // Australia business
  { id: "unsw-bcom", university_id: "unsw", level: "undergraduate", name: "Bachelor of Commerce", field: "business", duration_years: 3 },
  { id: "monash-bcom", university_id: "monash", level: "undergraduate", name: "Bachelor of Business", field: "business", duration_years: 3 },
  { id: "deakin-bcom", university_id: "deakin", level: "undergraduate", name: "Bachelor of Commerce", field: "business", duration_years: 3 },
  // Canada
  { id: "toronto-bsc-cs", university_id: "toronto", level: "undergraduate", name: "Bachelor of Science · Computer Science", field: "cs", duration_years: 4 },
  { id: "waterloo-bcs", university_id: "waterloo", level: "undergraduate", name: "Bachelor of Computer Science", field: "cs", duration_years: 4 },
  { id: "ubc-bsc-cs", university_id: "ubc", level: "undergraduate", name: "BSc Computer Science", field: "cs", duration_years: 4 },
  { id: "alberta-bsc-cs", university_id: "alberta", level: "undergraduate", name: "BSc Computer Science", field: "cs", duration_years: 4 },
  { id: "concordia-meng", university_id: "concordia", level: "postgraduate", name: "Master of Engineering · Software", field: "engineering", duration_years: 1.5 },
  // USA
  { id: "mit-meng-cs", university_id: "mit", level: "postgraduate", name: "MEng Computer Science", field: "cs", duration_years: 1 },
  { id: "cmu-ms-cs", university_id: "cmu", level: "postgraduate", name: "MS Computer Science", field: "cs", duration_years: 2 },
  { id: "purdue-bs-cs", university_id: "purdue", level: "undergraduate", name: "BS Computer Science", field: "cs", duration_years: 4 },
  { id: "asu-bs-cs", university_id: "asu", level: "undergraduate", name: "BS Computer Science", field: "cs", duration_years: 4 },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */

const FIELD_KEYWORDS: Record<Course["field"], string[]> = {
  cs: ["computer", "cs", "software", "computing", "it ", "information tech", "programming"],
  engineering: ["engineer", "mechanical", "civil", "electrical", "robotic", "aerospace"],
  business: ["business", "bba", "management", "marketing", "finance", "commerce", "mba", "economic"],
  nursing: ["nurs", "midwif", "healthcare"],
  design: ["design", "graphic", "ux", "ui", "architecture", "art"],
  social_science: ["sociolog", "psycholog", "international relation", "politic"],
  law: ["law", "legal", "llb"],
  medicine: ["medicine", "medical", "mbbs", "doctor", "dentist"],
  data_science: ["data science", "data analytics", "machine learning", "ml ", "ai ", "artificial intel"],
};

/** Best-effort mapping from the student's free-text `preferred_field` to one of our tags. */
export function inferField(preferredField: string | null | undefined): Course["field"] | null {
  if (!preferredField) return null;
  const f = preferredField.toLowerCase();
  for (const [tag, keywords] of Object.entries(FIELD_KEYWORDS) as [Course["field"], string[]][]) {
    if (keywords.some((k) => f.includes(k))) return tag;
  }
  return null;
}

/**
 * Convert a Nepali GPA (typically 0–4 scale on NEB +2) into an approximate
 * percentage. NEB grade points: A+=4.0, A=3.6, B+=3.2, B=2.8, C+=2.4, C=2.0.
 * Multiplier of 23 gets us close to the published-percentage convention used
 * by Nepali transcripts in international applications.
 */
export function gpaToPercentage(gpa: number | null | undefined, expectedGpa: number | null | undefined): number | null {
  const value = gpa ?? expectedGpa;
  if (value == null || value <= 0) return null;
  // If already a percentage (rare but possible)
  if (value > 10) return Math.min(100, value);
  // 4-scale → percentage. We use 23× as the conservative side of the typical
  // NEB conversion table (4.0 → 92).
  return Math.min(100, Math.round(value * 23));
}

export function classifyFit(studentPct: number | null, entryMin: number): AdmissionFit {
  if (studentPct == null) return "unknown";
  if (studentPct >= entryMin + 8) return "safety";
  if (studentPct >= entryMin) return "match";
  if (studentPct >= entryMin - 6) return "reach";
  return "reach"; // still show, but tagged as reach so the student knows
}

/** Pick up to N universities for a country, ordered by best fit for student. */
export function pickUniversities(
  country: University["country"],
  studentPct: number | null,
  field: Course["field"] | null,
  limit = 8,
): University[] {
  const pool = UNIVERSITIES.filter((u) => u.country === country);
  const scored = pool.map((u) => {
    const fit = classifyFit(studentPct, u.entry_pct_min);
    // Lower score = better. Match is best, then safety, then reach.
    let fitScore = fit === "match" ? 0 : fit === "safety" ? 1 : fit === "reach" ? 2 : 1.5;
    // Bonus if university lists the student's field as a strength
    if (field && u.strengths.includes(field)) fitScore -= 0.4;
    return { u, fitScore };
  });
  scored.sort((a, b) => a.fitScore - b.fitScore);
  return scored.slice(0, limit).map((s) => s.u);
}

/** Pick courses for a country in the student's field. */
export function pickCourses(
  country: University["country"],
  field: Course["field"] | null,
  limit = 6,
): Array<{ course: Course; university: University }> {
  if (!field) return [];
  const unisInCountry = new Set(UNIVERSITIES.filter((u) => u.country === country).map((u) => u.id));
  const matches = COURSES.filter((c) => c.field === field && unisInCountry.has(c.university_id))
    .map((c) => ({
      course: c,
      university: UNIVERSITIES.find((u) => u.id === c.university_id)!,
    }))
    .slice(0, limit);
  return matches;
}

/** Currency symbol for display. */
export function currencySymbol(c: University["tuition_currency"]): string {
  return { GBP: "£", AUD: "A$", CAD: "C$", USD: "$", EUR: "€" }[c];
}
