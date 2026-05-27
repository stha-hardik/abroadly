"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  chat,
  uploadFile,
  getChatHistory,
  type ChatResponse,
  type ChatSource,
} from "@/lib/api";

type MessageRole = "user" | "ai" | "upload";

interface UserMessage {
  role: "user";
  text: string;
}

interface AiMessage {
  role: "ai";
  response: ChatResponse;
}

interface UploadMessage {
  role: "upload";
  status: "uploading" | "done" | "error";
  filename: string;
  text: string;
}

type Message = UserMessage | AiMessage | UploadMessage;

const prompts = [
  {
    icon: "🎓",
    label: "UK applications",
    text: "What should a Nepali student check before applying to the UK?",
  },
  {
    icon: "🏥",
    label: "Compare countries",
    text: "How do I compare Australia and Canada for nursing?",
  },
  {
    icon: "📄",
    label: "Visa documents",
    text: "What documents should I prepare for a student visa?",
  },
];

/* ── Icons ────────────────────────────────────────────────────────── */

function SendIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none">
      <path
        d="M3.5 10h13m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none">
      <path
        d="m7.5 10.5 4.6-4.6a2.5 2.5 0 0 1 3.5 3.5l-6 6a4 4 0 0 1-5.7-5.7l6.3-6.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
      <path d="M8 0a.5.5 0 0 1 .5.5v2.05A5.001 5.001 0 0 1 12.45 6.5H14.5a.5.5 0 0 1 0 1h-2.05A5.001 5.001 0 0 1 8.5 11.45V13.5a.5.5 0 0 1-1 0v-2.05A5.001 5.001 0 0 1 3.55 7.5H1.5a.5.5 0 0 1 0-1h2.05A5.001 5.001 0 0 1 7.5 2.55V.5A.5.5 0 0 1 8 0Zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

/* ── Typing dots animation ────────────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-[6px] w-[6px] rounded-full bg-[var(--ab-plum)]"
          style={{
            opacity: 0.4,
            animation: `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Avatar ───────────────────────────────────────────────────────── */

function AiAvatar() {
  return (
    <div className="chat-avatar-ai flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]">
      <span className="text-[11px] font-black text-white tracking-tight">Ab</span>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--ab-ink)] ring-1 ring-white/10">
      <span className="text-[11px] font-bold text-white/90">You</span>
    </div>
  );
}

/* ── Source chip ───────────────────────────────────────────────────── */

function SourceChip({ source }: { source: ChatSource }) {
  const pct = Math.round(source.score * 100);
  const short = source.chunk_id.slice(0, 8);
  return (
    <span className="chat-source-chip">
      <span className="text-[var(--ab-plum)]">{source.source_type}</span>
      <span className="min-w-0 truncate opacity-70">{source.title ?? short}</span>
      <span className="font-mono text-[10px] text-emerald-600">{pct}%</span>
    </span>
  );
}

/* ── AI Bubble ────────────────────────────────────────────────────── */

