"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeGoogleCode, googleLoginUrl } from "@/lib/api";

function GoogleCallbackInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = search.get("code");
    const state = search.get("state");
    const oauthError = search.get("error");

    if (oauthError) {
      setError("Google sign-in was cancelled or denied.");
      return;
    }
    if (!code || !state) {
      setError("Google sign-in returned without the required code.");
      return;
    }

    let cancelled = false;
    exchangeGoogleCode(code, state)
      .then((res) => {
        if (cancelled) return;
        localStorage.setItem("abroadly_student_id", res.student.id);
        router.replace(res.student.profile_completed ? "/chat" : "/onboarding/details");
      })
      .catch(() => {
        if (!cancelled) setError("Google sign-in failed. Please try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [router, search]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-5 text-[#21143d]">
      <section className="w-full max-w-md rounded-lg border border-[#ded8ee] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-[#673de6] text-sm font-black text-white">
          A
        </div>
        <h1 className="mt-5 text-2xl font-black">
          {error ? "Sign-in needs another try" : "Signing you in"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#6a607f]">
          {error || "Please wait while Abroadly verifies your Google account."}
        </p>
        {error && (
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={googleLoginUrl()}
              className="ab-focus rounded-md bg-[#673de6] px-5 py-3 text-sm font-black text-white transition hover:bg-[#5025d1]"
            >
              Try Google again
            </Link>
            <Link
              href="/onboarding"
              className="ab-focus rounded-md border border-[#d9d3ea] bg-white px-5 py-3 text-sm font-black text-[#342456] transition hover:border-[#673de6]"
            >
              Back to sign-in
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-5 text-[#21143d]">
          <p className="text-sm font-bold text-[#6a607f]">Signing you in...</p>
        </main>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  );
}
