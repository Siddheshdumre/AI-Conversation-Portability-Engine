"use client";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

const steps = [
  { label: "Paste", desc: "Drop a ChatGPT, Claude, or Gemini share link." },
  { label: "Extract", desc: "We parse the conversation and build a structured context pack." },
  { label: "Continue", desc: "Paste the pack into any model. Pick up exactly where you left off." },
];

export default function LandingPage() {
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ background: "var(--surface)", color: "var(--text-primary)" }}>
      {/* Subtle Grid Parallax Background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          y: bgY,
          backgroundImage: `radial-gradient(var(--surface-border) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          maskImage: "linear-gradient(to bottom, white, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, white, transparent 80%)",
        }}
      />

      {/* Navbar */}
      <nav className="relative flex items-center justify-between px-8 py-5 z-10" style={{ borderBottom: "1px solid var(--surface-border)" }}>
        <span className="text-base font-semibold tracking-tight">Portability</span>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="nav-link text-sm">
            Sign in
          </Link>
          <Link href="/dashboard">
            <button
              className="rounded-lg px-4 py-2 text-sm font-medium transition-transform hover:scale-105 active:scale-95"
              style={{ background: "var(--accent)", color: "#0a0f0a" }}
            >
              Try it free
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <motion.section
        className="relative mx-auto max-w-4xl px-8 py-28 text-center z-10"
        style={{ opacity }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl font-semibold leading-tight tracking-tight"
        >
          Your AI conversations,{" "}
          <span style={{ color: "var(--accent)" }}>preserved.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Paste a share link. We extract its memory into a structured context pack you can drop into
          any model — GPT, Claude, or Gemini — and continue exactly where you left off.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex justify-center gap-3"
        >
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-lg px-6 py-3 text-sm font-semibold inline-block"
              style={{ background: "var(--accent)", color: "#0a0f0a" }}
            >
              Extract memory
            </motion.button>
          </Link>
          <Link href="/auth/signup">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="ghost-btn px-6 py-3 text-sm font-medium inline-block"
            >
              Create account
            </motion.button>
          </Link>
        </motion.div>
      </motion.section>

      {/* Steps */}
      <section className="relative mx-auto max-w-4xl grid grid-cols-1 gap-4 px-8 pb-24 md:grid-cols-3 z-10">
        {steps.map(({ label, desc }, idx) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
            whileHover={{ y: -5, borderColor: "var(--accent-muted)" }}
            className="rounded-xl p-6 transition-colors"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--surface-border)" }}
          >
            <p className="mb-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>0{idx + 1}</p>
            <h3 className="mb-2 text-base font-semibold" style={{ color: "var(--text-primary)" }}>{label}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Footer */}
      <footer
        className="relative px-8 py-6 text-center text-xs space-y-2 z-10"
        style={{ borderTop: "1px solid var(--surface-border)", color: "var(--text-muted)" }}
      >
        <p>&copy; {new Date().getFullYear()} Portability</p>
        <p>Created by Siddhesh Dumre</p>
      </footer>
    </main>
  );
}