function AiResponseBubble({ response }: { response: ChatResponse }) {
  const pct = Math.round(response.confidence * 100);
  const answer =
    response.answer ?? response.clarifying_question ?? "I need a little more context.";

  const variants: Record<string, { badge: string; badgeColor: string; borderColor: string; bg: string }> = {
    out_of_scope: {
      badge: "Out of scope",
      badgeColor: "text-amber-700 bg-amber-50 ring-amber-200/60",
      borderColor: "border-amber-100",
      bg: "bg-amber-50/40",
    },
    escalate: {
      badge: "Official portal",
      badgeColor: "text-blue-700 bg-blue-50 ring-blue-200/60",
      borderColor: "border-blue-100",
      bg: "bg-blue-50/40",
    },
    low_confidence: {
      badge: "Clarification needed",
      badgeColor: "text-[var(--ab-plum)] bg-purple-50 ring-purple-200/60",
      borderColor: "border-purple-100",
      bg: "bg-purple-50/30",
    },
  };

  const variant = variants[response.decision];

  return (
    <div className={`chat-bubble-ai ${variant ? variant.bg : ""} ${variant ? variant.borderColor : ""}`}>
      {variant && (
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${variant.badgeColor}`}>
          {variant.badge}
        </span>
      )}

      <p className="chat-bubble-text">{answer}</p>

      {!variant && response.confidence > 0 && (
        <div className="flex items-center gap-1.5 mt-1">
          <div className="h-1 w-12 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-emerald-600">{pct}%</span>
        </div>
      )}

      {response.sources.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-gray-100 pt-3">
          {response.sources.map((s) => (
            <SourceChip key={s.chunk_id} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */

export default function ChatPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sid = localStorage.getItem("abroadly_student_id");
    if (!sid) {
      router.push("/onboarding");
      return;
    }
    setStudentId(sid);
    getChatHistory(sid)
      .then((turns) => {
        const restored: Message[] = turns.map((t) =>
          t.role === "user"
            ? { role: "user", text: t.content }
            : {
                role: "ai",
                response: {
                  request_id: t.id,
                  trace_id: t.id,
                  decision: (t.eval_decision as ChatResponse["decision"]) || "proceed",
                  confidence: 1,
                  answer: t.content,
                  clarifying_question: null,
                  clarification_needed: false,
                  sources: [],
                  reason: "history",
                },
              }
        );
        setMessages(restored);
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(textFromPrompt?: string) {
    const text = (textFromPrompt ?? input).trim();
    if (!text || !studentId || thinking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setThinking(true);
    try {
      const res = await chat(studentId, text);
      setMessages((m) => [...m, { role: "ai", response: res }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error contacting server.";
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          response: {
            request_id: "",
            trace_id: "",
            decision: "out_of_scope",
            confidence: 0,
            answer: `Request failed: ${msg}`,
            clarifying_question: null,
            clarification_needed: false,
            sources: [],
            reason: "error",
          },
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !studentId) return;
    e.target.value = "";

    const uploadMsg: UploadMessage = {
      role: "upload",
      status: "uploading",
      filename: file.name,
      text: `Uploading ${file.name}`,
    };
    setMessages((m) => [...m, uploadMsg]);
    setUploading(true);

    try {
      await uploadFile(studentId, file);
      setMessages((m) =>
        m.map((msg, i) =>
          i === m.length - 1 && msg.role === "upload"
            ? {
                ...msg,
                status: "done" as const,
                text: `Uploaded ${file.name}. I can now reference this document.`,
              }
            : msg
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Upload failed.";
      setMessages((m) =>
        m.map((msg, i) =>
          i === m.length - 1 && msg.role === "upload"
            ? { ...msg, status: "error" as const, text: `Upload failed: ${errMsg}` }
            : msg
        )
      );
    } finally {
      setUploading(false);
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <main className="chat-layout">
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="chat-sidebar">
        <Link href="/" className="ab-focus flex items-center gap-3 rounded-xl px-1">
          <div className="chat-avatar-ai flex h-9 w-9 items-center justify-center rounded-[10px]">
            <span className="text-xs font-black text-white tracking-tight">Ab</span>
          </div>
          <div>
            <p className="text-[13px] font-extrabold text-white">Abroadly</p>
            <p className="text-[11px] font-medium text-white/40">Study abroad guidance</p>
          </div>
        </Link>

        <div className="mt-7 space-y-1.5">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
            Try asking
          </p>
          {prompts.map((p) => (
            <button
              key={p.text}
              type="button"
              onClick={() => sendMessage(p.text)}
              className="ab-focus chat-sidebar-btn group"
            >
              <span className="text-base leading-none">{p.icon}</span>
              <span className="min-w-0 truncate">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">
              Heads up
            </p>
            <p className="mt-2 text-[12px] leading-[1.6] text-white/50">
              Abroadly points you toward official sources, not paid referrals.
            </p>
          </div>
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────────────────────── */}
      <section className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="flex items-center gap-3">
            <div className="chat-avatar-ai flex h-8 w-8 items-center justify-center rounded-[10px] lg:hidden">
              <span className="text-[10px] font-black text-white">Ab</span>
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-[var(--ab-ink)]">
                Study Abroad Chat
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-medium text-gray-400">
                  AI advisor online
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("abroadly_student_id");
              router.push("/onboarding");
            }}
            className="ab-focus chat-header-btn"
          >
            New session
          </button>
        </header>

        {/* Messages */}
        <div className="chat-messages">
          <div className="mx-auto max-w-3xl">
            {/* Empty state */}
            {!hasMessages && (
              <div className="chat-empty-state">
                <div className="chat-empty-icon">
                  <SparkleIcon />
                </div>
                <h2 className="mt-5 text-2xl font-bold text-[var(--ab-ink)]">
                  What would you like to know?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-400 max-w-md">
                  Ask about countries, documents, costs, timelines, scholarships —
                  anything study-abroad related.
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-3 w-full max-w-xl">
                  {prompts.map((p) => (
                    <button
                      key={p.text}
                      type="button"
                      onClick={() => sendMessage(p.text)}
                      className="ab-focus chat-prompt-card group"
                    >
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-[12px] font-semibold text-gray-500 group-hover:text-[var(--ab-ink)] transition-colors">
                        {p.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            <div className="space-y-1">
              {messages.map((msg, i) => {
                if (msg.role === "user") {
                  return (
                    <div key={i} className="chat-row chat-row-user" style={{ animationDelay: "0.05s" }}>
                      <div className="chat-bubble-user">
                        <p className="whitespace-pre-wrap text-[14px] leading-[1.65]">
                          {msg.text}
                        </p>
                      </div>
                      <UserAvatar />
                    </div>
                  );
                }

                if (msg.role === "upload") {
                  const colorClass =
                    msg.status === "done"
                      ? "chat-upload-done"
                      : msg.status === "error"
                      ? "chat-upload-error"
                      : "chat-upload-pending";
                  return (
                    <div key={i} className="chat-row chat-row-ai" style={{ animationDelay: "0.05s" }}>
                      <AiAvatar />
                      <div className={`chat-upload-pill ${colorClass}`}>
                        <PaperclipIcon />
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className="chat-row chat-row-ai" style={{ animationDelay: "0.05s" }}>
                    <AiAvatar />
                    <AiResponseBubble response={msg.response} />
                  </div>
                );
              })}

              {thinking && (
                <div className="chat-row chat-row-ai" style={{ animationDelay: "0.05s" }}>
                  <AiAvatar />
                  <div className="chat-bubble-ai">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>

            <div ref={bottomRef} className="h-4" />
          </div>
        </div>

        {/* Input bar */}
        <footer className="chat-footer">
          <div className="mx-auto max-w-3xl">
            <div className="chat-input-wrap">
              <textarea
                className="chat-input"
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                disabled={thinking}
                rows={1}
              />
              <div className="flex items-center gap-1.5 px-2 pb-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  title="Upload PDF or TXT"
                  aria-label="Upload PDF or TXT"
                  className="ab-focus chat-action-btn"
                >
                  <PaperclipIcon />
                </button>
                <div className="flex-1" />
                <span className="text-[10px] text-gray-300 font-medium hidden sm:block">
                  Enter to send
                </span>
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={thinking || !input.trim()}
                  title="Send message"
                  aria-label="Send message"
                  className="ab-focus chat-send-btn"
                >
                  <SendIcon />
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-gray-300">
              Abroadly can make mistakes. Verify with official sources.
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}
