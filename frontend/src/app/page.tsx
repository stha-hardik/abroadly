import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Abroadly</h1>
      <p>AI guidance for Nepali students considering study abroad.</p>
      <ul>
        <li><Link href="/onboarding">Start onboarding</Link></li>
        <li><Link href="/chat">Open chat</Link></li>
      </ul>
    </main>
  );
}
