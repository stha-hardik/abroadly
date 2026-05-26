import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-950">
      <div className="max-w-lg w-full text-center space-y-8">

        {/* Logo / wordmark */}
        <div>
          <span className="text-4xl font-bold tracking-tight text-white">
            Abroadly
          </span>
        </div>

        {/* Tagline */}
        <p className="text-lg text-gray-300 leading-snug">
          AI-powered study abroad guidance for Nepali students.
        </p>

        {/* Bullets */}
        <ul className="text-left inline-block space-y-2 text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            Free to use
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            Get matched to trusted consultancies
          </li>
        </ul>

        {/* CTA */}
        <div>
          <Link
            href="/onboarding"
            className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-150"
          >
            Get Started
          </Link>
        </div>

        <p className="text-xs text-gray-600">
          Already started?{" "}
          <Link href="/chat" className="text-emerald-500 hover:underline">
            Open chat
          </Link>
        </p>
      </div>
    </main>
  );
}
