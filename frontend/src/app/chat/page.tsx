"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  chat,
  uploadFile,
  getStudent,
  updateStudent,
  getCurrentStudent,
  getChatHistory,
  getStudentDocuments,
  getStudentDocumentDownloadUrl,
  requestCounselorCall,
  logoutStudent,
  type ChatResponse,
  type ChatSource,
  type ChatTurn,
  type EducationLevel,
  type StudentDocument,
  type StudentOut,
} from "@/lib/api";
import {
  COUNTRY_PROFILES,
  pickPendingTodos,
  resolveTargetCountries,
  type PendingTodo,
} from "@/lib/country-data";

/* Abroadly's own human counsellor (placeholder identity — operator can edit). */
const COUNSELOR = {
  name: "Aastha Koirala",
  role: "Study-Abroad Counsellor · Abroadly",
  experience: "8+ years · guided 800+ Nepali students",
  blurb: "Friendly, no-pressure help with universities, visas, scholarships and documents.",
  initials: "AK",
};

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

interface CounselorCardMessage {
  role: "counselor_card";
}

type Message = UserMessage | AiMessage | CounselorMessage | UploadMessage | CounselorCardMessage;

/* ── Question launcher (empty state) + suggestion starters ─────────── */

interface Category {
  icon: string;
  label: string;
  hint: string;
  question: string;
}

const categories: Category[] = [
  {
    icon: "\u{1F393}",
    label: "Eligibility",
    hint: "Will my grades qualify?",
    question: "I just finished +2 in Nepal. Am I eligible to study in the UK, and what do universities look for?",
  },
  {
    icon: "\u{1F4B0}",
    label: "Costs & funding",
    hint: "Tuition, living, scholarships",
    question: "What's the realistic total cost to study in Australia, and what scholarships exist for Nepali students?",
  },
  {
    icon: "\u{1F4CB}",
    label: "Documents",
    hint: "What to prepare",
    question: "Give me a complete document checklist for a UK student visa application.",
  },
  {
    icon: "\u{1F6C2}",
    label: "Visa process",
    hint: "Steps & timelines",
    question: "How does the UK student visa process work, step by step, and how long does it take?",
  },
  {
    icon: "\u{270D}\u{FE0F}",
    label: "SOP help",
    hint: "Statement of purpose",
    question: "Help me outline a strong statement of purpose for a UK undergraduate application.",
  },
  {
    icon: "\u{1F30D}",
    label: "Compare countries",
    hint: "UK vs Australia vs Canada",
    question: "Compare the UK, Australia and Canada for a Nepali student on a tight budget.",
  },
];

const starterSuggestions: string[] = [
  "Am I eligible for the UK after +2?",
  "What does studying in Australia cost?",
  "Which documents do I need?",
  "Scholarships for Nepali students?",
  "UK vs Australia for my budget?",
  "Help me start my SOP",
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
  { id: "grade_sheet", label: "Grade Sheet / Transcript", icon: "\u{1F4CA}", desc: "+2, A-levels, or bachelor's marksheet", accept: ".pdf,.txt,.jpg,.jpeg,.png" },
  { id: "citizenship", label: "Citizenship", icon: "\u{1F1F3}\u{1F1F5}", desc: "Nepali citizenship certificate", accept: ".pdf,.jpg,.jpeg,.png" },
  { id: "passport", label: "Passport", icon: "\u{1F6C2}", desc: "Valid passport bio page", accept: ".pdf,.jpg,.jpeg,.png" },
  { id: "sop", label: "Statement of Purpose", icon: "\u{270D}\u{FE0F}", desc: "SOP or personal statement draft", accept: ".pdf,.txt" },
  { id: "recommendation", label: "Recommendation Letter", icon: "\u{1F4E8}", desc: "LOR from teacher or employer", accept: ".pdf,.txt,.jpg,.jpeg,.png" },
  { id: "financial", label: "Financial Documents", icon: "\u{1F3E6}", desc: "Bank statement, sponsor letter, scholarship", accept: ".pdf,.jpg,.jpeg,.png" },
  { id: "ielts", label: "IELTS / PTE / TOEFL", icon: "\u{1F4DD}", desc: "English proficiency test score", accept: ".pdf,.jpg,.jpeg,.png" },
  { id: "other", label: "Other Document", icon: "\u{1F4CE}", desc: "Any other relevant document", accept: ".pdf,.txt,.jpg,.jpeg,.png" },
];

const EDUCATION_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "plus_two", label: "+2 / Class 12" },
  { value: "a_levels", label: "A-Levels" },
  { value: "bba", label: "BBA" },
  { value: "bachelors", label: "Bachelors" },
  { value: "other", label: "Other" },
];

const PROFILE_COUNTRY_OPTIONS = [
  "United Kingdom",
  "Australia",
  "Canada",
  "United States",
  "New Zealand",
  "Germany",
  "Finland",
  "Japan",
  "South Korea",
  "Ireland",
];

interface ProfileFormState {
  full_name: string;
  phone: string;
  location: string;
  education_level: EducationLevel;
  gpa: string;
  expected_gpa: string;
  preferred_field: string;
  target_countries: string[];
  goals: string;
}

