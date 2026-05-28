import Link from "next/link";
import { SiteFooter } from "../site-footer";

export const metadata = {
  title: "Terms & Conditions · Abroadly",
  description:
    "What Abroadly is, what it is not, and the basic rules for using it. Plain English, no legalese.",
};

const sections = [
  {
    heading: "What Abroadly is",
    body: [
      "Abroadly is a free AI guidance tool at https://abroadly.online. It helps students from Nepal and South Asia plan studying abroad — understanding admissions, documents, scholarships, visas, timelines, and costs — by combining a curated knowledge base with large language models.",
      "By using the site you agree to these terms. If you do not agree, please stop using the site.",
    ],
  },
  {
    heading: "What Abroadly is NOT",
    body: [
      "Abroadly is not a consultancy, an agent, an immigration lawyer, a financial advisor, a doctor, or a recruiter. We do not file visa applications on your behalf, accept payments toward universities, or guarantee admission or visa outcomes.",
      "The information you receive from Abroadly is guidance, not professional advice. For binding decisions — visa filing, tuition payments, contracts, medical or legal matters — you must rely on the relevant official source (university registrar, embassy, government immigration portal) or a licensed professional.",
    ],
  },
  {
    heading: "Who can use Abroadly",
    body: [
      "You must be at least 16 years old, and you must have a working Google account so the sign-in flow can verify your email.",
      "If you are under 18, please make sure a parent or guardian is aware that you are using the service. Several destination-country student visa programmes also require parental consent for applicants who are minors.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You agree to provide accurate profile information (education level, GPA, target countries, etc.). The AI relies on this to tailor its answers; inaccurate input will lead to less useful guidance.",
      "You are responsible for the activity that happens under your account. Please do not share your Google sign-in with others or attempt to use someone else's account.",
      "You can ask us to delete your account and all associated data at any time by writing to contact@abroadly.online — see the Privacy Policy for the deletion timeline.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "Use Abroadly only for genuine study-abroad guidance. Do not:",
      "• Submit content you do not have the right to share (e.g. other people's transcripts, passport scans, or personal data).",
      "• Use the service to harass, defame, defraud, or otherwise harm others.",
      "• Attempt to break, overload, reverse-engineer, scrape, or probe the security of the site beyond what is normal browsing.",
      "• Misrepresent your identity, age, or qualifications.",
      "• Use the service to plan or assist with anything illegal in your country, the destination country, or wherever the service is hosted.",
      "We may suspend or terminate accounts that violate these rules.",
    ],
  },
  {
    heading: "AI accuracy — read this carefully",
    body: [
      "The AI assistant is grounded in a curated study-abroad knowledge base, with a refusal-first eval layer that aims to prevent confident-sounding wrong answers. Even so, AI can make mistakes — it can misread a question, miss a recent rule change, or get a specific number wrong.",
      "Treat AI answers as a starting point, not a final answer, for any decision that affects your visa, money, or academic record. Always verify with the official source named in the answer (university page, government immigration portal) before you act.",
      "We make no warranty that answers are complete, accurate, up to date, or fit for any specific purpose.",
    ],
  },
  {
    heading: "Documents you upload",
    body: [
      "You can upload personal documents (transcripts, passport scans, recommendation letters, financial proof, etc.) so the AI can reference them. You keep all rights to your documents.",
      "You grant Abroadly a limited, non-exclusive licence to store, process (including OCR and text extraction), and index your uploaded documents solely for the purpose of providing guidance to you. We do not use your documents to train AI models, share them with third parties, or use them for any other purpose.",
      "You may request deletion of any uploaded document at any time.",
    ],
  },
  {
    heading: "Third-party services",
    body: [
      "Abroadly uses third-party large language model providers (currently Groq for primary generation, Google Gemini for fallback and language normalisation) to produce answers, and Google Sign-In to verify your email. The chat message you send and the relevant retrieved context are passed to these providers, subject to their own privacy and terms.",
      "We are not responsible for the policies, availability, or accuracy of any third-party service, including the official university, embassy, or government sites we link you to. Always read the official source for binding details.",
    ],
  },
  {
    heading: "Intellectual property",
    body: [
      "The Abroadly name, branding, and the curated knowledge-base content belong to Abroadly.",
      "You retain all rights to the content you submit (chat messages, profile information, uploaded documents). You grant us the limited rights described above only for the purpose of operating the service for you.",
    ],
  },
  {
    heading: "Service availability and changes",
    body: [
      "Abroadly is provided on an \"as-is\" and \"as-available\" basis. We do not guarantee uninterrupted access. Maintenance, deploys, third-party outages, or other events may cause downtime.",
      "We may change, suspend, or discontinue any part of the service at any time. We will announce material changes (e.g. shutting down a feature you depend on) with reasonable notice when possible.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      "To the extent permitted by applicable law, Abroadly and its operators are not liable for indirect, incidental, special, consequential, or punitive damages, or for any loss of opportunity, savings, time, or reputation arising from your use of the service.",
      "Our total liability for any direct damages arising from your use of Abroadly is limited to a nominal amount — Abroadly is provided free of charge.",
      "Nothing in these terms limits liability for fraud, gross negligence, or anything else that cannot be limited under applicable law.",
    ],
  },
  {
    heading: "Indemnity",
    body: [
      "You agree to hold Abroadly and its operators harmless from claims arising out of your misuse of the service, your violation of these terms, or your violation of any third-party right, including any laws of the destination country to which you apply.",
    ],
  },
  {
    heading: "Governing law and disputes",
    body: [
      "These terms are governed by the laws of Nepal, without regard to conflict-of-laws principles.",
      "Any dispute that cannot be resolved by good-faith discussion shall be brought before the appropriate courts located in Kathmandu, Nepal.",
      "If you live in a jurisdiction that grants you mandatory consumer rights, those rights apply in addition to (and override, where they conflict with) anything in this section.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these terms when the service changes or when the law requires it. The current version is always at https://abroadly.online/terms. Material changes will be communicated by email when reasonably possible. Continued use of the service after a change means you accept the updated terms.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For questions about these terms, write to us at contact@abroadly.online.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-[#172033]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="ab-focus flex items-center gap-3 rounded-md">
          <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-9 w-9 rounded-md" />
          <span className="text-lg font-black">Abroadly</span>
        </Link>
        <Link
          href="/chat"
          className="ab-focus rounded-md border border-[#d7dfea] bg-white px-4 py-2 text-sm font-black text-[#172033] transition hover:border-[#9aa8bf]"
        >
          Open chat
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-20 pt-6 sm:px-8 lg:pt-10">
        <p className="text-xs font-black uppercase tracking-normal text-[#2854b8]">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-3 text-sm text-[#596579]">
          Last updated: 28 May 2026
        </p>
        <p className="mt-6 text-base leading-7 text-[#596579]">
          Plain English summary: Abroadly is free guidance, not professional advice. Use it to plan, then act through the official sources we point you to. Be honest and respectful in your account, and we will be honest and respectful back.
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-black text-[#172033]">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-[#596579]">
                {section.body.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
