"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { MotionButton } from "@/components/motion-ui";
import { login } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Good to see you again."
      description="Log in to pick up exactly where you left off."
    >
      <form action={action} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          {state?.errors?.email && <p className="text-sm font-medium text-rose-600">{state.errors.email[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
        </div>
        {state?.message && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{state.message}</p>}
        <MotionButton disabled={pending} type="submit" className="auth-submit mt-1">
          {pending ? "Logging in…" : "Log in"}
        </MotionButton>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        New to Pocket Watcher?{" "}
        <Link href="/signup" className="font-bold text-[color:var(--primary)] underline decoration-indigo-200 underline-offset-4">Create an account</Link>
      </p>
    </AuthShell>
  );
}
