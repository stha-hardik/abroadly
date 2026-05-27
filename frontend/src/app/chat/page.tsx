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
  "What should a Nepali student check before applying to the UK?",
  "How do I compare Australia and Canada for nursing?",
  "What documents should I prepare for a student visa?",
];

function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="M5 12h13m0 0-5-5m5 5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path
        d="m8.5 12.5 5.7-5.7a3.1 3.1 0 0 1 4.4 4.4l-7.4 7.4a5 5 0 0 1-7.1-7.1l7.8-7.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SourceChip({ source }: { source: ChatSource }) {
  const pct = Math.round(source.score * 100);
  const short = source.chunk_id.slice(0, 8);
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#d9d3ea] bg-white px-2 py-1 text-xs font-bold text-[#5b5272]">
      <span className="shrink-0 text-[#673de6]">{source.source_type}</span>
      <span className="min-w-0 truncate">{source.title ?? short}</span>
      <span className="shrink-0 text-[#008f72]">{pct}%</span>
    </span>
  );
}

function AiResponseBubble({ response }: { response: ChatResponse }) {
  const pct = Math.round(response.confidence * 100);
  const answer = response.answer ?? response.clarifying_question ?? "I need a little more context.";

  if (response.decision === "out_of_scope") {
    return (
      <div className="max-w-2xl rounded-lg border border-[#f0c36d] bg-[#fff8e7] px-5 py-4">
        <p className="text-xs font-black uppercase text-[#9b6200]">Out of scope</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#5e4318]">{answer}</p>
      </div>
    );
  }

  if (response.decision === "escalate") {
    return (
      <div className="max-w-2xl rounded-lg border border-[#b8cef8] bg-[#eef5ff] px-5 py-4">
        <p className="text-xs font-black uppercase text-[#2458a6]">Use the official portal</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#263f67]">{answer}</p>
      </div>
    );
  }

  if (response.decision === "low_confidence") {
    return (
      <div className="max-w-2xl rounded-lg border border-[#d9d3ea] bg-white px-5 py-4">
        <p className="text-xs font-black uppercase text-[#673de6]">Need clarification</p>
        <p className="mt-2 text-sm leading-7 text-[#5b5272]">{answer}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl rounded-lg border border-[#d9d3ea] bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="whitespace-pre-wrap text-sm leading-7 text-[#21143d]">{answer}</p>
        <span className="shrink-0 rounded-md bg-[#e8fff8] px-2 py-1 text-xs font-black text-[#008f72]">
          {pct}%
        </span>
      </div>
      {response.sources.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eee9f7] pt-3">
          {response.sources.map((s) => (
            <SourceChip key={s.chunk_id} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}

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
      .catch(() => {
        /* history is best-effort */
      });
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

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
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
    <main className="flex h-screen overflow-hidden bg-[#f7f4ff] text-[#21143d]">
      <aside className="hidden w-80 shrink-0 border-r border-white/12 bg-[#21143d] p-5 text-white lg:flex lg:flex-col">
        <Link href="/" className="ab-focus flex items-center gap-3 rounded-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-black text-[#673de6]">
            A
          </span>
          <div>
            <p className="font-black">Abroadly</p>
            <p className="text-xs font-semibold text-white/55">Student guidance desk</p>
          </div>
        </Link>

        <div className="mt-8 rounded-lg border border-white/12 bg-white/8 p-5">
          <p className="text-xs font-black uppercase text-[#00d6a3]">Good prompts</p>
          <div className="mt-4 space-y-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="ab-focus w-full rounded-md border border-white/12 bg-white/8 px-3 py-3 text-left text-sm font-semibold leading-6 text-white/82 transition hover:border-[#00d6a3] hover:bg-white/14"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto rounded-lg border border-white/12 bg-white/8 p-5">
          <p className="text-xs font-black uppercase text-white/50">Reminder</p>
          <p className="mt-3 text-sm leading-7 text-white/76">
            Abroadly should point you toward official sources, not paid referrals.
          </p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-[#ded8ee] bg-white/92 px-4 py-3 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs font-black uppercase text-[#673de6]">Live chat</p>
            <h1 className="text-lg font-black">Ask your study-abroad question</h1>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("abroadly_student_id");
              router.push("/onboarding");
            }}
            className="ab-focus rounded-md border border-[#d9d3ea] bg-white px-3 py-2 text-xs font-black text-[#5b5272] transition hover:border-[#673de6] hover:text-[#21143d]"
          >
            Start over
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-4xl space-y-5">
            {!hasMessages && (
              <section className="rounded-lg border border-[#ded8ee] bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-black uppercase text-[#673de6]">Ready when you are</p>
                <h2 className="mt-3 text-3xl font-black leading-tight">
                  Ask about countries, documents, costs, timelines, or official portals.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6a607f]">
                  The best questions include your education level, target country, field,
                  budget range, and what you have already checked.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:hidden">
                  {prompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="ab-focus rounded-md border border-[#d9d3ea] bg-[#fbfaf7] px-3 py-3 text-left text-sm font-bold leading-6 transition hover:border-[#673de6]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {messages.map((msg, i) => {
              if (msg.role === "user") {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-2xl rounded-lg bg-[#673de6] px-5 py-3 text-white shadow-sm">
                      <p className="whitespace-pre-wrap text-sm leading-7 font-semibold">{msg.text}</p>
                    </div>
                  </div>
                );
              }

              if (msg.role === "upload") {
                const color =
                  msg.status === "done"
                    ? "border-[#95e8d3] bg-[#ebfff9] text-[#008f72]"
                    : msg.status === "error"
                    ? "border-[#f1b4b4] bg-[#fff1f1] text-[#9b2424]"
                    : "border-[#d9d3ea] bg-white text-[#5b5272]";
                return (
                  <div key={i} className="flex justify-start">
                    <div className={`rounded-md border px-4 py-2 text-xs font-black ${color}`}>
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className="flex justify-start">
                  <AiResponseBubble response={msg.response} />
                </div>
              );
            })}

            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-[#d9d3ea] bg-white px-5 py-4 shadow-sm">
                  <span className="text-sm font-bold text-[#6a607f]">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-[#ded8ee] bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-lg border border-[#d9d3ea] bg-[#fbfaf7] p-2">
            <input
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm font-semibold text-[#21143d] placeholder:text-[#948ba8] focus:ring-0"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={thinking}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Upload PDF or TXT"
              aria-label="Upload PDF or TXT"
              className="ab-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[#d9d3ea] bg-white text-[#5b5272] transition hover:border-[#673de6] hover:text-[#673de6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperclipIcon />
            </button>
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={thinking || !input.trim()}
              title="Send message"
              aria-label="Send message"
              className="ab-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#673de6] text-white transition hover:bg-[#5025d1] disabled:cursor-not-allowed disabled:bg-[#b8a9ee]"
            >
              <SendIcon />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </footer>
      </section>
    </main>
  );
}
