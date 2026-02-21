import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThreatLens — World's Simplest Threat Modeller",
  description:
    "Paste your architecture description and get a focused, ranked list of security threats in under 60 seconds. No account needed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
