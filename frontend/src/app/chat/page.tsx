"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  chat,
  uploadFile,
  getStudent,
  getCurrentStudent,
  getChatHistory,
  logoutStudent,
  type ChatResponse,
  type ChatSource,
} from "@/lib/api";

interface UserMessage {
  role: "user";
  text: string;
}

interface AiMessage {
  role: "ai";
  response: ChatResponse;
}

interface CounselorMessage {
  role: "counselor";
  text: string;
}

interface UploadMessage {
  role: "upload";
  status: "uploading" | "done" | "error";
  filename: string;
  text: string;
  docType?: string;
}

type Message = UserMessage | AiMessage | CounselorMessage | UploadMessage;

const prompts = [
  {
    icon: "\u{1F393}",
    label: "Am I eligible?",
    text: "I just finished +2 in Nepal. Am I eligible to study in the UK?",
  },
  {
    icon: "\u{1F4B0}",
    label: "Costs & scholarships",
    text: "What's the total cost to study in Australia and are there scholarships for Nepali students?",
  },
  {
    icon: "\u{1F4CB}",
    label: "Document checklist",
    text: "Give me a complete document checklist I need to prepare for studying abroad",
  },
];

/* ── Document types for upload ────────────────────────────────────── */

interface DocType {
  id: string;
  label: string;
  icon: string;
  desc: string;
  accept: string;
}

const docTypes: DocType[] = [
  {
    id: "grade_sheet",
    label: "Grade Sheet / Transcript",
    icon: "\u{1F4CA}",
    desc: "+2, A-levels, or bachelor's marksheet",
    accept: ".pdf,.txt,.jpg,.jpeg,.png",
  },
  {
    id: "citizenship",
    label: "Citizenship",
    icon: "\u{1F1F3}\u{1F1F5}",
    desc: "Nepali citizenship certificate",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "passport",
    label: "Passport",
    icon: "\u{1F6C2}",
    desc: "Valid passport bio page",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "sop",
    label: "Statement of Purpose",
    icon: "\u{270D}\u{FE0F}",
    desc: "SOP or personal statement draft",
    accept: ".pdf,.txt",
  },
  {
    id: "recommendation",
    label: "Recommendation Letter",
    icon: "\u{1F4E8}",
    desc: "LOR from teacher or employer",
    accept: ".pdf,.txt,.jpg,.jpeg,.png",
  },
  {
    id: "financial",
    label: "Financial Documents",
    icon: "\u{1F3E6}",
    desc: "Bank statement, sponsor letter, scholarship",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "ielts",
    label: "IELTS / PTE / TOEFL",
    icon: "\u{1F4DD}",
    desc: "English proficiency test score",
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "other",
    label: "Other Document",
    icon: "\u{1F4CE}",
    desc: "Any other relevant document",
    accept: ".pdf,.txt,.jpg,.jpeg,.png",
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

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none">
      <path
        d="M2.5 5.5a2 2 0 0 1 2-2h3.17a2 2 0 0 1 1.42.59l.82.82a2 2 0 0 0 1.42.59h4.17a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path
        d="M5 5l10 10M15 5l-10 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 10l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none">
      <path
        d="M12 16V8m0 0-3 3m3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    <div className="h-8 w-8 shrink-0 rounded-[10px] overflow-hidden">
      <img src="/images/abroadly-logo.png" alt="Ab" className="h-full w-full object-cover" />
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

function cleanSourceTitle(title: string | null, chunkId: string): string {
  if (!title) return chunkId.slice(0, 8);
  let clean = title
    .replace(/^\d+-/, "")
    .replace(/\.md$/, "")
    .replace(/\.txt$/, "")
    .replace(/\.pdf$/, "")
    .replace(/[-_]/g, " ")
    .trim();
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return clean || title;
}

function SourceChip({ source }: { source: ChatSource }) {
  const label = cleanSourceTitle(source.title, source.chunk_id);
  return (
    <span className="chat-source-chip">
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

/* ── Text parsing ─────────────────────────────────────────────────── */

interface ParsedAnswer {
  body: string;
  actions: { text: string; isUpload: boolean }[];
}

function parseAnswer(raw: string): ParsedAnswer {
  let text = raw;
  text = text.replace(/\[Source:\s*[^\]]*\]/gi, "");
  text = text.replace(/\n{3,}/g, "\n\n");

  const actionMatch = text.match(
    /\*\*(?:What to do next|Next steps|You might also want to ask):\*\*\s*\n([\s\S]*)/i
  );

  let body = text;
  const actions: { text: string; isUpload: boolean }[] = [];

  if (actionMatch) {
    body = text.slice(0, actionMatch.index).trim();
    const actionBlock = actionMatch[1];
    const lines = actionBlock.split("\n");
    for (const line of lines) {
      const cleaned = line.replace(/^\s*[\*\-•]\s*/, "").replace(/^"(.+)"$/, "$1").trim();
      if (cleaned.length > 5) {
        const isUpload = /upload|marksheet|transcript|document|ielts|passport/i.test(cleaned);
        actions.push({ text: cleaned, isUpload });
      }
    }
  }

  return { body: body.trim(), actions };
}

function FormattedBody({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="chat-bubble-text">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;

        const isBullet = /^\s*[\*\-•]\s+/.test(line);
        const content = line.replace(/^\s*[\*\-•]\s+/, "");

        const formatted = content.split(/(\*\*[^*]+\*\*)/).map((seg, j) => {
          if (seg.startsWith("**") && seg.endsWith("**")) {
            return <strong key={j} className="font-semibold text-[var(--ab-ink)]">{seg.slice(2, -2)}</strong>;
          }
          return seg;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex gap-2 pl-1 py-0.5">
              <span className="text-[var(--ab-plum)] mt-[3px] text-[8px] shrink-0">{"●"}</span>
              <span>{formatted}</span>
            </div>
          );
        }

        return <p key={i} className="py-0.5">{formatted}</p>;
      })}
    </div>
  );
}

