import Link from "next/link";
import { GoogleSignInButton } from "./google-sign-in-button";

const assurances = [
  "Free for students",
  "No agency pressure",
  "Built for Nepali questions",
];

const steps = [
  {
    title: "Tell it your situation",
    body: "Add your education level, GPA, expected GPA, field, budget worries, and countries you are considering.",
  },
  {
    title: "Ask the messy questions",
    body: "Ask about eligibility, documents, visa steps, scholarships, SOPs, costs, timelines, or what to do first.",
  },
  {
    title: "Leave with a next step",
    body: "Get a clear answer, the gaps you still need to check, and links or document prompts when they matter.",
  },
];

const studentProblems = [
  {
    title: "Am I eligible?",
    body: "Understand whether your grades, level, and goals look realistic before you spend money applying.",
  },
  {
    title: "Which documents do I need?",
    body: "Build a checklist for transcripts, passport, SOP, recommendation letters, finances, and English tests.",
  },
  {
    title: "How much will it cost?",
    body: "Ask about tuition, living costs, deposits, proof of funds, scholarships, and safer budget planning.",
  },
  {
    title: "What should I do next?",
    body: "Turn confusion into a short action plan you can discuss with family, counselors, or universities.",
  },
];

const topics = [
  "UK student route",
  "Australia study visa",
  "Canada planning",
  "Scholarship search",
  "SOP review ideas",
  "Document checklist",
  "Course selection",
  "Budget questions",
  "Nepali student doubts",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf7] text-[#172033]">
      <section className="relative min-h-[92vh] overflow-hidden bg-[#12244a]">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/abroadly-hero.png')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(18,36,74,0.94)_0%,rgba(18,36,74,0.82)_42%,rgba(18,36,74,0.38)_76%,rgba(18,36,74,0.12)_100%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 bg-[linear-gradient(180deg,rgba(251,250,247,0)_0%,#fbfaf7_92%)]" />
        <div className="absolute inset-x-0 top-0 z-30 border-b border-white/15 bg-[#12244a]/38 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <Link href="/" className="ab-focus flex items-center gap-3 rounded-md text-white">
              <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-9 w-9 rounded-md" />
              <span className="text-lg font-black">Abroadly</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm font-semibold text-white/80 md:flex">
              <a className="ab-focus rounded-md hover:text-white" href="#how-it-works">
                How it works
              </a>
              <a className="ab-focus rounded-md hover:text-white" href="#student-problems">
                What it helps with
              </a>
              <Link className="ab-focus rounded-md hover:text-white" href="/chat">
                Open chat
              </Link>
            </div>
            <Link
              href="/onboarding"
              className="ab-focus rounded-md bg-white px-4 py-2 text-sm font-black text-[#12244a] transition hover:bg-[#8fe6c4]"
            >
              Start free
            </Link>
          </nav>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-7xl items-center px-5 pb-24 pt-28 sm:px-8 lg:pt-32">
          <div className="max-w-4xl text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm font-black text-white backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8fe6c4]" />
              A free study-abroad assistant for students in Nepal
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              Ask Abroadly before you guess your next move.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/86 sm:text-xl">
              Get calm, practical help with eligibility, countries, documents,
              scholarships, visa basics, budgets, and application next steps. It is
              free, genuine, and built to help students understand their options.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <GoogleSignInButton
                label="Start free with Google"
                caption="Save your study profile once"
                className="px-6 py-4 text-base"
              />
              <Link
                href="#student-problems"
                className="ab-focus rounded-md border border-white/30 bg-white/10 px-6 py-4 text-center text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18"
              >
                See what it helps with
              </Link>
            </div>

            <div className="mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {assurances.map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-white/18 bg-white/10 px-4 py-3 text-sm font-black text-white/90 backdrop-blur"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="relative mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-8 lg:grid-cols-3"
      >
        {steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-lg border border-[#d7dfea] bg-white p-6 shadow-[0_18px_50px_rgba(20,35,62,0.08)]"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#e9f7f1] text-sm font-black text-[#087a4d]">
              0{index + 1}
            </span>
            <h2 className="mt-5 text-xl font-black">{step.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[#596579]">{step.body}</p>
          </article>
        ))}
      </section>

      <section id="student-problems" className="border-y border-[#d7dfea] bg-[#eef6ff]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div>
            <p className="text-sm font-black uppercase text-[#2854b8]">
              For the questions students actually ask
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
              When the internet gives you ten answers, Abroadly helps you sort the next one.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#596579]">
              Use it before you pay an application fee, choose a country, write an SOP,
              prepare documents, or tell your family a plan you are not sure about yet.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {studentProblems.map((item) => (
              <article key={item.title} className="rounded-lg border border-[#d7dfea] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#596579]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="topics" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase text-[#ff7a59]">
            Ask in plain language
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
            You can start with a confused question.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-[#596579]">
            Abroadly is made for the first draft of your thinking: half-formed plans,
            family pressure, country comparisons, and “what does this requirement mean?”
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {topics.map((topic) => (
            <div
              key={topic}
              className="rounded-md border border-[#d7dfea] bg-white px-4 py-5 text-sm font-black text-[#172033] shadow-sm"
            >
              {topic}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 pb-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-[#087a4d]">
            Free, honest, and ready when you are
          </p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black leading-tight">
            Build your study profile once, then ask better questions every time.
          </h2>
        </div>
        <Link
          href="/onboarding"
          className="ab-focus rounded-md bg-[#12244a] px-6 py-4 text-center font-black text-white shadow-[0_14px_32px_rgba(18,36,74,0.2)] transition hover:-translate-y-0.5 hover:bg-[#1d376c]"
        >
          Start free with Google
        </Link>
      </section>
    </main>
  );
}
