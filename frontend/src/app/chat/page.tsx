"use client";
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

function SourceChip({ source }: { source: ChatSource }) {
  const pct = Math.round(source.score * 100);
  const short = source.chunk_id.slice(0, 8);
  return (
    <span className="inline-flex items-center gap-1 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-400">
      <span className="text-gray-500">{source.source_type}</span>
      <span>·</span>
      <span>{source.title ?? short}</span>
      <span>·</span>
      <span className="text-emerald-400">{pct}%</span>
    </span>
  );
}

function AiResponseBubble({ response }: { response: ChatResponse }) {
  const pct = Math.round(response.confidence * 100);

  if (response.decision === "out_of_scope") {
    return (
      <div className="max-w-xl bg-amber-950/60 border border-amber-700/60 rounded-2xl px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Out of scope</p>
        <p className="text-amber-200 text-sm">{response.answer}</p>
      </div>
    );
  }

  if (response.decision === "escalate") {
    return (
      <div className="max-w-xl bg-blue-950/60 border border-blue-600/60 rounded-2xl px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Use the official portal</p>
        <p className="text-blue-200 text-sm whitespace-pre-wrap">{response.answer}</p>
      </div>
    );
  }

  if (response.decision === "low_confidence") {
    return (
      <div className="max-w-xl bg-gray-800/80 border border-gray-600 rounded-2xl px-4 py-3 space-y-2">
        <p className="text-xs text-gray-500">❓ Need clarification</p>
        <p className="text-gray-300 text-sm italic">{response.clarifying_question}</p>
      </div>
    );
  }

  // PROCEED
  return (
    <div className="max-w-xl bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-gray-100 text-sm whitespace-pre-wrap">{response.answer}</p>
        <span className="shrink-0 text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 rounded-full px-2 py-0.5">
          {pct}%
        </span>
      </div>
      {response.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-700">
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
    // Load prior conversation turns so refresh doesn't wipe the thread.
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
        /* history is best-effort; fail silently */
      });
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
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
      text: `Uploading ${file.name}…`,
    };
    setMessages((m) => [...m, uploadMsg]);
    setUploading(true);

    try {
      await uploadFile(studentId, file);
      setMessages((m) =>
        m.map((msg, i) =>
          i === m.length - 1 && msg.role === "upload"
            ? { ...msg, status: "done" as const, text: `✓ Uploaded ${file.name}. I can now reference this document.` }
            : msg
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Upload failed.";
      setMessages((m) =>
        m.map((msg, i) =>
          i === m.length - 1 && msg.role === "upload"
            ? { ...msg, status: "error" as const, text: `✗ Upload failed: ${errMsg}` }
            : msg
        )
      );
    } finally {
      setUploading(false);
    }
  }

  const inputCls =
    "flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm";

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <span className="font-bold text-white text-lg">Abroadly</span>
        <button
          onClick={() => {
            localStorage.removeItem("abroadly_student_id");
            router.push("/onboarding");
          }}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Not you? Start over
        </button>
      </header>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-sm mt-16">
            <p className="text-2xl mb-2">👋</p>
            <p>Ask me anything about studying abroad from Nepal.</p>
            <p className="text-xs mt-1 text-gray-700">
              Try: &ldquo;What GPA do I need for Australia?&rdquo;
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-xs bg-emerald-600 rounded-2xl px-4 py-2">
                  <p className="text-white text-sm">{msg.text}</p>
                </div>
              </div>
            );
          }

          if (msg.role === "upload") {
            const color =
              msg.status === "done"
                ? "text-emerald-400"
                : msg.status === "error"
                ? "text-red-400"
                : "text-gray-400";
            return (
              <div key={i} className="flex justify-start">
                <div className={`text-xs italic ${color}`}>{msg.text}</div>
              </div>
            );
          }

          // AI
          return (
            <div key={i} className="flex justify-start">
              <AiResponseBubble response={msg.response} />
            </div>
          );
        })}

        {thinking && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
              <span className="text-gray-400 text-sm animate-pulse">Thinking…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            className={inputCls}
            placeholder="Ask a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={thinking}
          />
          <button
            onClick={sendMessage}
            disabled={thinking || !input.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {thinking ? "…" : "Send"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Upload PDF or TXT"
            className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-200 text-sm px-3 py-2 rounded-lg transition-colors"
          >
            {uploading ? "↑" : "📎"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>
    </div>
  );
}
