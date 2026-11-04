"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/shared/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCredentialsSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);

    if (result?.error) {
      // Auth.js's own generic error — never reveal whether the email exists
      // or the password was wrong.
      setError("Incorrect email or password.");
      return;
    }
    router.push("/notes");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ground px-4">
      <ThemeToggle className="fixed top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text" />

      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            N
          </span>
          <span className="text-[15px] font-semibold">Notula</span>
        </div>

        <h1 className="mb-1 text-[20px] font-semibold">Sign in</h1>
        <p className="mb-6 text-[13px] text-muted">Your personal notes, schedules and reminders.</p>

        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[13px]">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 rounded-control border border-control bg-surface px-3 text-[14px] text-text outline-none focus-visible:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px]">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 rounded-control border border-control bg-surface px-3 text-[14px] text-text outline-none focus-visible:border-accent"
            />
          </label>

          {error && (
            <p role="alert" className="text-[13px] text-negative">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 h-9 rounded-control bg-text text-[13px] font-medium text-ground disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[12px] text-muted">
          <span className="h-px flex-1 bg-rule" />
          or
          <span className="h-px flex-1 bg-rule" />
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/notes" })}
          className="h-9 w-full rounded-control border border-control text-[13px] font-medium text-text hover:bg-raised"
        >
          Continue with Google
        </button>

        <p className="mt-5 text-center text-[13px] text-muted">
          No account yet?{" "}
          <Link href="/register" className="text-accent underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
