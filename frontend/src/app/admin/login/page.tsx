"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/admin-api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminLogin(username, password);
      router.push("/admin");
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0b1a] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--ab-plum)] to-[var(--ab-mint)] mb-4">
            <span className="text-sm font-black text-white">Ab</span>
          </div>
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">Sign in to manage students</p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--ab-plum)]/50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-white/[0.06] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[var(--ab-plum)]/50"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-[var(--ab-plum)] py-3 text-sm font-bold text-white hover:bg-[#5a2bd4] transition disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
