"use client";

/**
 * The dashboard now lives inside /chat as a sidebar panel (rail on desktop,
 * drawer on mobile). This route exists only to preserve old links — it does
 * a client-side redirect with `?panel=dashboard` so the panel opens
 * automatically on arrival in chat.
 *
 * See: frontend/src/app/chat/dashboard-panel.tsx
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/chat?panel=dashboard");
  }, [router]);
  return null;
}
