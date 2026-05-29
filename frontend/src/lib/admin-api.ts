const BASE = "/api/admin";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("abroadly_admin_token");
}

export function isAdminLoggedIn(): boolean {
  return !!getToken();
}

export function adminLogout(): void {
  localStorage.removeItem("abroadly_admin_token");
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  if (res.status === 401) {
    adminLogout();
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text);
  }
  return res.json() as Promise<T>;
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const data = await adminFetch<{ access_token: string }>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem("abroadly_admin_token", data.access_token);
}

export interface Stats {
  total_students: number;
  total_chats: number;
  students_this_week: number;
  chats_today: number;
  ai_paused_count: number;
  total_documents: number;
  top_countries: { country: string; count: number }[];
  recent_students: { id: string; name: string; email: string; created_at: string }[];
}

export async function getStats(): Promise<Stats> {
  return adminFetch<Stats>("/stats");
}

export interface LastMessage {
  content: string;
  role: string;
  created_at: string;
}

export interface StudentListItem {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  education_level: string;
  target_countries: string[];
  preferred_field: string | null;
  gpa: number | null;
  ai_paused: boolean;
  call_consent?: boolean;
  created_at: string;
  chat_count: number;
  doc_count: number;
  last_message: LastMessage | null;
}

export async function getStudents(page = 1, search = ""): Promise<{ items: StudentListItem[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });
  if (search) params.set("search", search);
  return adminFetch(`/students?${params}`);
}

export interface StudentDetail {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  education_level: string;
  gpa: number | null;
  target_countries: string[];
  preferred_field: string | null;
  goals: string | null;
  ai_paused: boolean;
  call_consent?: boolean;
  created_at: string;
  updated_at: string;
  chat_count: number;
  doc_count: number;
}

export async function getStudent(id: string): Promise<StudentDetail> {
  return adminFetch(`/students/${id}`);
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant" | "counselor";
  content: string;
  eval_decision: string | null;
  created_at: string;
}

export async function getStudentChat(id: string): Promise<ChatTurn[]> {
  return adminFetch(`/students/${id}/chat`);
}

export interface DocItem {
  filename: string;
  doc_id: string;
  doc_type: string;
  ext: string;
  is_image: boolean;
  size_bytes: number;
  uploaded_at: string;
}

export async function getStudentDocs(id: string): Promise<DocItem[]> {
  return adminFetch(`/students/${id}/documents`);
}

export function getDocDownloadUrl(studentId: string, docId: string): string {
  return `${BASE}/students/${studentId}/documents/${docId}/download`;
}

/** Fetch a document with the admin JWT and return an object URL (for <img>
 * previews, since <img src> can't send an Authorization header). */
export async function fetchDocObjectUrl(studentId: string, docId: string): Promise<string> {
  const token = getToken();
  const res = await fetch(`${BASE}/students/${studentId}/documents/${docId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load document");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function getGlobalAI(): Promise<{ paused: boolean }> {
  return adminFetch("/ai-global");
}

export async function setGlobalAI(paused: boolean): Promise<void> {
  await adminFetch("/ai-global", {
    method: "PUT",
    body: JSON.stringify({ paused }),
  });
}

export async function toggleAI(id: string, paused: boolean): Promise<void> {
  await adminFetch(`/students/${id}/ai-toggle`, {
    method: "PUT",
    body: JSON.stringify({ paused }),
  });
}

export async function sendCounselorReply(id: string, content: string): Promise<void> {
  await adminFetch(`/students/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
