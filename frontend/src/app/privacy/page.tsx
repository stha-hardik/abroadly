import { NavBar } from "../nav-bar";
import { SiteFooter } from "../site-footer";

export const metadata = {
  title: "Privacy Policy · Abroadly",
  description:
    "How Abroadly collects, uses, stores, and protects student data. Plain English, no legalese.",
};

const sections = [
  {
    heading: "Who we are",
    body: [
      "Abroadly is a free AI study-abroad guidance tool for students from Nepal and South Asia, available at https://abroadly.online.",
      "We are not a consultancy. We do not refer students to paid agents. We do not sell student data.",
    ],
  },
  {
    heading: "What we collect",
    body: [
      "When you sign in: your Google email address and display name, as verified by Google.",
      "When you complete your profile: education level, GPA, expected GPA, target countries, preferred field of study, location, study goals, and (optionally) a phone number.",
      "When you chat with the AI: the messages you send, the AI's replies, and the underlying audit trail (which knowledge-base chunks were retrieved, the confidence scores, the model used). The audit trail is used to tune answer quality.",
      "When you upload a document: the file itself (PDF, JPG, PNG, TXT — usually transcripts, passport scans, recommendation letters, statements of purpose, bank statements). Files are stored on the server and indexed so the AI can reference them in your chat.",
      "When you visit the site: standard server access logs (IP address, browser type, page requested, timestamp) for security and debugging. We do not run advertising trackers, behavioural analytics, or third-party cookies.",
    ],
  },
  {
    heading: "Why we collect it",
    body: [
      "Profile data is used to tailor the AI's answers to your situation (e.g. recommending Australia pathways suited to your actual GPA rather than generic advice).",
      "Chat history is stored so you can pick up where you left off and so an admin counselor can review your case if needed.",
      "Uploaded documents are processed (OCR for images, text extraction for PDFs) and added to your private knowledge base so the AI can answer specific questions about your documents.",
      "Audit data is used internally to improve answer quality and detect issues with the eval layer.",
    ],
  },
  {
    heading: "Who your data is shared with",
    body: [
      "Large language model providers: when you send a chat message, the message plus relevant retrieved context is sent to Groq (US-based, primary LLM) and/or Google Gemini (fallback LLM and language normaliser). These providers process the message to generate the reply. We do not give them your name, email, or full profile — only the message and the retrieved knowledge-base context.",
      "Google: when you sign in, Google verifies your email address. We receive only the email and display name, not your password or any other Google account information.",
      "Infrastructure provider: the application runs on a third-party server. The infrastructure provider has access to the underlying machine but does not have routine access to your account data.",
      "We do not sell your data. We do not share your data with consultancies, agents, advertisers, marketers, or data brokers.",
    ],
  },
  {
    heading: "Where your data lives",
    body: [
      "Your profile, chat history, and audit trail are kept in our application database.",
      "Your uploaded documents are kept on our server's persistent storage.",
      "Vector representations of your documents and the global knowledge base are kept in our search index, alongside the application.",
      "All persistent stores survive routine deploys and restarts.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "Profile data, chat history, and uploaded documents are kept indefinitely while your account exists, so you can come back later and continue your study-abroad journey.",
      "If you ask us to delete your account, we delete your profile, chat history, audit rows, and uploaded files within 30 days. Backup snapshots may take up to 90 days to age out.",
      "Server access logs are retained for up to 90 days.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Access: you can ask for a copy of all the data we hold about you.",
      "Correction: you can update your profile fields at any time from the chat page, or ask us to correct anything else.",
      "Deletion: you can ask us to delete your account and all associated data at any time.",
      "Withdrawal of consent: you can stop using the service at any time. Deletion is a separate request.",
      "These rights apply regardless of where you live. We aim to handle requests within 30 days.",
    ],
  },
  {
    heading: "Cookies and local storage",
    body: [
      "We use browser localStorage (not cookies) to remember your student ID so you don't have to sign in on every visit. The key is `abroadly_student_id`.",
      "Admin users (the Abroadly team only) use a session token stored in localStorage to stay signed in for up to 24 hours.",
      "We do not use any third-party cookies, advertising trackers, or analytics that profile individual users.",
    ],
  },
  {
    heading: "Children",
    body: [
      "The service is intended for students aged 16 and above, typically finishing or completing Class 12 (+2), A-Levels, or a bachelor's degree.",
      "If you are under 18, please make sure a parent or guardian is aware that you are using the service. Some destination-country visa rules also require parental consent for student visa applications by minors.",
    ],
  },
  {
    heading: "Security",
    body: [
      "All traffic to and from the site is encrypted in transit with HTTPS (TLS).",
      "Admin endpoints are protected by token-based authentication with strongly hashed passwords.",
      "Secrets (API keys, database passwords, authentication secrets) are stored only in our server-side configuration and never exposed to the browser or to public locations.",
      "We make a good-faith effort to protect your data, but no online service can guarantee perfect security. If we discover a breach affecting your data, we will notify you by email.",
    ],
  },
  {
    heading: "Changes to this policy",
    body: [
      "We may update this policy when the service changes or when the law requires it. The current version is always at https://abroadly.online/privacy. Material changes (new third-party data sharing, new categories of data collected) will be communicated by email when reasonably possible.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For privacy questions, data access requests, deletion requests, or any other concern, write to us at contact@abroadly.online. We aim to respond within seven working days.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--ab-paper)] text-[var(--ab-ink)]">
      <NavBar showSignIn={false} primary={{ href: "/chat", label: "Open chat" }} />

      <article className="mx-auto max-w-2xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <p className="ab-eyebrow">Legal</p>
        <h1 className="ab-display-2 mt-3">Privacy Policy</h1>
        <p className="ab-small mt-3 text-[var(--ab-muted-soft)]">Last updated: 28 May 2026</p>
        <p className="ab-subhead mt-6">
          Plain English summary: we keep what you give us, use it only to help you
          study abroad, don&apos;t sell or share it with consultancies, and delete it
          when you ask.
        </p>

        <div className="mt-12 space-y-12">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="ab-h2">{section.heading}</h2>
              <div className="ab-body mt-4 space-y-4 text-[15px] leading-[1.75]">
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
