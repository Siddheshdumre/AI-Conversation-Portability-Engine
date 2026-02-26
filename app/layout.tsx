import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Conversation Portability Engine",
  description: "Import, analyze, and export AI conversations without losing context.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
