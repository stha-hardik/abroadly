"use client";
import { useState } from "react";
import { sendChat, uploadDoc, type ChatResponse } from "@/lib/api";

export default function ChatPage() {
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState<ChatResponse[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (!studentId || !message) return;
    setBusy(true);
    try {
      const res = await sendChat({ student_id: studentId, message });
      setThread(t => [...t, res]);
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !studentId) return;
    setBusy(true);
    try {
      await uploadDoc(studentId, f);
      alert("uploaded");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Chat</h1>
      <input placeholder="Student id" value={studentId} onChange={e => setStudentId(e.target.value)} />
      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {thread.map((t, i) => (
          <div key={i} style={{ border: "1px solid #ddd", padding: 12 }}>
            <small>{t.decision} — {t.reason}</small>
            <p>{t.answer || t.clarifying_question}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input style={{ flex: 1 }} placeholder="Ask..." value={message} onChange={e => setMessage(e.target.value)} />
        <button onClick={ask} disabled={busy}>Send</button>
      </div>
      <div style={{ marginTop: 12 }}>
        <label>Upload transcript / certificate: <input type="file" onChange={onUpload} /></label>
      </div>
    </main>
  );
}
