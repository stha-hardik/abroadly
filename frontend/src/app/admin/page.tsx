"use client";

import { useEffect, useState } from "react";
import { getStats, type Stats } from "@/lib/admin-api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  const cards = stats
    ? [
        { label: "Total Students", value: stats.total_students, color: "from-[var(--ab-plum)] to-purple-400" },
        { label: "Total Messages", value: stats.total_chats, color: "from-blue-500 to-blue-400" },
        { label: "New This Week", value: stats.students_this_week, color: "from-emerald-500 to-emerald-400" },
        { label: "Messages Today", value: stats.chats_today, color: "from-amber-500 to-amber-400" },
        { label: "AI Paused", value: stats.ai_paused_count, color: "from-red-500 to-red-400" },
      ]
    : [];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-[var(--ab-ink)]">Dashboard</h1>
      <p className="text-sm text-gray-400 mt-1">Overview of Abroadly activity</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-5 border border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{c.label}</p>
            <p className="mt-2 text-3xl font-bold text-[var(--ab-ink)]">{c.value}</p>
            <div className={`mt-3 h-1 w-10 rounded-full bg-gradient-to-r ${c.color}`} />
          </div>
        ))}
      </div>

      {!stats && (
        <div className="mt-12 text-center text-sm text-gray-400">Loading stats...</div>
      )}
    </div>
  );
}
