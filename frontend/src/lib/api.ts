// Typed client for the Abroadly backend.
// In Phase 2+ this can be auto-generated from /openapi.json.

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export type EducationLevel = "plus_two" | "a_levels" | "bba" | "bachelors" | "other";

export interface StudentCreate {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  education_level: EducationLevel;
  gpa?: number;
  target_countries?: string[];
  goals?: string;
  preferred_field?: string;
}

export interface StudentOut extends StudentCreate {
  id: string;
  created_at: string;
  updated_at: string;
}

export type Decision = "proceed" | "low_confidence" | "out_of_scope" | "escalate";

export interface ChatResponse {
  decision: Decision;
  answer?: string | null;
  clarifying_question?: string | null;
  sources: Array<{ title: string; reference?: string | null; score: number }>;
  reason: string;
}

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function createStudent(payload: StudentCreate): Promise<StudentOut> {
  return j(await fetch(`${BASE}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}

export async function sendChat(payload: { student_id: string; message: string }): Promise<ChatResponse> {
  return j(await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
}

export async function uploadDoc(studentId: string, file: File) {
  const fd = new FormData();
  fd.append("student_id", studentId);
  fd.append("file", file);
  return j(await fetch(`${BASE}/upload`, { method: "POST", body: fd }));
}
