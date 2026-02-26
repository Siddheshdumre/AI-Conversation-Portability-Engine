import Link from "next/link";
import Button from "@/components/Button";

const features = [
  "Structured summaries for long AI conversations",
  "Memory extraction for better continuation prompts",
  "Model-specific export with compression control",
  "Secure, reusable workspace for imported chats",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-24">
        <p className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-300">
          AI Conversation Portability Engine
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
          Preserve and Transfer AI Conversations Without Losing Context
        </h1>
        <p className="max-w-2xl text-slate-300">
          Import a share link, generate rich analysis, and export optimized continuation prompts across GPT, Gemini, and Claude.
        </p>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button>Import Chat</Button>
          </Link>
          <Link href="/auth/login">
            <Button variant="secondary">Login</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-20 md:grid-cols-3">
        {["Paste Link", "Extract Memory", "Export Prompt"].map((step, idx) => (
          <div key={step} className="card p-6">
            <p className="mb-2 text-xs uppercase tracking-wide text-indigo-300">Step {idx + 1}</p>
            <h3 className="text-lg font-medium">{step}</h3>
          </div>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-2">
        {features.map((feature) => (
          <div key={feature} className="card p-5 text-sm text-slate-300">
            {feature}
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-800 px-6 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} AI Conversation Portability Engine
      </footer>
    </main>
  );
}
