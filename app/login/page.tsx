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
      title="Log in to Pocket Watcher"
      description="Your depos, budgets and payoff plans, on the web and on your phone."
    >
      <form action={action} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          {state?.errors?.email && <p className="auth-field-error">{state.errors.email[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="auth-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required />
        </div>
        {state?.message && <p className="auth-error">{state.message}</p>}
        <MotionButton disabled={pending} type="submit" className="auth-submit mt-1">
          {pending ? "Logging in…" : "Log in"}
        </MotionButton>
      </form>
      <p className="auth-footer mt-7">
        New to Pocket Watcher?{" "}
        <Link href="/signup" className="auth-link">Create an account</Link>
      </p>
    </AuthShell>
  );
}
