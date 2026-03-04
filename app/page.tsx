import Link from "next/link";

const steps = [
  { label: "Paste", desc: "Drop a ChatGPT, Claude, or Gemini share link." },
  { label: "Extract", desc: "We parse the conversation and build a structured context pack." },
  { label: "Continue", desc: "Paste the pack into any model. Pick up exactly where you left off." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--surface)", color: "var(--text-primary)" }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid var(--surface-border)" }}>
        <span className="text-base font-semibold tracking-tight">Portability</span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="nav-link text-sm">
            Sign in
          </Link>
          <Link href="/dashboard">
            <button
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ background: "var(--accent)", color: "#0a0f0a" }}
            >
              Try it free
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-8 py-28 text-center">
        <h1 className="text-5xl font-semibold leading-tight tracking-tight">
          Your AI conversations,{" "}
          <span style={{ color: "var(--accent)" }}>preserved.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Paste a share link. We extract its memory into a structured context pack you can drop into
          any model — GPT, Claude, or Gemini — and continue exactly where you left off.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/dashboard">
            <button
              className="rounded-lg px-6 py-3 text-sm font-semibold"
              style={{ background: "var(--accent)", color: "#0a0f0a" }}
            >
              Extract memory
            </button>
          </Link>
          <Link href="/auth/signup">
            <button className="ghost-btn px-6 py-3 text-sm font-medium">
              Create account
            </button>
          </Link>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-4xl grid grid-cols-1 gap-4 px-8 pb-24 md:grid-cols-3">
        {steps.map(({ label, desc }, idx) => (
          <div
            key={label}
            className="rounded-xl p-6"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--surface-border)" }}
          >
            <p className="mb-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>0{idx + 1}</p>
            <h3 className="mb-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>{label}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer
        className="px-8 py-6 text-center text-xs"
        style={{ borderTop: "1px solid var(--surface-border)", color: "var(--text-muted)" }}
      >
        &copy; {new Date().getFullYear()} Portability
      </footer>
    </main>
  );
}
