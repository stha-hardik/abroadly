"use client";
import { useState } from "react";
import { createStudent } from "@/lib/api";

export default function OnboardingPage() {
  const [status, setStatus] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus("submitting...");
    try {
      const res = await createStudent({
        full_name: String(fd.get("full_name") || ""),
        email: String(fd.get("email") || ""),
        education_level: String(fd.get("education_level") || "plus_two") as any,
        target_countries: String(fd.get("target_countries") || "").split(",").map(s => s.trim()).filter(Boolean),
        goals: String(fd.get("goals") || ""),
      });
      setStatus(`created student: ${res.id}`);
    } catch (err: any) {
      setStatus(`error: ${err.message}`);
    }
  }

  return (
    <main>
      <h1>Onboarding</h1>
      <p>Tell us about yourself. Used to tailor your guidance.</p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input name="full_name" placeholder="Full name" required />
        <input name="email" placeholder="Email" type="email" required />
        <select name="education_level" defaultValue="plus_two">
          <option value="plus_two">+2</option>
          <option value="a_levels">A-levels</option>
          <option value="bba">BBA</option>
          <option value="bachelors">Bachelors</option>
          <option value="other">Other</option>
        </select>
        <input name="target_countries" placeholder="Target countries (comma-separated)" />
        <textarea name="goals" placeholder="What's your goal?" rows={4} />
        <button type="submit">Submit</button>
      </form>
      <p>{status}</p>
    </main>
  );
}
