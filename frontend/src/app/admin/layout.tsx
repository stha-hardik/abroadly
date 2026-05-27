"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdminLoggedIn, adminLogout } from "@/lib/admin-api";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "\u{1F4CA}" },
  { href: "/admin/students", label: "Students", icon: "\u{1F393}" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }
    if (!isAdminLoggedIn()) {
      router.push("/admin/login");
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  if (pathname === "/admin/login") return <>{children}</>;
  if (!ready) return null;

  return (
    <div className="flex h-screen bg-[#f5f4f2]">
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-[#0f0b1a] p-4">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--ab-plum)] to-[var(--ab-mint)]">
            <span className="text-[10px] font-black text-white">Ab</span>
          </div>
          <span className="text-[13px] font-bold text-white">Admin</span>
        </Link>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] font-medium transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/[0.05] hover:text-white/70"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => { adminLogout(); router.push("/admin/login"); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
