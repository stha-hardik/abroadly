"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getStudent,
  getStudentChat,
  toggleAI,
  sendCounselorReply,
  type StudentDetail,
  type ChatTurn,
} from "@/lib/admin-api";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [toggling, setToggling] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getStudent(id).then(setStudent).catch(() => {});
    getStudentChat(id).then(setChat).catch(() => {});
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  async function handleToggle() {
    if (!student || !id) return;
    setToggling(true);
    try {
      await toggleAI(id, !student.ai_paused);
      setStudent({ ...student, ai_paused: !student.ai_paused });
    } catch {}
    setToggling(false);
  }

  async function handleReply() {
    if (!reply.trim() || !id) return;
    setSending(true);
    try {
      await sendCounselorReply(id, reply.trim());
      setChat((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "counselor",
          content: reply.trim(),
          eval_decision: "manual",
          created_at: new Date().toISOString(),
        },
      ]);
      setReply("");
    } catch {}
    setSending(false);
  }

  if (!student) {
    return <div className="p-8 text-sm text-gray-400">Loading...</div>;
  }

  const roleBadge: Record<string, { label: string; color: string }> = {
    user: { label: "Student", color: "bg-blue-50 text-blue-700" },
    assistant: { label: "AI", color: "bg-purple-50 text-purple-700" },
    counselor: { label: "Counselor", color: "bg-emerald-50 text-emerald-700" },
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left — Profile */}
      <div className="lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white p-5 lg:p-6 overflow-y-auto">
        <Link href="/admin/students" className="text-[11px] font-medium text-gray-400 hover:text-[var(--ab-plum)]">
          &larr; All students
        </Link>

        <h2 className="mt-4 text-lg font-bold text-[var(--ab-ink)]">{student.full_name}</h2>
        <p className="text-[12px] text-gray-400">{student.email}</p>

        <div className="mt-5 space-y-3">
          {[
            ["Phone", student.phone],
            ["Location", student.location],
            ["Education", student.education_level?.replace("_", " ")],
            ["GPA", student.gpa],
            ["Countries", student.target_countries?.join(", ")],
            ["Field", student.preferred_field],
            ["Goals", student.goals],
          ].map(([label, value]) =>
            value ? (
              <div key={label as string}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label as string}</p>
                <p className="text-[13px] text-[var(--ab-ink)] mt-0.5">{String(value)}</p>
              </div>
            ) : null
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">AI Replies</p>
              <p className="text-[13px] font-semibold mt-0.5">
                {student.ai_paused ? (
                  <span className="text-red-600">Paused</span>
                ) : (
                  <span className="text-emerald-600">Active</span>
                )}
              </p>
            </div>
            <button
              onClick={handleToggle}
              disabled={toggling}
              className={`relative h-7 w-12 rounded-full transition ${
                student.ai_paused ? "bg-gray-200" : "bg-emerald-500"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  student.ai_paused ? "left-0.5" : "left-[22px]"
                }`}
              />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {student.ai_paused
              ? "AI is paused. Student sees 'counselor is reviewing'. Send manual replies below."
              : "AI handles replies automatically. Toggle off to take over manually."}
          </p>
        </div>

        <p className="mt-5 text-[10px] text-gray-300">
          Joined {new Date(student.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Right — Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[var(--ab-ink)]">
            Chat with {student.full_name}
          </h3>
          <span className="text-[11px] text-gray-400">{chat.length} messages</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#faf9f7]">
          {chat.map((turn) => {
            const badge = roleBadge[turn.role] || roleBadge.user;
            return (
              <div key={turn.id} className={`flex gap-3 ${turn.role === "user" ? "" : ""}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-gray-300">
                      {new Date(turn.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                    turn.role === "user"
                      ? "bg-white border border-gray-100"
                      : turn.role === "counselor"
                      ? "bg-emerald-50 border border-emerald-100"
                      : "bg-purple-50/50 border border-purple-100/50"
                  }`}>
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {chat.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-12">No messages yet</p>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Reply input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex gap-2">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type a counselor reply..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
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
          <p className="mt-2 text-[10px] text-gray-300">
            This reply appears as a &quot;Counselor&quot; message in the student&apos;s chat.
          </p>
        </div>
      </div>
    </div>
  );
}
