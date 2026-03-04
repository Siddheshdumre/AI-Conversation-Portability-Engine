"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Button from "@/components/Button";
import Input from "@/components/Input";
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
        setError(data.error || "Failed to register");
        setLoading(false);
        return;
      }

      // Auto login after successful registration
      const signinRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signinRes?.error) {
        setError("Account created but failed to sign in automatically.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      if (!error) setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="card w-full max-w-md space-y-6 p-8">
        <h1 className="text-2xl font-semibold">Create Account</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            type="text"
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={8}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-400">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button variant="secondary" onClick={() => void signIn("github", { callbackUrl: "/dashboard" })}>
            GitHub
          </Button>
          <Button variant="secondary" onClick={() => void signIn("google", { callbackUrl: "/dashboard" })}>
            Google
          </Button>
        </div>

        <p className="text-center text-sm text-slate-400">
          Already have an account? <Link href="/auth/login" className="text-indigo-400 hover:underline">Log in</Link>
        </p>
      </div>
    </main>
  );
}
