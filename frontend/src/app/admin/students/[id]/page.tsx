"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getStudent,
  getStudentChat,
  getStudentDocs,
  getDocDownloadUrl,
  fetchDocObjectUrl,
  toggleAI,
  sendCounselorReply,
  type StudentDetail,
  type ChatTurn,
  type DocItem,
} from "@/lib/admin-api";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const DOC_TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  grade_sheet: { label: "Grade Sheet / Transcript", icon: "\u{1F4CA}" },
  citizenship: { label: "Citizenship", icon: "\u{1F1F3}\u{1F1F5}" },
  passport: { label: "Passport", icon: "\u{1F6C2}" },
  sop: { label: "Statement of Purpose", icon: "\u{270D}\u{FE0F}" },
  recommendation: { label: "Recommendation Letter", icon: "\u{1F4E8}" },
  financial: { label: "Financial Documents", icon: "\u{1F3E6}" },
  ielts: { label: "IELTS / PTE / TOEFL", icon: "\u{1F4DD}" },
  other: { label: "Document", icon: "\u{1F4CE}" },
};

function docTypeMeta(t: string) {
  return DOC_TYPE_LABELS[t] || DOC_TYPE_LABELS.other;
}

/* Single document row with an authed image preview (object URL). */
function DocCard({ studentId, doc }: { studentId: string; doc: DocItem }) {
  const [preview, setPreview] = useState<string | null>(null);
  const meta = docTypeMeta(doc.doc_type);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (doc.is_image) {
      fetchDocObjectUrl(studentId, doc.doc_id)
        .then((u) => { if (!cancelled) { url = u; setPreview(u); } })
        .catch(() => {});
    }
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [studentId, doc.doc_id, doc.is_image]);

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 p-3.5">
      {preview ? (
        <img src={preview} alt={meta.label} className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#F4F2EC] text-2xl">
          {meta.icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[var(--ab-ink)] truncate">{meta.label}</p>
        <p className="text-[11px] text-gray-500 truncate">{doc.filename}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {doc.ext.replace(".", "").toUpperCase()} {"\u{00B7}"} {formatBytes(doc.size_bytes)} {"\u{00B7}"} {timeAgo(doc.uploaded_at)}
        </p>
      </div>
      <a
        href={getDocDownloadUrl(studentId, doc.doc_id)}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 transition"
      >
        Open
      </a>
    </div>
  );
}

type Tab = "chat" | "documents" | "profile";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadChat = useCallback(() => {
    if (!id) return;
    getStudentChat(id).then(setChat).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getStudent(id).then(setStudent).catch(() => {});
    loadChat();
    getStudentDocs(id).then(setDocs).catch(() => {});
  }, [id, loadChat]);

  // Auto-refresh chat every 5 seconds
  useEffect(() => {
    const interval = setInterval(loadChat, 5000);
    return () => clearInterval(interval);
  }, [loadChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  async function handleToggle() {
    if (!student || !id) return;
    try {
      await toggleAI(id, !student.ai_paused);
      setStudent({ ...student, ai_paused: !student.ai_paused });
    } catch {}
  }

  async function handleReply() {
    if (!reply.trim() || !id) return;
    setSending(true);
    try {
      await sendCounselorReply(id, reply.trim());
      setReply("");
      loadChat();
    } catch {}
    setSending(false);
  }

  if (!student) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  const roleBadge: Record<string, { label: string; color: string; bg: string }> = {
    user: { label: "Student", color: "text-blue-700", bg: "bg-white border border-gray-100" },
    assistant: { label: "AI", color: "text-purple-700", bg: "bg-purple-50/50 border border-purple-100/50" },
    counselor: { label: "Counselor", color: "text-emerald-700", bg: "bg-emerald-50 border border-emerald-100" },
  };

  const profileFields = [
    { label: "Email", value: student.email, icon: "\u{2709}\u{FE0F}" },
    { label: "Phone", value: student.phone, icon: "\u{1F4F1}" },
    { label: "Location", value: student.location, icon: "\u{1F4CD}" },
    { label: "Education", value: student.education_level?.replace("_", " "), icon: "\u{1F393}" },
    { label: "GPA", value: student.gpa, icon: "\u{1F4CA}" },
    { label: "Target Countries", value: student.target_countries?.join(", "), icon: "\u{1F30D}" },
    { label: "Field", value: student.preferred_field, icon: "\u{1F4D6}" },
    { label: "Goals", value: student.goals, icon: "\u{1F3AF}" },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left sidebar — profile summary */}
      <div className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white overflow-y-auto">
        <div className="p-5">
          <Link href="/admin/students" className="text-[11px] font-medium text-gray-400 hover:text-[var(--ab-plum)]">
            &larr; All students
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ab-ink)] text-sm font-bold text-white">
              {student.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-[var(--ab-ink)] truncate">{student.full_name}</h2>
              <p className="text-[11px] text-gray-400 truncate">{student.email}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3 mt-4">
            <div className="flex-1 rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-[16px] font-bold text-[var(--ab-ink)]">{student.chat_count}</p>
              <p className="text-[9px] text-gray-400 uppercase">Messages</p>
            </div>
            <div className="flex-1 rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-[16px] font-bold text-[var(--ab-ink)]">{student.doc_count}</p>
              <p className="text-[9px] text-gray-400 uppercase">Docs</p>
            </div>
          </div>

          {/* AI toggle */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-100 p-3">
            <div>
              <p className="text-[11px] font-bold text-gray-500">AI Replies</p>
              <p className="text-[12px] font-semibold">
                {student.ai_paused ? <span className="text-red-600">Paused</span> : <span className="text-emerald-600">Active</span>}
              </p>
            </div>
            <button
              onClick={handleToggle}
              className={`relative h-6 w-11 rounded-full transition ${student.ai_paused ? "bg-gray-200" : "bg-emerald-500"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${student.ai_paused ? "left-0.5" : "left-[22px]"}`} />
            </button>
          </div>

          {/* Key profile fields (compact) */}
          <div className="mt-4 space-y-2">
            {profileFields.map(({ label, value, icon }) =>
              value ? (
                <div key={label} className="flex items-start gap-2">
                  <span className="text-xs mt-0.5 shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                    <p className="text-[12px] text-[var(--ab-ink)] capitalize break-words">{String(value)}</p>
                  </div>
                </div>
              ) : null
            )}
          </div>

          <p className="mt-4 text-[9px] text-gray-300">
            Joined {new Date(student.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Right — tabs */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-gray-100 bg-white px-5">
          {(["chat", "documents", "profile"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-[12px] font-semibold border-b-2 transition capitalize ${
                tab === t
                  ? "border-[var(--ab-plum)] text-[var(--ab-plum)]"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t}
              {t === "documents" && docs.length > 0 && (
                <span className="ml-1.5 text-[9px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{docs.length}</span>
              )}
              {t === "chat" && chat.length > 0 && (
                <span className="ml-1.5 text-[9px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">{chat.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Chat tab */}
        {tab === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5 bg-[#faf9f7]">
              {chat.map((turn) => {
                const badge = roleBadge[turn.role] || roleBadge.user;
                return (
                  <div key={turn.id} className="flex gap-2.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${badge.color} bg-opacity-50`}>
                          {badge.label}
                        </span>
                        <span className="text-[9px] text-gray-300">
                          {new Date(turn.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" \u{00B7} "}
                          {timeAgo(turn.created_at)}
                        </span>
                      </div>
                      <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${badge.bg}`}>
                        <p className="whitespace-pre-wrap">{turn.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {chat.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-16">No messages yet</p>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type a counselor reply..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }
                  }}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] resize-none focus:outline-none focus:border-[var(--ab-plum)]/40"
                />
                <button
                  onClick={handleReply}
                  disabled={sending || !reply.trim()}
                  className="self-end rounded-xl bg-emerald-600 px-5 py-2.5 text-[12px] font-bold text-white hover:bg-emerald-700 transition disabled:opacity-40"
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
              <p className="mt-1.5 text-[9px] text-gray-300">
                Appears as &quot;Counselor&quot; in the student&apos;s chat. Enter to send.
              </p>
            </div>
          </>
        )}

        {/* Documents tab */}
        {tab === "documents" && (
          <div className="flex-1 overflow-y-auto p-5 bg-[#faf9f7]">
            {docs.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">{"\u{1F4C2}"}</p>
                <p className="text-sm text-gray-400">No documents uploaded yet</p>
                <p className="text-[11px] text-gray-300 mt-1">Documents will appear here when the student uploads them</p>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((doc) => (
                  <DocCard key={doc.doc_id} studentId={id!} doc={doc} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile tab (full detail) */}
        {tab === "profile" && (
          <div className="flex-1 overflow-y-auto p-5 bg-[#faf9f7]">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 max-w-lg">
              <h3 className="text-[15px] font-bold text-[var(--ab-ink)] mb-4">Full Profile</h3>
              <div className="space-y-4">
                {profileFields.map(({ label, value, icon }) => (
                  <div key={label} className="flex items-start gap-3">
                    <span className="text-lg shrink-0">{icon}</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
                      <p className="text-[13px] text-[var(--ab-ink)] mt-0.5 capitalize">
                        {value ? String(value) : <span className="text-gray-300 italic">Not provided</span>}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{"\u{1F4C5}"}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Joined</p>
                    <p className="text-[13px] text-[var(--ab-ink)] mt-0.5">
                      {new Date(student.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{"\u{1F504}"}</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Last Updated</p>
                    <p className="text-[13px] text-[var(--ab-ink)] mt-0.5">
                      {new Date(student.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
