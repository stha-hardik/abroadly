import Link from "next/link";
import { GoogleSignInButton } from "./google-sign-in-button";

const assurances = [
  "Free for students",
  "Official-source first",
  "Built for Nepal",
];

const steps = [
  {
    title: "Sign in with Google",
    body: "Start with a verified email before Abroadly creates your student profile.",
  },
  {
    title: "Complete details once",
    body: "Add education level, GPA, expected GPA, target countries, field, and goals.",
  },
  {
    title: "Ask direct questions",
    body: "Get grounded guidance on admissions, documents, costs, visas, and next steps.",
  },
];

const topics = [
  "UK applications",
  "Australia visas",
  "Scholarships",
  "Statement of purpose",
  "Document checklist",
  "Nepali student questions",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf7] text-[#21143d]">
      <section className="relative min-h-[88vh] overflow-hidden bg-[#21143d]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/abroadly-hero.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(33,20,61,0.94)_0%,rgba(33,20,61,0.82)_36%,rgba(33,20,61,0.34)_72%,rgba(33,20,61,0.08)_100%)]" />
        <div className="absolute inset-x-0 top-0 z-10 border-b border-white/15 bg-[#21143d]/35 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <Link href="/" className="ab-focus flex items-center gap-3 rounded-md text-white">
              <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-9 w-9 rounded-md" />
              <span className="text-lg font-black">Abroadly</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm font-semibold text-white/80 md:flex">
              <a className="ab-focus rounded-md hover:text-white" href="#how-it-works">
                How it works
              </a>
              <a className="ab-focus rounded-md hover:text-white" href="#topics">
                Topics
              </a>
              <Link className="ab-focus rounded-md hover:text-white" href="/chat">
                Open chat
              </Link>
            </div>
            <Link
              href="/onboarding"
              className="ab-focus rounded-md bg-white px-4 py-2 text-sm font-black text-[#21143d] transition hover:bg-[#00d6a3]"
            >
              Sign in
            </Link>
          </nav>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-7xl items-center px-5 pb-16 pt-28 sm:px-8 lg:pt-32">
          <div className="max-w-3xl text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm font-bold text-white backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#00d6a3]" />
              Free AI guidance for Nepali students
            </div>
            <h1 className="text-5xl font-black leading-[1.02] sm:text-6xl lg:text-7xl">
              Abroadly
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/86 sm:text-xl">
              Study-abroad answers that stay honest, cite official sources, and help you
              move from confused group chats to a clear next step.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <GoogleSignInButton
                label="Continue with Google"
                caption="Verified student access"
                className="px-6 py-4 text-base"
              />
              <Link
                href="/chat"
                className="ab-focus rounded-md border border-white/30 bg-white/10 px-6 py-4 text-center text-base font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/18"
              >
                Open chat
              </Link>
            </div>

            <div className="mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {assurances.map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-white/18 bg-white/10 px-4 py-3 text-sm font-bold text-white/90 backdrop-blur"
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
            className="rounded-lg border border-[#ded8ee] bg-white p-6 ab-soft-shadow"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#efe8ff] text-sm font-black text-[#673de6]">
              0{index + 1}
            </span>
            <h2 className="mt-5 text-xl font-black">{step.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[#5b5272]">{step.body}</p>
          </article>
        ))}
      </section>

      <section id="topics" className="border-y border-[#ded8ee] bg-[#f4f0ff]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-[#673de6]">
              Built for real student questions
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              Less guesswork before you pay, apply, or panic.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#5b5272]">
              Abroadly is designed to answer the questions students actually ask in
              Nepali homes, classrooms, and DMs, while refusing when the knowledge base
              is too thin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {topics.map((topic) => (
              <div
                key={topic}
                className="rounded-md border border-[#ded8ee] bg-white px-4 py-5 text-sm font-black text-[#21143d] shadow-sm"
              >
                {topic}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-14 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-[#ff7a59]">
            Not a consultancy funnel
          </p>
          <h2 className="mt-2 text-3xl font-black">Official-source guidance first.</h2>
        </div>
        <Link
          href="/onboarding"
          className="ab-focus rounded-md bg-[#673de6] px-6 py-4 text-center font-black text-white transition hover:-translate-y-0.5 hover:bg-[#5025d1]"
        >
          Sign in with Google
        </Link>
      </section>
    </main>
  );
}
