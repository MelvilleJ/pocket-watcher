"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MotionButton } from "@/components/motion-ui";
import { authClient } from "@/lib/auth/client";
import { emailCodesAvailable } from "@/lib/actions/login-options";

const secondaryClass =
  "w-full rounded-[10px] border border-[color:var(--border)] px-4 py-2.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/5";

type Result = { error?: { message?: string } | null } | undefined | null;

export function EmailCodeForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [codesAvailable, setCodesAvailable] = useState(true);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const autofillStarted = useRef(false);

  const done = () => {
    router.replace("/dashboard");
    router.refresh();
  };

  useEffect(() => {
    emailCodesAvailable().then(setCodesAvailable).catch(() => {});
  }, []);

  // Lets a saved passkey appear in the email field's autofill list, so fingerprint sign-in is one tap.
  useEffect(() => {
    if (mode !== "login" || autofillStarted.current || !window.PublicKeyCredential) return;
    autofillStarted.current = true;
    setPasskeySupported(true);
    PublicKeyCredential.isConditionalMediationAvailable?.().then((available) => {
      if (!available) return;
      authClient.signIn.passkey({ autoFill: true }).then((result) => {
        if (result && !result.error) done();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function run(task: () => Promise<Result>, fallback: string) {
    setError(null);
    setPending(true);
    try {
      const result = await task();
      if (result?.error) setError(result.error.message || fallback);
      return result && !result.error;
    } catch {
      setError(fallback);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const sent = await run(
      () => authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" }),
      "Couldn't send a code. Try again in a moment."
    );
    if (sent) {
      setCode("");
      setStep("code");
    }
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    const ok = await run(
      () =>
        authClient.signIn.emailOtp({
          email: email.trim(),
          otp: code.trim(),
          ...(mode === "signup" && name.trim() ? { name: name.trim() } : {}),
        }),
      "That code didn't work."
    );
    if (ok) done();
  }

  async function signInWithPasskey() {
    const ok = await run(() => authClient.signIn.passkey(), "Fingerprint sign-in didn't work on this device.");
    if (ok) done();
  }

  return (
    <>
      {!codesAvailable && (
        <p className="auth-error mt-8">
          Email codes aren&rsquo;t available on this server right now.
          {mode === "login" ? " You can still sign in with a passkey." : " Try again later."}
        </p>
      )}

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-8 flex flex-col gap-5">
          {mode === "signup" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="auth-label">Your name</label>
              <input
                id="name"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="auth-label">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete={mode === "login" ? "username webauthn" : "email"}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <MotionButton disabled={pending || !codesAvailable} type="submit" className="auth-submit mt-1">
            {pending ? "Sending…" : "Email me a code"}
          </MotionButton>
        </form>
      ) : (
        <form onSubmit={confirmCode} className="mt-8 flex flex-col gap-5">
          <p className="text-sm text-[color:var(--muted)]">
            We emailed a 6-digit code to <span className="font-medium text-[color:var(--foreground)]">{email}</span>.
          </p>
          <div className="flex flex-col gap-2">
            <label htmlFor="otp" className="auth-label">Code</label>
            <input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <MotionButton disabled={pending} type="submit" className="auth-submit mt-1">
            {pending ? "Checking…" : mode === "signup" ? "Create my account" : "Log in"}
          </MotionButton>
          <button type="button" className="auth-link text-sm" onClick={() => setStep("email")} disabled={pending}>
            Use a different email or send a new code
          </button>
        </form>
      )}

      {mode === "login" && passkeySupported && (
        <button type="button" disabled={pending} onClick={signInWithPasskey} className={`${secondaryClass} mt-5`}>
          Log in with fingerprint or face
        </button>
      )}

      <p className="auth-footer mt-7">
        {mode === "login" ? (
          <>
            New to Pocket Watcher? <Link href="/signup" className="auth-link">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login" className="auth-link">Log in</Link>
          </>
        )}
      </p>
    </>
  );
}
