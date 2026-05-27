"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { getStudents, type StudentListItem } from "@/lib/admin-api";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function StudentsListPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(() => {
    getStudents(page, search).then((d) => { setStudents(d.items); setTotal(d.total); }).catch(() => {});
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ab-ink)]">Students</h1>
          <p className="text-sm text-gray-400 mt-1">{total} total</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name or email..."
            className="rounded-xl border border-gray-200 px-4 py-2 text-[13px] w-60 focus:outline-none focus:border-[var(--ab-plum)]/40"
          />
          <button type="submit" className="rounded-xl bg-[var(--ab-ink)] px-4 py-2 text-[12px] font-bold text-white hover:bg-[var(--ab-ink-2)] transition">
            Search
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {students.map((s) => (
          <Link
            key={s.id}
            href={`/admin/students/${s.id}`}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition"
          >
            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ab-ink)] text-[11px] font-bold text-white">
              {s.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--ab-ink)] truncate">{s.full_name}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                  s.ai_paused ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                }`}>
                  <span className={`h-1 w-1 rounded-full ${s.ai_paused ? "bg-red-500" : "bg-emerald-500"}`} />
                  {s.ai_paused ? "Paused" : "AI"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate">{s.email}</p>
              {s.last_message && (
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  <span className="font-medium text-gray-500">
                    {s.last_message.role === "user" ? "Student" : s.last_message.role === "counselor" ? "You" : "AI"}:
                  </span>
                  {" "}{s.last_message.content}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 capitalize">{s.education_level.replace("_", " ")}</span>
                {s.gpa && <span className="text-[10px] font-mono text-gray-400">GPA {s.gpa}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{s.chat_count} msgs</span>
                {s.doc_count > 0 && <span className="text-[10px] text-gray-400">{s.doc_count} docs</span>}
                {s.target_countries.length > 0 && (
                  <span className="text-[10px] text-gray-400">{s.target_countries.join(", ")}</span>
                )}
              </div>
              {s.last_message && (
                <span className="text-[9px] text-gray-300">{timeAgo(s.last_message.created_at)}</span>
              )}
            </div>
          </Link>
        ))}

        {students.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
            {search ? "No students match your search" : "No students yet"}
          </div>
        )}
      </div>

      {total > 20 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-gray-200 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-[12px] text-gray-400">Page {page} of {Math.ceil(total / 20)}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page * 20 >= total}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-gray-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
