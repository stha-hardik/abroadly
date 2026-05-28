import Link from "next/link";
import { GoogleSignInButton } from "../google-sign-in-button";

const trustItems = [
  {
    title: "Verified identity",
    body: "Your student profile starts from a Google account with a verified email.",
  },
  {
    title: "One profile setup",
    body: "Academic details are collected after sign-in and saved for future chats.",
  },
  {
    title: "Private by design",
    body: "The Google secret stays on the server and is never sent to the browser.",
  },
];

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[#12244a]" />
        <div
          className="absolute inset-x-0 top-0 h-[360px] bg-cover bg-center opacity-[0.24]"
          style={{ backgroundImage: "url('/images/abroadly-hero.png')" }}
        />
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[linear-gradient(90deg,rgba(18,36,74,0.96),rgba(18,36,74,0.78),rgba(18,36,74,0.42))]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="ab-focus flex items-center gap-3 rounded-md text-white">
            <img
              src="/images/abroadly-logo.png"
              alt="Abroadly"
              className="h-9 w-9 rounded-md"
            />
            <span className="text-lg font-black">Abroadly</span>
          </Link>
          <Link
            href="/chat"
            className="ab-focus rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white backdrop-blur transition hover:bg-white/18"
          >
            Open chat
          </Link>
        </header>

        <section className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1fr_0.82fr] lg:items-start lg:pt-16">
          <div className="max-w-3xl pt-2 text-white">
            <p className="text-sm font-black uppercase tracking-normal text-[#8fe6c4]">
              Secure student access
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Sign in with Google before Abroadly creates your student profile.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/82 sm:text-lg">
              This keeps the profile tied to a real email, then asks for your academic
              details once so every answer can use the right context.
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {trustItems.map((item) => (
                <article
                  key={item.title}
                  className="rounded-md border border-white/16 bg-white/10 p-4 backdrop-blur"
                >
                  <h2 className="text-sm font-black text-white">{item.title}</h2>
                  <p className="mt-2 text-xs leading-6 text-white/72">{item.body}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-[#d7dfea] bg-white p-5 shadow-[0_28px_80px_rgba(20,35,62,0.18)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-[#2854b8]">
                  Abroadly account
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight">
                  Continue with your verified Google email.
                </h2>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#e9f7f1] text-sm font-black text-[#087a4d]">
                ID
              </span>
            </div>

            <div className="mt-7 rounded-md border border-[#dfe5ef] bg-[#f8fafc] p-4">
              <GoogleSignInButton
                variant="outline"
                label="Continue with Google"
                caption="Then complete your study profile"
                className="w-full justify-start py-4"
              />
            </div>

            <div className="mt-6 space-y-3 text-sm leading-6 text-[#596579]">
              <p>
                No password is created on Abroadly. Google confirms the email, and
                Abroadly stores only the student profile details needed for guidance.
              </p>
              <p>
                After sign-in, you will add GPA, expected GPA, interested countries,
                education level, field, location, and goals.
              </p>
            </div>

            <div className="mt-7 border-t border-[#e4e8f0] pt-5">
              <p className="text-xs font-bold uppercase text-[#7a8495]">
                Next screen
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#172033]">
                <span className="rounded-md bg-[#eef4ff] px-3 py-2">Academic details</span>
                <span className="rounded-md bg-[#edf8f2] px-3 py-2">Target countries</span>
                <span className="rounded-md bg-[#fff7e6] px-3 py-2">Study goals</span>
                <span className="rounded-md bg-[#f3eefc] px-3 py-2">Saved once</span>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
