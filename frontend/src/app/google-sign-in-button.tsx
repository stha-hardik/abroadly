import { googleLoginUrl } from "@/lib/api";

interface GoogleSignInButtonProps {
  label?: string;
  variant?: "light" | "outline";
  className?: string;
}

export function GoogleSignInButton({
  label = "Continue with Google",
  variant = "light",
  className = "",
}: GoogleSignInButtonProps) {
  const base =
    variant === "outline"
      ? "border border-[#d9d3ea] bg-white text-[#21143d] hover:border-[#673de6]"
      : "bg-white text-[#21143d] hover:bg-[#f4f0ff]";

  return (
    <a
      href={googleLoginUrl()}
      className={`ab-focus inline-flex items-center justify-center gap-3 rounded-md px-5 py-3 text-sm font-black transition ${base} ${className}`}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d9d3ea] bg-white text-[13px] font-black text-[#4285f4]">
        G
      </span>
      <span>{label}</span>
    </a>
  );
}
