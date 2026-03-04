"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!registerRes.ok) {
        const data = await registerRes.json() as { error?: string };
        setError(data.error || "Failed to create account.");
        setLoading(false);
        return;
      }
      const signinRes = await signIn("credentials", { redirect: false, email, password });
      if (signinRes?.error) {
        setError("Account created. Please sign in.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid var(--surface-border)",
    background: "var(--surface)",
    color: "var(--text-primary)",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6" style={{ background: "var(--surface)" }}>
      <div className="w-full max-w-sm space-y-8">
        <div>
          <p className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>Portability</p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Create your account</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>30 free extractions per month, no card required.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
          {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#0a0f0a" }}
          >
            {loading ? "Creating account..." : "Get started"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--surface-border)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--surface-border)" }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "GitHub", provider: "github" },
            { label: "Google", provider: "google" },
          ].map(({ label, provider }) => (
            <button
              key={provider}
              onClick={() => void signIn(provider, { callbackUrl: "/dashboard" })}
              className="rounded-lg py-2.5 text-sm font-medium transition-colors"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--surface-border)", color: "var(--text-secondary)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
