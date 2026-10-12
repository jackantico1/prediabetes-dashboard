"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

interface Props {
  mode: "login" | "signup";
  googleEnabled: boolean;
}

export function AuthForm({ mode, googleEnabled }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const deleted = params.get("deleted") === "1";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "signup"
        ? await signUp.email({ name: name.trim() || email.split("@")[0], email, password })
        : await signIn.email({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onGoogle() {
    setBusy(true);
    await signIn.social({ provider: "google", callbackURL: next });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h1>

      {deleted && mode === "login" && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">Your account and data were deleted.</p>}

      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="What should we call you?" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          className="input"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {mode === "signup" && <p className="text-xs text-slate-400 mt-1">At least 8 characters.</p>}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>

      {googleEnabled && (
        <button type="button" onClick={onGoogle} className="btn-secondary w-full" disabled={busy}>
          Continue with Google
        </button>
      )}

      <p className="text-sm text-center text-slate-500 pt-2">
        {mode === "signup" ? (
          <>Already have an account? <Link href="/login" className="text-teal-700 font-medium">Sign in</Link></>
        ) : (
          <>New here? <Link href="/signup" className="text-teal-700 font-medium">Create an account</Link></>
        )}
      </p>
    </form>
  );
}