/* ── AI Bubble ────────────────────────────────────────────────────── */

function AiResponseBubble({
  response,
  onAction,
  onUploadClick,
}: {
  response: ChatResponse;
  onAction: (text: string) => void;
  onUploadClick: () => void;
}) {
  const answer =
    response.answer ?? response.clarifying_question ?? "I need a little more context.";
  const { body, actions } = parseAnswer(answer);

  return (
    <div className="chat-bubble-ai">
      <FormattedBody text={body} />

      {actions.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-gray-100 pt-3">
          {actions.map((action, i) => (
            <button
              key={i}
              type="button"
              onClick={() => action.isUpload ? onUploadClick() : onAction(action.text)}
              className="chat-action-chip group"
            >
              {action.isUpload ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-[var(--ab-plum)]" fill="none">
                  <path d="M8 11V5m0 0L5.5 7.5M8 5l2.5 2.5M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-gray-400 group-hover:text-[var(--ab-plum)]" fill="none">
                  <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
              <span className={action.isUpload ? "text-[var(--ab-plum)] font-semibold" : ""}>
                {action.text}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Image compression ────────────────────────────────────────────── */

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXTS.some((e) => file.name.toLowerCase().endsWith(e));
}

function compressImage(file: File): Promise<{ compressed: File; thumbUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, width, height);

      const thumbCanvas = document.createElement("canvas");
      const thumbSize = 80;
      const thumbRatio = Math.min(thumbSize / img.width, thumbSize / img.height);
      thumbCanvas.width = Math.round(img.width * thumbRatio);
      thumbCanvas.height = Math.round(img.height * thumbRatio);
      const thumbCtx = thumbCanvas.getContext("2d");
      if (!thumbCtx) return reject(new Error("Canvas not supported"));
      thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
      const thumbUrl = thumbCanvas.toDataURL("image/jpeg", 0.6);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
          });
          resolve({ compressed, thumbUrl });
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Document upload panel ────────────────────────────────────────── */

interface UploadedDoc {
  docTypeId: string;
  filename: string;
  thumbUrl: string | null;
  originalSize: number;
  compressedSize: number | null;
}

function DocumentPanel({
  open,
  onClose,
  studentId,
  onUploadDone,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  onUploadDone: (docType: DocType, filename: string) => void;
}) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFile = useCallback(
    async (docType: DocType, file: File) => {
      setError(null);
      setUploadingId(docType.id);
      const originalSize = file.size;
      let fileToUpload = file;
      let thumbUrl: string | null = null;
      let compressedSize: number | null = null;

      try {
        if (isImageFile(file)) {
          const result = await compressImage(file);
          fileToUpload = result.compressed;
          thumbUrl = result.thumbUrl;
          compressedSize = result.compressed.size;
        }

        await uploadFile(studentId, fileToUpload);
        setUploaded((prev) => [
          ...prev.filter((d) => d.docTypeId !== docType.id),
          { docTypeId: docType.id, filename: file.name, thumbUrl, originalSize, compressedSize },
        ]);
        onUploadDone(docType, file.name);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(`${docType.label}: ${msg}`);
      } finally {
        setUploadingId(null);
      }
    },
    [studentId, onUploadDone]
  );

  const handleDrop = useCallback(
    (docType: DocType, e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(docType, file);
    },
    [handleFile]
  );

  if (!open) return null;

  return (
    <>
      <div className="doc-panel-overlay" onClick={onClose} />
      <div className="doc-panel">
        <div className="doc-panel-header">
          <div>
            <h2 className="text-[16px] font-bold text-[var(--ab-ink)]">
              Upload Documents
            </h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Upload your study abroad documents for AI-powered analysis
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ab-focus flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[12px] text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="doc-panel-body">
          <div className="space-y-2">
            {docTypes.map((dt) => {
              const isUploading = uploadingId === dt.id;
              const uploadedDoc = uploaded.find((d) => d.docTypeId === dt.id);
              const isDragTarget = dragOver === dt.id;

              return (
                <div
                  key={dt.id}
                  className={`doc-card ${isDragTarget ? "doc-card-drag" : ""} ${uploadedDoc ? "doc-card-done" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(dt.id); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => handleDrop(dt, e)}
                >
                  {/* Thumbnail or icon */}
                  {uploadedDoc?.thumbUrl ? (
                    <img
                      src={uploadedDoc.thumbUrl}
                      alt={uploadedDoc.filename}
                      className="doc-thumb"
                    />
                  ) : (
                    <span className="text-xl leading-none shrink-0">{dt.icon}</span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--ab-ink)] truncate">
                      {dt.label}
                    </p>
                    {uploadedDoc ? (
                      <div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {uploadedDoc.filename}
                        </p>
                        {uploadedDoc.compressedSize !== null && (
                          <p className="text-[10px] text-emerald-500 mt-0.5">
                            {formatBytes(uploadedDoc.originalSize)} → {formatBytes(uploadedDoc.compressedSize)}
                            {" "}
                            <span className="text-emerald-600 font-semibold">
                              ({Math.round((1 - uploadedDoc.compressedSize / uploadedDoc.originalSize) * 100)}% smaller)
                            </span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 truncate">{dt.desc}</p>
                    )}
                  </div>

                  {uploadedDoc ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-emerald-500">
                        <CheckCircleIcon />
                      </span>
                      <button
                        type="button"
                        onClick={() => fileRefs.current[dt.id]?.click()}
                        className="text-[11px] font-semibold text-gray-400 hover:text-[var(--ab-plum)] transition-colors"
                      >
                        Replace
                      </button>
                    </div>
                  ) : isUploading ? (
                    <div className="shrink-0">
                      <div className="h-5 w-5 rounded-full border-2 border-[var(--ab-plum)] border-t-transparent animate-spin" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRefs.current[dt.id]?.click()}
                      className="doc-upload-btn shrink-0"
                    >
                      Upload
                    </button>
                  )}

                  <input
                    ref={(el) => { fileRefs.current[dt.id] = el; }}
                    type="file"
                    accept={dt.accept}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(dt, file);
                      e.target.value = "";
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="doc-drop-zone">
            <UploadCloudIcon />
            <p className="mt-2 text-[12px] font-semibold text-gray-400">
              Drag & drop any document here
            </p>
            <p className="text-[10px] text-gray-300 mt-1">
              PDF, TXT, JPG, PNG supported
            </p>
          </div>
        </div>

        <div className="doc-panel-footer">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400">
              {uploaded.length} of {docTypes.length} uploaded
            </span>
            <div className="h-1.5 w-20 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${(uploaded.length / docTypes.length) * 100}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ab-focus rounded-lg bg-[var(--ab-ink)] px-5 py-2.5 text-[12px] font-bold text-white hover:bg-[var(--ab-ink-2)] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
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
  const [docPanelOpen, setDocPanelOpen] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      let sid = localStorage.getItem("abroadly_student_id");

      if (!sid) {
        try {
          const current = await getCurrentStudent();
          if (!current.profile_completed) {
            router.replace("/onboarding/details");
            return;
          }
          sid = current.id;
          localStorage.setItem("abroadly_student_id", current.id);
        } catch {
          router.replace("/onboarding");
          return;
        }
      }

      try {
        const student = await getStudent(sid);
        if (!student.profile_completed) {
          router.replace("/onboarding/details");
          return;
        }
      } catch {
        router.replace("/onboarding");
        return;
      }

      if (cancelled) return;
      setStudentId(sid);

      try {
        const turns = await getChatHistory(sid);
        if (cancelled) return;
        const restored: Message[] = turns.map((t): Message => {
          if (t.role === "user") return { role: "user", text: t.content };
          if (t.role === "counselor") return { role: "counselor", text: t.content };
          return {
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
          };
        });
        setMessages(restored);
      } catch {
        // Empty history is fine; the first prompt can start a new conversation.
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
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

  const handleDocUploadDone = useCallback(
    (docType: DocType, filename: string) => {
      setUploadedCount((c) => c + 1);
      setMessages((m) => [
        ...m,
        {
          role: "upload",
          status: "done" as const,
          filename,
          text: `Uploaded ${docType.label}: ${filename}`,
          docType: docType.id,
        },
      ]);
    },
    []
  );

  const hasMessages = messages.length > 0;

  return (
    <main className="chat-layout">
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="chat-sidebar">
        <Link href="/" className="ab-focus flex items-center gap-3 rounded-xl px-1">
          <div className="h-9 w-9 shrink-0 rounded-[10px] overflow-hidden">
            <img src="/images/abroadly-logo.png" alt="Ab" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-[13px] font-extrabold text-white">Abroadly</p>
            <p className="text-[11px] font-medium text-white/40">Study abroad guidance</p>
          </div>
        </Link>

        {/* Documents button */}
        <button
          type="button"
          onClick={() => setDocPanelOpen(true)}
          className="ab-focus mt-6 flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 text-left transition hover:border-[var(--ab-mint)]/30 hover:bg-white/[0.06]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
            <FolderIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white/80">My Documents</p>
            <p className="text-[10px] text-white/35">
              {uploadedCount > 0 ? `${uploadedCount} uploaded` : "Upload transcripts, passport..."}
            </p>
          </div>
          {uploadedCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-bold text-emerald-400">
              {uploadedCount}
            </span>
          )}
        </button>

        <div className="mt-5 space-y-1.5">
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
            <div className="h-8 w-8 shrink-0 rounded-[10px] overflow-hidden lg:hidden">
              <img src="/images/abroadly-logo.png" alt="Ab" className="h-full w-full object-cover" />
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDocPanelOpen(true)}
              className="ab-focus chat-header-btn flex items-center gap-1.5 lg:hidden"
            >
              <FolderIcon />
              <span>Docs</span>
              {uploadedCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-100 px-1 text-[9px] font-bold text-emerald-700">
                  {uploadedCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                logoutStudent().finally(() => {
                  localStorage.removeItem("abroadly_student_id");
                  router.push("/onboarding");
                });
              }}
              className="ab-focus chat-header-btn"
            >
              New session
            </button>
          </div>
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

                {/* Upload CTA in empty state */}
                <button
                  type="button"
                  onClick={() => setDocPanelOpen(true)}
                  className="ab-focus mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-4 transition hover:border-[var(--ab-plum)]/40 hover:shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[var(--ab-plum)]">
                    <FolderIcon />
                  </span>
                  <div className="text-left">
                    <p className="text-[13px] font-semibold text-[var(--ab-ink)]">
                      Upload your documents
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Grade sheets, passport, IELTS score, SOP, and more
                    </p>
                  </div>
                </button>

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

                if (msg.role === "counselor") {
                  return (
                    <div key={i} className="chat-row chat-row-ai" style={{ animationDelay: "0.05s" }}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-emerald-600 ring-1 ring-emerald-500/20">
                        <span className="text-[10px] font-bold text-white">HC</span>
                      </div>
                      <div className="chat-bubble-ai" style={{ borderColor: "rgba(16,185,129,0.15)", background: "#f0fdf9" }}>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Human Counselor</p>
                        <p className="chat-bubble-text whitespace-pre-wrap">{msg.text}</p>
                      </div>
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
                        {msg.status === "done" ? <CheckCircleIcon /> : <PaperclipIcon />}
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={i} className="chat-row chat-row-ai" style={{ animationDelay: "0.05s" }}>
                    <AiAvatar />
                    <AiResponseBubble
                      response={msg.response}
                      onAction={(text) => sendMessage(text)}
                      onUploadClick={() => setDocPanelOpen(true)}
                    />
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
                  title="Quick upload"
                  aria-label="Quick upload"
                  className="ab-focus chat-action-btn"
                >
                  <PaperclipIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setDocPanelOpen(true)}
                  title="Upload documents"
                  aria-label="Upload documents"
                  className="ab-focus chat-action-btn"
                >
                  <FolderIcon />
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

      {/* ── Document upload panel ─────────────────────────────────── */}
      <DocumentPanel
        open={docPanelOpen}
        onClose={() => setDocPanelOpen(false)}
        studentId={studentId}
        onUploadDone={handleDocUploadDone}
      />
    </main>
  );
}