function optionalProfileNumber(value: string): number | null | undefined {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function profileFormFromStudent(student: StudentOut): ProfileFormState {
  return {
    full_name: student.full_name || "",
    phone: student.phone || "",
    location: student.location || "",
    education_level: student.education_level || "plus_two",
    gpa: student.gpa == null ? "" : String(student.gpa),
    expected_gpa: student.expected_gpa == null ? "" : String(student.expected_gpa),
    preferred_field: student.preferred_field || "",
    target_countries: student.target_countries || [],
    goals: student.goals || "",
  };
}

/* ── Icons ────────────────────────────────────────────────────────── */

function SendIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none">
      <path d="M3.5 10h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none">
      <path d="m7.5 10.5 4.6-4.6a2.5 2.5 0 0 1 3.5 3.5l-6 6a4 4 0 0 1-5.7-5.7l6.3-6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none">
      <path d="M2.5 5.5a2 2 0 0 1 2-2h3.17a2 2 0 0 1 1.42.59l.82.82a2 2 0 0 0 1.42.59h4.17a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
      <path d="M12 16V8m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none">
      <path d="M8 13V4m0 0L4 8m4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightSm() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none">
      <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none">
      <path d="M3.5 2.5h2.4l1 2.4-1.3 1A7.2 7.2 0 0 0 9.4 9.8l1-1.3 2.4 1V12a1.2 1.2 0 0 1-1.3 1.2A10 10 0 0 1 2.3 3.8 1.2 1.2 0 0 1 3.5 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/* Compact 8-row document slot for the chat sidebar (and dashboard). Same IDs
 * used by both surfaces so they stay in sync. */
const SIDEBAR_DOC_SLOTS = [
  { id: "grade_sheet", label: "Transcript" },
  { id: "citizenship", label: "Citizenship" },
  { id: "passport", label: "Passport" },
  { id: "ielts", label: "English test" },
  { id: "sop", label: "Statement of purpose" },
  { id: "recommendation", label: "Recommendation letters" },
  { id: "financial", label: "Financial proof" },
  { id: "other", label: "Other" },
];

/* ── Typing indicator ─────────────────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-[6px] w-[6px] rounded-full bg-[#E11D2A]"
          style={{ opacity: 0.4, animation: `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite` }}
        />
      ))}
    </div>
  );
}

/* ── Avatars ──────────────────────────────────────────────────────── */

function AiAvatar() {
  return (
    <div className="h-8 w-8 shrink-0 rounded-[10px] overflow-hidden ring-1 ring-black/5">
      <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-full w-full object-cover" />
    </div>
  );
}

function UserAvatar({ initial }: { initial: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#12244a] ring-1 ring-white/10">
      <span className="text-[11px] font-bold text-white/90">{initial}</span>
    </div>
  );
}

/* ── Source chip ──────────────────────────────────────────────────── */

function cleanSourceTitle(title: string | null, chunkId: string): string {
  if (!title) return chunkId.slice(0, 8);
  let clean = title.replace(/^\d+-/, "").replace(/\.(md|txt|pdf)$/, "").replace(/[-_]/g, " ").trim();
  if (clean.length > 0) clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  return clean || title;
}

function SourceChip({ source }: { source: ChatSource }) {
  return (
    <span className="chat-source-chip">
      <span className="min-w-0 truncate">{cleanSourceTitle(source.title, source.chunk_id)}</span>
    </span>
  );
}

/* ── Answer parsing ───────────────────────────────────────────────── */

interface ParsedAnswer {
  body: string;
  actions: { text: string; isUpload: boolean }[];
}

function parseAnswer(raw: string): ParsedAnswer {
  let text = raw;
  text = text.replace(/\[Source:\s*[^\]]*\]/gi, "");
  text = text.replace(/\n{3,}/g, "\n\n");

  const actionMatch = text.match(/\*\*(?:What to do next|Next steps|You might also want to ask):\*\*\s*\n([\s\S]*)/i);

  let body = text;
  const actions: { text: string; isUpload: boolean }[] = [];

  if (actionMatch) {
    body = text.slice(0, actionMatch.index).trim();
    for (const line of actionMatch[1].split("\n")) {
      const cleaned = line
        .replace(/^\s*[\*\-•]\s*/, "")          // leading bullet
        .replace(/^"(.+)"$/, "$1")              // surrounding quotes
        .replace(/\*\*(.+?)\*\*/g, "$1")        // **bold** → bold (chips are plain-text)
        .replace(/__(.+?)__/g, "$1")            // __bold__ → bold (same)
        .replace(/\*(.+?)\*/g, "$1")            // *italic* → italic
        .trim();
      if (cleaned.length > 5) {
        const isUpload = /upload|marksheet|transcript|document|ielts|passport/i.test(cleaned);
        actions.push({ text: cleaned, isUpload });
      }
    }
  }

  return { body: body.trim(), actions };
}

/* Elegant, capped emoji enrichment for AI replies — each emoji at most once
 * per reply (first mention only), so it accents rather than spams. */
const COUNTRY_FLAGS: [RegExp, string][] = [
  [/\bUnited Kingdom\b/i, "\u{1F1EC}\u{1F1E7}"],
  [/\bUK\b/, "\u{1F1EC}\u{1F1E7}"],
  [/\bAustralia\b/i, "\u{1F1E6}\u{1F1FA}"],
  [/\bCanada\b/i, "\u{1F1E8}\u{1F1E6}"],
  [/\b(?:United States|USA)\b/i, "\u{1F1FA}\u{1F1F8}"],
  [/\bGermany\b/i, "\u{1F1E9}\u{1F1EA}"],
  [/\bIreland\b/i, "\u{1F1EE}\u{1F1EA}"],
  [/\bNew Zealand\b/i, "\u{1F1F3}\u{1F1FF}"],
  [/\bNepal\b/i, "\u{1F1F3}\u{1F1F5}"],
];
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/\b(?:passport|visa)\b/i, "\u{1F6C2}"],
  [/\b(?:universit(?:y|ies)|degree|graduat(?:e|ion)|scholarship)\b/i, "\u{1F393}"],
  [/\b(?:city|cities|campus|located|location)\b/i, "\u{1F4CD}"],
];

function enrichEmoji(text: string): string {
  let out = text;
  for (const [re, emoji] of [...COUNTRY_FLAGS, ...KEYWORD_EMOJI]) {
    if (out.includes(emoji)) continue; // each emoji at most once
    out = out.replace(re, (m) => `${emoji} ${m}`); // first match only (no /g)
  }
  return out;
}

function renderInline(content: string, keyBase: number) {
  return content.split(/(\*\*[^*]+\*\*)/).map((seg, j) =>
    seg.startsWith("**") && seg.endsWith("**")
      ? <strong key={`${keyBase}-${j}`} className="font-semibold text-[var(--ab-ink)]">{seg.slice(2, -2)}</strong>
      : seg
  );
}

function FormattedBody({ text }: { text: string }) {
  const lines = enrichEmoji(text).split("\n");
  return (
    <div className="chat-bubble-text">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />;

        const bulletMatch = /^\s*[\*\-•]\s+(.*)$/.exec(line);
        const numMatch = /^\s*(\d+)\.\s+(.*)$/.exec(line);
        const trimmed = line.trim();
        const isHeading = /^\*\*[^*]+\*\*:?$/.test(trimmed); // a line that's entirely bold = subheading

        if (isHeading) {
          return (
            <p key={i} className="mt-2 mb-1 text-[13px] font-bold text-[var(--ab-ink)]">
              {trimmed.replace(/^\*\*|\*\*:?$/g, "").replace(/:$/, "")}
            </p>
          );
        }
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2.5 py-[3px]">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#FDECEE] text-[10px] font-bold text-[#E11D2A]">{numMatch[1]}</span>
              <span className="flex-1">{renderInline(numMatch[2], i)}</span>
            </div>
          );
        }
        if (bulletMatch) {
          return (
            <div key={i} className="flex gap-2 pl-0.5 py-[3px]">
              <span className="text-[#E11D2A] mt-[6px] text-[7px] shrink-0">{"●"}</span>
              <span className="flex-1">{renderInline(bulletMatch[1], i)}</span>
            </div>
          );
        }
        return <p key={i} className="py-0.5">{renderInline(line, i)}</p>;
      })}
    </div>
  );
}

/* ── AI bubble ────────────────────────────────────────────────────── */
/* Follow-up suggestions are surfaced in the rail above the composer, and
 * upload prompts via a popup — so the bubble itself stays clean. */

function AiResponseBubble({ response }: { response: ChatResponse }) {
  const answer = response.answer ?? response.clarifying_question ?? "I need a little more context.";
  const { body } = parseAnswer(answer);
  return (
    <div className="chat-bubble-ai">
      <FormattedBody text={body} />
    </div>
  );
}

/* True when an AI answer is nudging the student to upload a document. */
function answerWantsUpload(response: ChatResponse): boolean {
  const answer = response.answer ?? response.clarifying_question ?? "";
  return parseAnswer(answer).actions.some((a) => a.isUpload);
}

