"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStats, type Stats } from "@/lib/admin-api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) return <div className="p-8 text-sm text-gray-400">Loading...</div>;

  const cards = [
    { label: "Total Students", value: stats.total_students, icon: "\u{1F393}", color: "from-[var(--ab-plum)] to-purple-400" },
    { label: "Total Messages", value: stats.total_chats, icon: "\u{1F4AC}", color: "from-blue-500 to-blue-400" },
    { label: "New This Week", value: stats.students_this_week, icon: "\u{1F4C8}", color: "from-emerald-500 to-emerald-400" },
    { label: "Messages Today", value: stats.chats_today, icon: "\u{26A1}", color: "from-amber-500 to-amber-400" },
    { label: "Documents", value: stats.total_documents, icon: "\u{1F4C4}", color: "from-cyan-500 to-cyan-400" },
    { label: "AI Paused", value: stats.ai_paused_count, icon: "\u{23F8}\u{FE0F}", color: "from-red-500 to-red-400" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-[var(--ab-ink)]">Dashboard</h1>
      <p className="text-sm text-gray-400 mt-1">Overview of Abroadly activity</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{c.label}</p>
              <span className="text-lg">{c.icon}</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold text-[var(--ab-ink)]">{c.value}</p>
            <div className={`mt-2 h-1 w-8 rounded-full bg-gradient-to-r ${c.color}`} />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        {/* Top countries */}
        <div className="rounded-2xl bg-white p-5 border border-gray-100">
          <h3 className="text-[13px] font-bold text-[var(--ab-ink)]">Top Target Countries</h3>
          {stats.top_countries.length === 0 ? (
            <p className="mt-3 text-[12px] text-gray-400">No data yet</p>
          ) : (
            <div className="mt-3 space-y-2">
              {stats.top_countries.map((c) => (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-[var(--ab-ink)] w-20 truncate">{c.country}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--ab-plum)]"
                      style={{ width: `${Math.min(100, (c.count / (stats.top_countries[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-gray-400 w-6 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent students */}
        <div className="rounded-2xl bg-white p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-[var(--ab-ink)]">Recent Students</h3>
            <Link href="/admin/students" className="text-[11px] font-medium text-[var(--ab-plum)]">View all</Link>
          </div>
          {stats.recent_students.length === 0 ? (
            <p className="mt-3 text-[12px] text-gray-400">No students yet</p>
          ) : (
            <div className="mt-3 space-y-2">
              {stats.recent_students.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/students/${s.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="text-[12px] font-semibold text-[var(--ab-ink)]">{s.name}</p>
                    <p className="text-[10px] text-gray-400">{s.email}</p>
                  </div>
                  <span className="text-[10px] text-gray-300">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
