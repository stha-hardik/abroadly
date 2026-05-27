"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudents, type StudentListItem } from "@/lib/admin-api";

export default function StudentsListPage() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    getStudents(page).then((d) => { setStudents(d.items); setTotal(d.total); }).catch(() => {});
  }, [page]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ab-ink)]">Students</h1>
          <p className="text-sm text-gray-400 mt-1">{total} total students</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide hidden md:table-cell">Education</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Chats</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">AI</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td className="px-5 py-3.5">
                  <Link href={`/admin/students/${s.id}`} className="text-[13px] font-semibold text-[var(--ab-ink)] hover:text-[var(--ab-plum)]">
                    {s.full_name}
                  </Link>
                  <p className="text-[11px] text-gray-400 sm:hidden">{s.email}</p>
                </td>
                <td className="px-5 py-3.5 text-[12px] text-gray-500 hidden sm:table-cell">{s.email}</td>
                <td className="px-5 py-3.5 text-[12px] text-gray-500 hidden md:table-cell capitalize">{s.education_level.replace("_", " ")}</td>
                <td className="px-5 py-3.5 text-[12px] font-medium text-gray-600">{s.chat_count}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    s.ai_paused
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.ai_paused ? "bg-red-500" : "bg-emerald-500"}`} />
                    {s.ai_paused ? "Paused" : "Active"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {students.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No students yet</div>
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
          <span className="text-[12px] text-gray-400">Page {page}</span>
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