function inferUploadLabel(response: ChatResponse): string {
  const answer = (response.answer ?? response.clarifying_question ?? "").toLowerCase();
  if (/transcript|marksheet|grade/.test(answer)) return "transcript / marksheet";
  if (/ielts|pte|toefl|english/.test(answer)) return "English test score";
  if (/passport/.test(answer)) return "passport";
  if (/bank|financ|sponsor|fund/.test(answer)) return "financial documents";
  if (/sop|statement of purpose/.test(answer)) return "SOP draft";
  return "documents";
}

/* ── Image compression ────────────────────────────────────────────── */

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXTS.some((e) => file.name.toLowerCase().endsWith(e));
}

function compressImage(file: File): Promise<File> {
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

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Compression failed"));
          const compressed = new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
          resolve(compressed);
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

function DocumentPanel({
  open,
  onClose,
  studentId,
  documents,
  onUploadDone,
  onDiscuss,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  documents: StudentDocument[];
  onUploadDone: (docType: DocType, filename: string, document: StudentDocument | null) => void;
  onDiscuss: (docType: DocType) => void;
}) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadedByType = useMemo(() => {
    const byType = new Map<string, StudentDocument>();
    for (const doc of documents) {
      if (!byType.has(doc.doc_type)) byType.set(doc.doc_type, doc);
    }
    return byType;
  }, [documents]);
  const completedTypeCount = docTypes.filter((dt) => uploadedByType.has(dt.id)).length;

  const handleFile = useCallback(
    async (docType: DocType, file: File) => {
      setError(null);
      setUploadingId(docType.id);
      let fileToUpload = file;
      try {
        if (isImageFile(file)) {
          fileToUpload = await compressImage(file);
        }
        const res = await uploadFile(studentId, fileToUpload, docType.id, file.name);
        onUploadDone(docType, file.name, res.document);
      } catch (err: unknown) {
        setError(`${docType.label}: ${err instanceof Error ? err.message : "Upload failed"}`);
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
            <h2 className="text-[16px] font-bold text-[var(--ab-ink)]">Upload Documents</h2>
            <p className="text-[12px] text-[#8A847B] mt-0.5">
              Add your documents and I&apos;ll tailor answers to your real situation.
            </p>
          </div>
          <button type="button" onClick={onClose} className="ab-focus flex h-8 w-8 items-center justify-center rounded-lg text-[#8A847B] hover:bg-[#F0EDE4] hover:text-[#1B1916] transition-colors">
            <CloseIcon />
          </button>
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[12px] text-red-600 font-medium">{error}</div>
        )}

        <div className="doc-panel-body">
          <div className="space-y-2">
            {docTypes.map((dt) => {
              const isUploading = uploadingId === dt.id;
              const uploadedDoc = uploadedByType.get(dt.id);
              const thumbUrl = uploadedDoc && uploadedDoc.is_image
                ? getStudentDocumentDownloadUrl(studentId, uploadedDoc.doc_id)
                : null;
              const isDragTarget = dragOver === dt.id;
              return (
                <div
                  key={dt.id}
                  className={`doc-card ${isDragTarget ? "doc-card-drag" : ""} ${uploadedDoc ? "doc-card-done" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(dt.id); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => handleDrop(dt, e)}
                >
                  {uploadedDoc && thumbUrl ? (
                    <img src={thumbUrl} alt={uploadedDoc.filename} className="doc-thumb" />
                  ) : (
                    <span className="text-xl leading-none shrink-0">{dt.icon}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--ab-ink)] truncate">{dt.label}</p>
                    {uploadedDoc ? (
                      <div>
                        <p className="text-[11px] text-[#6B655C] truncate">{uploadedDoc.filename}</p>
                        <p className="text-[10px] text-[#8A847B] mt-0.5">
                          {uploadedDoc.ext.replace(".", "").toUpperCase()} {"·"} {formatBytes(uploadedDoc.size_bytes)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#8A847B] truncate">{dt.desc}</p>
                    )}
                  </div>
                  {uploadedDoc ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button type="button" onClick={() => onDiscuss(dt)} className="rounded-lg bg-[#FDECEE] px-2.5 py-1.5 text-[11px] font-bold text-[#E11D2A] hover:bg-[#fbdce0] transition-colors">Ask AI</button>
                      <button type="button" onClick={() => fileRefs.current[dt.id]?.click()} className="text-[11px] font-semibold text-[#8A847B] hover:text-[#E11D2A] transition-colors">Replace</button>
                    </div>
                  ) : isUploading ? (
                    <div className="shrink-0"><div className="h-5 w-5 rounded-full border-2 border-[#E11D2A] border-t-transparent animate-spin" /></div>
                  ) : (
                    <button type="button" onClick={() => fileRefs.current[dt.id]?.click()} className="doc-upload-btn shrink-0">Upload</button>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[dt.id] = el; }}
                    type="file"
                    accept={dt.accept}
                    className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(dt, file); e.target.value = ""; }}
                  />
                </div>
              );
            })}
          </div>

          <div className="doc-drop-zone">
            <UploadCloudIcon />
            <p className="mt-2 text-[12px] font-semibold text-[#8A847B]">Drag &amp; drop any document here</p>
            <p className="text-[10px] text-[#B5B0A6] mt-1">PDF, TXT, JPG, PNG supported</p>
          </div>
        </div>

        <div className="doc-panel-footer">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8A847B]">{completedTypeCount} of {docTypes.length} categories uploaded</span>
            <div className="h-1.5 w-20 rounded-full bg-[#EFECE4] overflow-hidden">
              <div className="h-full rounded-full bg-[#E11D2A] transition-all duration-500" style={{ width: `${(completedTypeCount / docTypes.length) * 100}%` }} />
            </div>
          </div>
          <button type="button" onClick={onClose} className="ab-focus rounded-lg bg-[#E11D2A] px-5 py-2.5 text-[12px] font-bold text-white hover:bg-[#C0121F] transition-colors">Done</button>
        </div>
      </div>
    </>
  );
}

/* ── Upload prompt popup ──────────────────────────────────────────── */

function UploadPromptModal({
  label,
  onUpload,
  onClose,
}: {
  label: string;
  onUpload: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="upload-modal-overlay" onClick={onClose} />
      <div className="upload-modal" role="dialog" aria-modal="true">
        <button type="button" onClick={onClose} aria-label="Close" className="ab-focus absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-[#8A847B] hover:bg-[#F0EDE4] transition-colors">
          <CloseIcon />
        </button>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDECEE] text-[#E11D2A]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
            <path d="M12 16V8m0 0-3.5 3.5M12 8l3.5 3.5M5 19h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="mt-4 text-[17px] font-extrabold tracking-[-0.01em] text-[var(--ab-ink)]">
          Share your {label} for a sharper answer
        </h3>
        <p className="mt-2 text-[13.5px] leading-6 text-[#6B655C]">
          Upload it and I&apos;ll tailor my guidance to your real situation. It stays private to your account.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button type="button" onClick={onUpload} className="ab-focus flex-1 rounded-xl bg-[#E11D2A] px-4 py-3 text-[13px] font-bold text-white shadow-[var(--shadow-sm)] transition hover:bg-[#C0121F]">
            Upload now
          </button>
          <button type="button" onClick={onClose} className="ab-focus rounded-xl border border-[#E8E5DD] bg-white px-4 py-3 text-[13px] font-semibold text-[#6B655C] transition hover:bg-[#F4F2EC]">
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Profile popup ────────────────────────────────────────────────── */

function ProfilePopup({
  student,
  onClose,
  onSaved,
  requirePhone = false,
}: {
  student: StudentOut;
  onClose: () => void;
  onSaved: (student: StudentOut) => void;
  requirePhone?: boolean;
}) {
  const [editing, setEditing] = useState(requirePhone);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(() => profileFormFromStudent(student));
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormState, string>>>({});
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const initial = (student.full_name || "Y").charAt(0).toUpperCase();
  const phoneMissing = !student.phone?.trim();
  const visibleFields: [string, string | number | null | undefined][] = [
    ["Email", student.email],
    ["Phone", student.phone],
    ["Education", student.education_level?.replace(/_/g, " ")],
    ["Target countries", (student.target_countries || []).join(", ")],
  ];
  const expandedFields: [string, string | number | null | undefined][] = [
    ["City / district", student.location],
    ["Current GPA", student.gpa],
    ["Expected GPA", student.expected_gpa],
    ["Field of interest", student.preferred_field],
    ["Goals", student.goals],
  ];
  const completionCount = [
    student.full_name,
    student.phone,
    student.education_level,
    student.target_countries?.length,
    student.preferred_field,
    student.gpa ?? student.expected_gpa,
  ].filter(Boolean).length;
  const completionPct = Math.round((completionCount / 6) * 100);
  const inputClass =
    "w-full rounded-md border border-[#E8E5DD] bg-white px-3 py-2.5 text-[13px] font-semibold text-[#1B1916] placeholder:text-[#A8A29A] focus:border-[#0A6E45] focus:outline-none focus:ring-4 focus:ring-[#0A6E45]/12";
  const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#6B655C]";
  const errorClass = "mt-1.5 text-[11px] font-bold text-[#b42318]";

  function setField<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function toggleCountry(country: string) {
    setForm((prev) => {
      const selected = prev.target_countries.includes(country);
      return {
        ...prev,
        target_countries: selected
          ? prev.target_countries.filter((item) => item !== country)
          : [...prev.target_countries, country],
      };
    });
    setErrors((prev) => ({ ...prev, target_countries: "" }));
  }

  function validateProfileForm(): boolean {
    const next: Partial<Record<keyof ProfileFormState, string>> = {};
    const gpa = optionalProfileNumber(form.gpa);
    const expectedGpa = optionalProfileNumber(form.expected_gpa);

    if (!form.full_name.trim()) next.full_name = "Full name is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    if (gpa === undefined || (gpa !== null && (gpa < 0 || gpa > 4.5))) {
      next.gpa = "Use a GPA between 0 and 4.5.";
    }
    if (expectedGpa === undefined || (expectedGpa !== null && (expectedGpa < 0 || expectedGpa > 4.5))) {
      next.expected_gpa = "Use an expected GPA between 0 and 4.5.";
    }
    if (form.target_countries.length === 0) {
      next.target_countries = "Select at least one target country.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validateProfileForm()) return;

    const gpa = optionalProfileNumber(form.gpa);
    const expectedGpa = optionalProfileNumber(form.expected_gpa);
    setSaving(true);
    setApiError("");
    try {
      const updated = await updateStudent(student.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        location: form.location.trim() || null,
        education_level: form.education_level,
        gpa: gpa === undefined ? null : gpa,
        expected_gpa: expectedGpa === undefined ? null : expectedGpa,
        target_countries: form.target_countries,
        preferred_field: form.preferred_field.trim() || null,
        goals: form.goals.trim() || null,
      });
      onSaved(updated);
      setEditing(false);
      setExpanded(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-[rgba(27,25,22,0.32)] backdrop-blur-[4px]"
        onClick={requirePhone ? undefined : onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-[61] max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#EFECE4] bg-white p-[22px] shadow-[var(--shadow-lg)] max-[480px]:w-[calc(100%-20px)] max-[480px]:rounded-xl max-[480px]:p-[18px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {!requirePhone && (
          <button type="button" onClick={onClose} aria-label="Close" className="ab-focus absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-[#8A847B] transition-colors hover:bg-[#F0EDE4]">
            <CloseIcon />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#12244a] text-[16px] font-bold text-white">{initial}</div>
          <div className="min-w-0">
            <h3 id="profile-modal-title" className="truncate text-[16px] font-extrabold tracking-[-0.01em] text-[var(--ab-ink)]">{student.full_name || "Your profile"}</h3>
            <p className="truncate text-[12px] text-[#8A847B]">{student.email}</p>
          </div>
        </div>

        {phoneMissing && (
          <div className="mt-4 rounded-md border border-[#F5C2BC] bg-[#FFF4F2] px-3 py-2 text-[12px] font-semibold leading-5 text-[#B42318]">
            Add your phone number to keep using your signed-in profile.
          </div>
        )}

        {!editing ? (
          <>
            <div className="mt-4 rounded-md border border-[#E8E5DD] bg-[#FAF9F6] px-3 py-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#6B655C]">
                <span>Profile strength</span>
                <span>{completionPct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFECE4]">
                <div className="h-full rounded-full bg-[#0A6E45]" style={{ width: `${completionPct}%` }} />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {visibleFields.map(([label, value]) =>
                value ? (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#A8A296]">{label}</span>
                    <span className="text-right text-[13px] font-medium capitalize text-[var(--ab-ink)]">{String(value)}</span>
                  </div>
                ) : null
              )}
            </div>

            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="ab-focus mt-4 flex min-h-11 w-full items-center justify-between rounded-md border border-[#E8E5DD] bg-white px-3 text-[12px] font-bold text-[#3F3A33] transition hover:bg-[#F4F2EC]"
              aria-expanded={expanded}
            >
              <span>{expanded ? "Hide full profile" : "Show full profile"}</span>
              <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}><ArrowRightSm /></span>
            </button>

            {expanded && (
              <div className="mt-3 space-y-2.5 rounded-md border border-[#EFECE4] bg-[#FAF9F6] px-3 py-3">
                {expandedFields.map(([label, value]) =>
                  value ? (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[#A8A296]">{label}</span>
                      <span className="text-right text-[13px] font-medium text-[var(--ab-ink)]">{String(value)}</span>
                    </div>
                  ) : null
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="ab-focus mt-5 flex min-h-11 w-full items-center justify-center rounded-md bg-[#12244a] px-4 text-[13px] font-bold text-white shadow-[var(--shadow-sm)] transition hover:bg-[#1F3D78]"
            >
              Edit my details
            </button>
          </>
        ) : (
          <form onSubmit={saveProfile} className="mt-4 max-h-[68dvh] space-y-4 overflow-y-auto pr-1">
            <div>
              <label className={labelClass} htmlFor="profile-full-name">Full name</label>
              <input id="profile-full-name" className={inputClass} value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} autoComplete="name" />
              {errors.full_name && <p className={errorClass}>{errors.full_name}</p>}
            </div>

            <div>
              <label className={labelClass} htmlFor="profile-phone">Phone <span className="text-[#b42318]">*</span></label>
              <input id="profile-phone" type="tel" required className={inputClass} value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+977 98XXXXXXXX" autoComplete="tel" />
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="profile-location">City / district</label>
                <input id="profile-location" className={inputClass} value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="Kathmandu" autoComplete="address-level2" />
              </div>
              <div>
                <label className={labelClass} htmlFor="profile-education">Education</label>
                <select id="profile-education" className={inputClass} value={form.education_level} onChange={(e) => setField("education_level", e.target.value as EducationLevel)}>
                  {EDUCATION_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="profile-field">Preferred field</label>
              <input id="profile-field" className={inputClass} value={form.preferred_field} onChange={(e) => setField("preferred_field", e.target.value)} placeholder="Computer Science, Nursing, Business" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="profile-gpa">Current GPA</label>
                <input id="profile-gpa" type="number" step="0.01" min="0" max="4.5" className={inputClass} value={form.gpa} onChange={(e) => setField("gpa", e.target.value)} placeholder="3.25" />
                {errors.gpa && <p className={errorClass}>{errors.gpa}</p>}
              </div>
              <div>
                <label className={labelClass} htmlFor="profile-expected-gpa">Expected GPA</label>
                <input id="profile-expected-gpa" type="number" step="0.01" min="0" max="4.5" className={inputClass} value={form.expected_gpa} onChange={(e) => setField("expected_gpa", e.target.value)} placeholder="3.60" />
                {errors.expected_gpa && <p className={errorClass}>{errors.expected_gpa}</p>}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className={labelClass}>Target countries</label>
                <span className="text-[11px] font-bold text-[#8A847B]">{form.target_countries.length} selected</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PROFILE_COUNTRY_OPTIONS.map((country) => {
                  const checked = form.target_countries.includes(country);
                  return (
                    <label key={country} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-[12px] font-bold transition ${checked ? "border-[#0A6E45] bg-[#E8F2EC] text-[#1B1916]" : "border-[#E8E5DD] bg-white text-[#6B655C] hover:border-[#B8D8C8]"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCountry(country)} className="h-4 w-4 rounded border-[#D1CABD] text-[#0A6E45] focus:ring-[#0A6E45]" />
                      <span>{country}</span>
                    </label>
                  );
                })}
              </div>
              {errors.target_countries && <p className={errorClass}>{errors.target_countries}</p>}
            </div>

            <div>
              <label className={labelClass} htmlFor="profile-goals">Goals</label>
              <textarea id="profile-goals" rows={4} maxLength={1200} className={inputClass} value={form.goals} onChange={(e) => setField("goals", e.target.value)} placeholder="What do you want Abroadly to help you plan?" />
              <p className="mt-1.5 text-right text-[11px] font-bold text-[#8A847B]">{form.goals.length}/1200</p>
            </div>

            {apiError && (
              <div className="rounded-md border border-[#F5C2BC] bg-[#FFF4F2] px-3 py-2 text-[12px] font-bold text-[#B42318]">{apiError}</div>
            )}

            <div className="sticky bottom-0 -mx-1 flex gap-2 border-t border-[#EFECE4] bg-white px-1 pt-3">
              {!requirePhone && (
                <button type="button" onClick={() => { setEditing(false); setForm(profileFormFromStudent(student)); setErrors({}); setApiError(""); }} className="ab-focus min-h-11 rounded-md border border-[#E8E5DD] bg-white px-4 text-[13px] font-bold text-[#6B655C] transition hover:bg-[#F4F2EC]">
                  Cancel
                </button>
              )}
              <button type="submit" disabled={saving} className="ab-focus min-h-11 flex-1 rounded-md bg-[#0A6E45] px-4 text-[13px] font-bold text-white shadow-[var(--shadow-sm)] transition hover:bg-[#075b39] disabled:cursor-not-allowed disabled:bg-[#A8A29A]">
                {saving ? "Saving..." : requirePhone ? "Save phone and profile" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

/* ── Human counselor card (rendered inside chat) ──────────────────── */

function CounselorCard({ consented, onGrant }: { consented: boolean; onGrant: () => void }) {
  return (
    <div className="counselor-card">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E11D2A] to-[#7A0D15] text-[15px] font-bold text-white">{COUNSELOR.initials}</div>
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white">
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#E11D2A]" fill="currentColor"><path d="M10 1l2.4 1.8 3-.1 1 2.8 2.5 1.6-1 2.8 1 2.8-2.5 1.6-1 2.8-3-.1L10 19l-2.4-1.8-3 .1-1-2.8L1.1 13l1-2.8-1-2.8 2.5-1.6 1-2.8 3 .1L10 1z"/><path d="M8.6 12.2 6.4 10l-1 1 3.2 3.2 5.8-5.8-1-1z" fill="#fff"/></svg>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[14px] font-extrabold text-[var(--ab-ink)]">{COUNSELOR.name}</p>
            <span className="rounded-full bg-[#FDECEE] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#E11D2A]">Verified</span>
          </div>
          <p className="text-[12px] font-medium text-[#6B655C]">{COUNSELOR.role}</p>
          <p className="mt-0.5 text-[11px] text-[#8A847B]">{COUNSELOR.experience}</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-[#3F3A33]">{COUNSELOR.blurb}</p>
      {consented ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#F2FBF6] border border-emerald-100 px-3.5 py-2.5 text-[12.5px] font-semibold text-emerald-700">
          <CheckCircleIcon />
          <span>{COUNSELOR.name.split(" ")[0]} will reach out to call you soon.</span>
        </div>
      ) : (
        <button type="button" onClick={onGrant} className="counselor-call-btn">
          <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none"><path d="M4.5 3h3l1.2 3-1.6 1.2a9 9 0 0 0 4.7 4.7L13 10.3l3 1.2v3a1.5 1.5 0 0 1-1.6 1.5A12.5 12.5 0 0 1 3 4.6 1.5 1.5 0 0 1 4.5 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          Allow {COUNSELOR.name.split(" ")[0]} to call me
        </button>
      )}
      <p className="mt-2 text-[10.5px] text-[#A8A296]">Free · Abroadly&apos;s own counsellor · not a paid agent</p>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */

export default function ChatPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState<string>("");
  const [student, setStudent] = useState<StudentOut | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  // Raw chat-history turns (for the dashboard's "Pick up where you left off" module
  // and for any other surface that needs role + timestamp metadata, which the rendered
  // Message[] union loses). Hydrated from getChatHistory on mount, appended on each send.
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docPanelOpen, setDocPanelOpen] = useState(false);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [uploadPrompt, setUploadPrompt] = useState<{ label: string } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [callConsented, setCallConsented] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Hold a ref to sendMessage so the URL-deep-link effect (below) can call the
  // latest version without re-running every time sendMessage's deps change.
  const sendMessageRef = useRef<((text?: string) => void) | null>(null);

  // URL deep links
  //   ?docs=open    → opens the document upload panel (existing behaviour)
  //   ?send=<query> → auto-sends a question on landing (used by /dashboard's
  //                   "Ask Abroadly" buttons to deep-link a specific prompt into chat)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("docs") === "open") setDocPanelOpen(true);
    const pendingSend = params.get("send");
    if (pendingSend) {
      const q = pendingSend;
      setTimeout(() => sendMessageRef.current?.(q), 300);
    }
    if (params.get("docs") || params.get("send") || params.get("panel")) {
      const next = new URL(window.location.href);
      next.searchParams.delete("docs");
      next.searchParams.delete("send");
      next.searchParams.delete("panel");
      window.history.replaceState({}, "", next.toString());
    }
  }, []);

  const firstName = useMemo(() => (student?.full_name || "").trim().split(/\s+/)[0] || "", [student]);
  const userInitial = (firstName || "Y").charAt(0).toUpperCase();
  const uploadedCount = documents.length;
  const phoneRequired = Boolean(student && !student.phone?.trim());

  const refreshDocuments = useCallback(async (sid: string) => {
    if (!sid) return;
    const docs = await getStudentDocuments(sid);
    setDocuments(docs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      let sid = localStorage.getItem("abroadly_student_id");
      if (!sid) {
        try {
          const current = await getCurrentStudent();
          if (!current.profile_completed) { router.replace("/onboarding/details"); return; }
          sid = current.id;
          localStorage.setItem("abroadly_student_id", current.id);
          if (!cancelled) setStudent(current);
        } catch {
          router.replace("/onboarding");
          return;
        }
      }
      try {
        const s = await getStudent(sid);
        if (!s.profile_completed) { router.replace("/onboarding/details"); return; }
        if (!cancelled) {
          setStudent(s);
          setCallConsented(s.call_consent);
        }
      } catch {
        router.replace("/onboarding");
        return;
      }
      if (cancelled) return;
      setStudentId(sid);
      refreshDocuments(sid).catch(() => {});
      try {
        const turns = await getChatHistory(sid);
        if (cancelled) return;
        setChatHistory(turns);
        const restored: Message[] = turns.map((t): Message => {
          if (t.role === "user") return { role: "user", text: t.content };
          if (t.role === "counselor") return { role: "counselor", text: t.content };
          return {
            role: "ai",
            response: {
              request_id: t.id, trace_id: t.id,
              decision: (t.eval_decision as ChatResponse["decision"]) || "proceed",
              confidence: 1, answer: t.content, clarifying_question: null,
              clarification_needed: false, sources: [], reason: "history",
            },
          };
        });
        setMessages(restored);
      } catch { /* empty history is fine */ }
    }
    restoreSession();
    return () => { cancelled = true; };
  }, [router, refreshDocuments]);

  useEffect(() => {
    if (docPanelOpen && studentId) {
      refreshDocuments(studentId).catch(() => {});
    }
  }, [docPanelOpen, studentId, refreshDocuments]);

  useEffect(() => {
    if (phoneRequired) setProfileOpen(true);
  }, [phoneRequired]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  // Autofocus the composer once the session is ready.
  useEffect(() => {
    if (studentId) taRef.current?.focus();
  }, [studentId]);

  function growTextarea() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 168) + "px";
  }

  async function sendMessage(textFromPrompt?: string) {
    const text = (textFromPrompt ?? input).trim();
    if (!text || !studentId || thinking) return;
    if (phoneRequired) {
      setProfileOpen(true);
      return;
    }
    setInput("");
    requestAnimationFrame(() => {
      if (taRef.current) { taRef.current.style.height = "auto"; taRef.current.focus(); }
    });
    setMessages((m) => [...m, { role: "user", text }]);
    // Mirror into raw chat history so the dashboard "Pick up where you left off"
    // preview stays current without a refetch.
    setChatHistory((h) => [
      ...h,
      { id: `local-user-${Date.now()}`, role: "user", content: text, eval_decision: null, created_at: new Date().toISOString() },
    ]);
    setThinking(true);
    try {
      const res = await chat(studentId, text);
      setMessages((m) => [...m, { role: "ai", response: res }]);
      setChatHistory((h) => [
        ...h,
        { id: res.request_id || `local-ai-${Date.now()}`, role: "assistant", content: res.answer || "", eval_decision: res.decision, created_at: new Date().toISOString() },
      ]);
      // When the AI nudges an upload, surface a clean popup (once, not while panel open).
      if (answerWantsUpload(res) && !docPanelOpen) {
        setUploadPrompt({ label: inferUploadLabel(res) });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error contacting server.";
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          response: {
            request_id: "", trace_id: "", decision: "out_of_scope", confidence: 0,
            answer: `Something went wrong reaching the server. Please try again in a moment.\n\n(${msg})`,
            clarifying_question: null, clarification_needed: false, sources: [], reason: "error",
          },
        },
      ]);
    } finally {
      setThinking(false);
      requestAnimationFrame(() => taRef.current?.focus());
    }
  }

  // Keep the ref in sync — see the ?send= URL-deep-link handler above
  sendMessageRef.current = sendMessage;

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
    setMessages((m) => [...m, { role: "upload", status: "uploading", filename: file.name, text: `Uploading ${file.name}` }]);
    setUploading(true);
    try {
      const res = await uploadFile(studentId, file);
      const document = res.document;
      if (document) {
        setDocuments((docs) => [document, ...docs.filter((doc) => doc.doc_id !== document.doc_id)]);
      } else {
        refreshDocuments(studentId).catch(() => {});
      }
      setMessages((m) => m.map((msg, i) => (i === m.length - 1 && msg.role === "upload" ? { ...msg, status: "done" as const, text: `Uploaded ${file.name}. I can now reference this document.` } : msg)));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Upload failed.";
      setMessages((m) => m.map((msg, i) => (i === m.length - 1 && msg.role === "upload" ? { ...msg, status: "error" as const, text: `Upload failed: ${errMsg}` } : msg)));
    } finally {
      setUploading(false);
    }
  }

  const handleDocUploadDone = useCallback((docType: DocType, filename: string, document: StudentDocument | null) => {
    if (document) {
      setDocuments((docs) => [document, ...docs.filter((doc) => doc.doc_id !== document.doc_id)]);
    } else if (studentId) {
      refreshDocuments(studentId).catch(() => {});
    }
    setMessages((m) => [...m, { role: "upload", status: "done" as const, filename, text: `Uploaded ${docType.label}: ${filename}`, docType: docType.id }]);
  }, [refreshDocuments, studentId]);

  function showCounselorCard() {
    setCallConsented(false);
    setMessages((m) => {
      // Avoid stacking duplicate cards at the end.
      if (m.length && m[m.length - 1].role === "counselor_card") return m;
      return [...m, { role: "counselor_card" }];
    });
  }

  async function grantCounselorCall() {
    if (phoneRequired) {
      setProfileOpen(true);
      return;
    }
    setCallConsented(true); // optimistic
    try {
      await requestCounselorCall(studentId, student?.phone || undefined);
    } catch {
      /* consent is best-effort; keep optimistic UI */
    }
  }

  const hasMessages = messages.length > 0;

  // Sidebar to-do: top 3 pending items for the student's primary target country.
  // Same priority engine as the dashboard hero, so the two surfaces never disagree.
  const sidebarTodos: PendingTodo[] = useMemo(() => {
    if (!student) return [];
    const docTypes = new Set(documents.map((d) => d.doc_type));
    const country = resolveTargetCountries(student.target_countries)[0];
    const countryName = COUNTRY_PROFILES[country].name;
    return pickPendingTodos(
      student.profile_completed,
      docTypes,
      countryName,
      student.preferred_field ?? "your field",
      3,
    );
  }, [student, documents]);

  // Suggestion rail: contextual follow-ups from the last AI reply, else curated starters.
  const railSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "ai") {
        const acts = parseAnswer(m.response.answer ?? m.response.clarifying_question ?? "")
          .actions.filter((a) => !a.isUpload)
          .map((a) => a.text);
        if (acts.length) return acts.slice(0, 5);
        break;
      }
      if (m.role === "user") break;
    }
    return starterSuggestions;
  }, [messages]);

  return (
    <main className="chat-layout">
      {/* ── Sidebar ───────────────────────────────────────────────────
          Three focused sections on a paper-2 band: Counsellor / Documents
          / To-do. The chat header has a Dashboard link for the fuller surface.
          Hidden below lg; on mobile, the chat-header buttons (Dashboard,
          Docs) cover the same affordances. */}
      <aside className="chat-sidebar">
        {/* Tiny header — logo + profile chip */}
        <div className="border-b border-[#E8E5DD] bg-[#FAF9F6] px-5 py-4">
          <Link href="/" className="ab-focus flex items-center gap-2.5 rounded-md">
            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-[8px]">
              <img src="/images/abroadly-logo.png" alt="Ab" className="h-full w-full object-cover" />
            </div>
            <span className="text-[13px] font-bold tracking-[-0.005em] text-[#1B1916]">Abroadly</span>
          </Link>
          {student && (
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="ab-focus mt-3 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition hover:bg-[#F4F2EC]"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#12244a] text-[10px] font-bold text-white">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-semibold text-[#1B1916]">{firstName || "Your profile"}</p>
                <p className={`truncate text-[10px] ${phoneRequired ? "font-semibold text-[#B42318]" : "text-[#8A847B]"}`}>
                  {phoneRequired
                    ? "Phone required"
                    : [student.education_level?.replace(/_/g, " "), (student.target_countries || [])[0]].filter(Boolean).join(" · ") || "Tap to edit"}
                </p>
              </div>
              <ArrowRightSm />
            </button>
          )}
        </div>

        {/* Section 1 · Counsellor */}
        <section className="border-b border-[#E8E5DD] px-5 py-6">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#0A6E45]">Counsellor</p>
          <div className="mt-3 flex items-start gap-3">
            <div
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8F2EC] text-[12px] font-bold text-[#0A6E45]"
            >
              {COUNSELOR.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold tracking-[-0.005em] text-[#1B1916]">{COUNSELOR.name}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-[#6B655C]">Study-Abroad Counsellor</p>
              <p className="mt-1 text-[10.5px] leading-tight text-[#8A847B]">{COUNSELOR.experience}</p>
            </div>
          </div>
          {callConsented ? (
            <div className="mt-3 flex items-center gap-1.5 rounded-md bg-[#E8F2EC] px-2.5 py-2 text-[11px] font-semibold leading-[1.4] text-[#0A6E45]">
              <CheckCircleIcon />
              <span>Requested · we&apos;ll reach out within 1 working day</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={grantCounselorCall}
              className="ab-focus mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#E8E5DD] bg-white py-2 text-[12px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
            >
              <PhoneIcon />
              Request a call
            </button>
          )}
        </section>

        {/* Section 2 · Documents (compact 8-row status) */}
        <section className="border-b border-[#E8E5DD] px-5 py-6">
          <div className="flex items-baseline justify-between">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#0A6E45]">Documents</p>
            <p className="text-[10.5px] font-semibold text-[#6B655C]">
              {uploadedCount} / {SIDEBAR_DOC_SLOTS.length}
            </p>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {SIDEBAR_DOC_SLOTS.map((slot) => {
              const uploaded = documents.some((d) => d.doc_type === slot.id);
              return (
                <li key={slot.id} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white ${
                      uploaded ? "bg-[#0A6E45]" : "border border-[#D1CABD] bg-transparent"
                    }`}
                  >
                    {uploaded && (
                      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                        <path d="M2.5 5.5 4 7l3.5-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className={`flex-1 truncate text-[11.5px] ${uploaded ? "text-[#1B1916]" : "text-[#6B655C]"}`}>
                    {slot.label}
                  </span>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setDocPanelOpen(true)}
            className="ab-focus mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#E8E5DD] bg-white py-2 text-[12px] font-semibold text-[#1B1916] transition hover:border-[#0A6E45] hover:text-[#0A6E45]"
          >
            <FolderIcon />
            Upload
          </button>
        </section>

        {/* Section 3 · To-do (top 3 pending) */}
        <section className="px-5 py-6">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#0A6E45]">To-do</p>
          {sidebarTodos.length === 0 ? (
            <p className="mt-3 text-[11.5px] leading-[1.55] text-[#6B655C]">
              You&apos;re caught up. Keep refining your shortlist in chat.
            </p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2.5">
              {sidebarTodos.map((todo, i) => (
                <li key={todo.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (todo.query) sendMessage(todo.query);
                      else if (todo.href) router.push(todo.href);
                    }}
                    className="ab-focus group flex w-full items-start gap-2 rounded-md px-1 py-1 text-left transition hover:bg-white"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#FAF9F6] text-[9px] font-bold text-[#0A6E45] ring-1 ring-[#E8E5DD]"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold leading-tight text-[#1B1916]">
                        {todo.title}
                      </p>
                      <p className="mt-0.5 truncate text-[10.5px] leading-tight text-[#8A847B]">
                        {todo.detail}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <Link
            href="/dashboard"
            className="ab-focus mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F3D78] transition hover:text-[#0A6E45]"
          >
            Open dashboard <ArrowRightSm />
          </Link>
        </section>

        <div className="mt-auto border-t border-[#E8E5DD] px-5 py-3">
          <button
            type="button"
            onClick={() => { logoutStudent().finally(() => { localStorage.removeItem("abroadly_student_id"); router.push("/onboarding"); }); }}
            className="ab-focus inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8A847B] transition hover:text-[#1B1916]"
          >
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none"><path d="M6 14H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 2h2M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Log out
          </button>
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
              <h1 className="text-[15px] font-bold text-[var(--ab-ink)]">Study Abroad Chat</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7DDBB1] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0A6E45]" />
                </span>
                <span className="text-[11px] font-medium text-[#8A847B]">AI advisor online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="ab-focus chat-header-btn flex items-center gap-1.5"
              title="Open your full dashboard — to-do, recommended universities, timeline"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none">
                <rect x="3" y="3" width="6" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                <rect x="11" y="3" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                <rect x="3" y="13" width="6" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                <rect x="11" y="10" width="6" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <button type="button" onClick={() => setDocPanelOpen(true)} className="ab-focus chat-header-btn flex items-center gap-1.5 lg:hidden">
              <FolderIcon />
              <span>Docs</span>
              {uploadedCount > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[9px] font-bold text-red-700">{uploadedCount}</span>}
            </button>
            <button
              type="button"
              onClick={() => { logoutStudent().finally(() => { localStorage.removeItem("abroadly_student_id"); router.push("/onboarding"); }); }}
              className="ab-focus chat-header-btn flex items-center gap-1.5"
            >
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none"><path d="M8 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M13 14l4-4-4-4M17 10H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Logout
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="chat-messages">
          <div className="mx-auto max-w-3xl">
            {/* Empty state — personalized launcher */}
            {!hasMessages && (
              <div className="chat-welcome">
                <div className="h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-black/5 shadow-[var(--shadow-md)]">
                  <img src="/images/abroadly-logo.png" alt="Abroadly" className="h-full w-full object-cover" />
                </div>
                <h2 className="mt-5 text-[26px] font-extrabold tracking-[-0.02em] text-[var(--ab-ink)]">
                  {firstName ? `Namaste, ${firstName} ` : "Namaste "}<span className="align-middle">👋</span>
                </h2>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-[#6B655C]">
                  I&apos;m your free study-abroad guide. Pick a topic to begin, or just type your question below — no question is too small.
                </p>

                <div className="chat-launcher">
                  {categories.map((c) => (
                    <button key={c.label} type="button" onClick={() => sendMessage(c.question)} className="ab-focus chat-launcher-card group">
                      <span className="chat-launcher-icon">{c.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-bold text-[var(--ab-ink)]">{c.label}</span>
                        <span className="block truncate text-[12px] text-[#8A847B]">{c.hint}</span>
                      </span>
                      <span className="chat-launcher-arrow"><ArrowUpIcon /></span>
                    </button>
                  ))}
                </div>

                <button type="button" onClick={() => setDocPanelOpen(true)} className="ab-focus chat-upload-nudge">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FDECEE] text-[#E11D2A]"><FolderIcon /></span>
                  <span className="text-left">
                    <span className="block text-[13px] font-semibold text-[var(--ab-ink)]">Upload your documents</span>
                    <span className="block text-[11px] text-[#8A847B]">Marksheet, passport, IELTS — for answers tailored to you</span>
                  </span>
                </button>
              </div>
            )}

            {/* Conversation */}
            <div className="space-y-1">
              {messages.map((msg, i) => {
                if (msg.role === "user") {
                  return (
                    <div key={i} className="chat-row chat-row-user" style={{ animationDelay: "0.04s" }}>
                      <div className="chat-bubble-user">
                        <p className="whitespace-pre-wrap text-[14px] leading-[1.65]">{msg.text}</p>
                      </div>
                      <UserAvatar initial={userInitial} />
                    </div>
                  );
                }
                if (msg.role === "counselor") {
                  return (
                    <div key={i} className="chat-row chat-row-ai" style={{ animationDelay: "0.04s" }}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-emerald-600 ring-1 ring-emerald-500/20">
                        <span className="text-[10px] font-bold text-white">HC</span>
                      </div>
                      <div className="chat-bubble-ai" style={{ borderColor: "rgba(16,185,129,0.2)", background: "#F2FBF6" }}>
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1">Human Counselor</p>
                        <p className="chat-bubble-text whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  );
                }
                if (msg.role === "counselor_card") {
                  return (
                    <div key={i} className="chat-row chat-row-ai" style={{ animationDelay: "0.04s" }}>
                      <AiAvatar />
                      <CounselorCard consented={callConsented} onGrant={grantCounselorCall} />
                    </div>
                  );
                }
                if (msg.role === "upload") {
                  const colorClass = msg.status === "done" ? "chat-upload-done" : msg.status === "error" ? "chat-upload-error" : "chat-upload-pending";
                  return (
                    <div key={i} className="chat-row chat-row-ai" style={{ animationDelay: "0.04s" }}>
                      <AiAvatar />
                      <div className={`chat-upload-pill ${colorClass}`}>
                        {msg.status === "done" ? <CheckCircleIcon /> : <PaperclipIcon />}
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={i} className="chat-row chat-row-ai" style={{ animationDelay: "0.04s" }}>
                    <AiAvatar />
                    <AiResponseBubble response={msg.response} />
                  </div>
                );
              })}

              {thinking && (
                <div className="chat-row chat-row-ai" style={{ animationDelay: "0.04s" }}>
                  <AiAvatar />
                  <div className="chat-bubble-ai inline-flex items-center gap-2">
                    <TypingDots />
                    <span className="text-[12px] text-[#8A847B]">Thinking…</span>
                  </div>
                </div>
              )}
            </div>

            <div ref={bottomRef} className="h-4" />
          </div>
        </div>

        {/* Composer */}
        <footer className="chat-footer">
          <div className="mx-auto max-w-3xl">
            {/* Suggestion rail — always one tap from the next question */}
            {!thinking && railSuggestions.length > 0 && (
              <div className="chat-suggestion-rail">
                {railSuggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => sendMessage(s)} className="ab-focus chat-suggestion-chip">
                    {hasMessages ? <ArrowUpIcon /> : <span className="text-[#E11D2A]">✦</span>}
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="chat-input-wrap">
              <textarea
                ref={taRef}
                className="chat-input"
                placeholder={firstName ? `Ask anything, ${firstName} — eligibility, costs, visa, scholarships…` : "Ask anything — eligibility, costs, visa, scholarships…"}
                value={input}
                onChange={(e) => { setInput(e.target.value); growTextarea(); }}
                onKeyDown={onKey}
                disabled={thinking}
                rows={1}
              />
              <div className="flex items-center gap-1.5 px-2 pb-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} title="Quick upload" aria-label="Quick upload" className="ab-focus chat-action-btn">
                  <PaperclipIcon />
                </button>
                <button type="button" onClick={() => setDocPanelOpen(true)} title="Upload documents" aria-label="Upload documents" className="ab-focus chat-action-btn">
                  <FolderIcon />
                </button>
                <div className="flex-1" />
                <span className="text-[10px] text-[#B5B0A6] font-medium hidden sm:block">Enter to send</span>
                <button type="button" onClick={() => sendMessage()} disabled={thinking || !input.trim()} title="Send message" aria-label="Send message" className="ab-focus chat-send-btn">
                  <SendIcon />
                </button>
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.jpg,.jpeg,.png" className="hidden" onChange={onFileChange} />
            </div>
            <p className="mt-2 text-center text-[10px] text-[#B5B0A6]">Abroadly can make mistakes. Verify important details with official sources.</p>
          </div>
        </footer>
      </section>

      {/* The dashboard is now a full standalone page at /dashboard — the chat-header
          link navigates there. The in-chat rail/drawer experiment was removed once the
          dashboard grew rich enough (universities, courses, timeline, costs) that 360px
          could no longer hold it comfortably. dashboard-panel.tsx is retained in the
          repo as a reference but is no longer rendered. */}

      <DocumentPanel
        open={docPanelOpen}
        onClose={() => setDocPanelOpen(false)}
        studentId={studentId}
        documents={documents}
        onUploadDone={handleDocUploadDone}
        onDiscuss={(dt) => {
          setDocPanelOpen(false);
          sendMessage(`I just uploaded my ${dt.label}. Please review it — what stands out, and what should I improve or double-check?`);
        }}
      />

      {uploadPrompt && (
        <UploadPromptModal
          label={uploadPrompt.label}
          onUpload={() => { setUploadPrompt(null); setDocPanelOpen(true); }}
          onClose={() => setUploadPrompt(null)}
        />
      )}

      {profileOpen && student && (
        <ProfilePopup
          student={student}
          requirePhone={phoneRequired}
          onClose={() => setProfileOpen(false)}
          onSaved={(updated) => {
            setStudent(updated);
            setCallConsented(updated.call_consent);
            setProfileOpen(false);
          }}
        />
      )}
    </main>
  );
}
