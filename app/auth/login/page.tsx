"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";

export default function LoginPage() {
  const router = useRouter();
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    router.push("/dashboard");
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={onSubmit} className="card w-full max-w-md space-y-4 p-8">
        <h1 className="text-2xl font-semibold">Login</h1>
        <Input type="email" required placeholder="Email" />
        <Input type="password" required minLength={8} placeholder="Password" />
        <Button type="submit" className="w-full">Sign In</Button>
      </form>
    </main>
  );
}
