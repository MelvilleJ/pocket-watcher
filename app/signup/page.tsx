"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { MotionButton } from "@/components/motion-ui";
import { signup } from "@/lib/actions/auth";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <AuthShell
      title="Create your account"
      description="Track every depo, lock a budget each month, and see when your debts will be paid off."
    >
      <form action={action} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="auth-label">Your name</label>
          <input id="name" name="name" autoComplete="name" placeholder="Your name" required />
          {state?.errors?.name && <p className="auth-field-error">{state.errors.name[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="auth-label">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          {state?.errors?.email && <p className="auth-field-error">{state.errors.email[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="auth-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Create a secure password" required />
          {state?.errors?.password && (
            <ul className="auth-error list-disc pl-7">
              {state.errors.password.map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}
        </div>
        {state?.message && <p className="auth-error">{state.message}</p>}
        <MotionButton disabled={pending} type="submit" className="auth-submit mt-2">
          {pending ? "Creating account…" : "Create my account"}
        </MotionButton>
      </form>
      <p className="auth-footer mt-7">
        Already have an account?{" "}
        <Link href="/login" className="auth-link">Log in</Link>
      </p>
    </AuthShell>
  );
}
