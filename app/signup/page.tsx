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
      eyebrow="Get started"
      title="Build a brighter money plan."
      description="Create your account and turn everyday numbers into a clear next step."
    >
      <form action={action} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-semibold text-slate-700">Your name</label>
          <input id="name" name="name" autoComplete="name" placeholder="How should we greet you?" required />
          {state?.errors?.name && <p className="text-sm font-medium text-rose-600">{state.errors.name[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          {state?.errors?.email && <p className="text-sm font-medium text-rose-600">{state.errors.email[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Create a secure password" required />
          {state?.errors?.password && (
            <ul className="list-disc rounded-xl bg-rose-50 py-2 pl-7 pr-3 text-sm text-rose-600">
              {state.errors.password.map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}
        </div>
        {state?.message && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{state.message}</p>}
        <MotionButton disabled={pending} type="submit" className="auth-submit mt-2">
          {pending ? "Creating account…" : "Create my account"}
        </MotionButton>
      </form>
      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[color:var(--primary)] underline decoration-indigo-200 underline-offset-4">Log in</Link>
      </p>
    </AuthShell>
  );
}
