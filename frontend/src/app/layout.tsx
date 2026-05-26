import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Abroadly",
  description: "AI guidance for Nepali students considering study abroad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 24, maxWidth: 720 }}>
        {children}
      </body>
    </html>
  );
}
