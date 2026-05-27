// Typed client for the Abroadly backend.

const BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "/api";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------
export type EducationLevel = "plus_two" | "a_levels" | "bba" | "bachelors" | "other";
export type Decision = "proceed" | "low_confidence" | "out_of_scope" | "escalate";

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

export interface StudentOut {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  education_level: EducationLevel;
  gpa: number | null;
  target_countries: string[];
  goals: string | null;
  preferred_field: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSource {
  chunk_id: string;
  source_type: string;
  score: number;
  title: string | null;
}

export interface ChatResponse {
  request_id: string;
  trace_id: string;
  decision: Decision;
  confidence: number;
  answer: string | null;
  clarifying_question: string | null;
  clarification_needed: boolean;
  sources: ChatSource[];
  reason: string;
}

export type ChatRole = "user" | "assistant" | "counselor";

export interface ChatTurn {
  id: string;
  role: ChatRole;
  content: string;
  eval_decision: string | null;
  created_at: string;
}

export interface UploadResponse {
  filename: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------
export async function createStudent(payload: StudentCreate): Promise<StudentOut> {
  return handle<StudentOut>(
    await fetch(`${BASE}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function getStudent(id: string): Promise<StudentOut> {
  return handle<StudentOut>(await fetch(`${BASE}/students/${id}`));
}

export async function chat(
  student_id: string,
  message: string,
  trace_id?: string
): Promise<ChatResponse> {
  return handle<ChatResponse>(
    await fetch(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id, message, trace_id }),
    })
  );
}

export async function uploadFile(
  student_id: string,
  file: File
): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("student_id", student_id);
  fd.append("file", file);
  return handle<UploadResponse>(
    await fetch(`${BASE}/upload`, { method: "POST", body: fd })
  );
}

export async function getChatHistory(
  student_id: string,
  limit = 50
): Promise<ChatTurn[]> {
  return handle<ChatTurn[]>(
    await fetch(`${BASE}/chat/history/${student_id}?limit=${limit}`)
  );
}

// Keep old names for backward compat with existing stubs
export const sendChat = (payload: { student_id: string; message: string }) =>
  chat(payload.student_id, payload.message);
export const uploadDoc = uploadFile;
