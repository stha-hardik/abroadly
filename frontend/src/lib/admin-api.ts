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
}

export async function getStats(): Promise<Stats> {
  return adminFetch<Stats>("/stats");
}

export interface StudentListItem {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  education_level: string;
  target_countries: string[];
  ai_paused: boolean;
  created_at: string;
  chat_count: number;
}

export async function getStudents(page = 1): Promise<{ items: StudentListItem[]; total: number }> {
  return adminFetch(`/students?page=${page}&per_page=20`);
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
  created_at: string;
  updated_at: string;
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
