"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { MotionButton } from "@/components/motion-ui";
import { authClient } from "@/lib/auth/client";
import { emailCodesAvailable } from "@/lib/actions/login-options";

type Step = "password" | "code-request" | "code-enter" | "two-factor";

const secondaryClass =
  "w-full rounded-[10px] border border-[color:var(--border)] px-4 py-2.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/5";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [codesAvailable, setCodesAvailable] = useState(false);
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
    if (autofillStarted.current || typeof window === "undefined" || !window.PublicKeyCredential) return;
    autofillStarted.current = true;
    setPasskeyAvailable(true);
    PublicKeyCredential.isConditionalMediationAvailable?.().then((available) => {
      if (!available) return;
      authClient.signIn.passkey({ autoFill: true }).then((result) => {
        if (result && !result.error) done();
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(task: () => Promise<{ error?: { message?: string } | null } | undefined | null>, fallback: string) {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await task();
      if (result?.error) setError(result.error.message || fallback);
      return result;
    } catch {
      setError(fallback);
      return null;
    } finally {
      setPending(false);
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(() => authClient.signIn.email({ email, password }), "Invalid email or password.");
    if (!result || result.error) return;
    const data = (result as { data?: { twoFactorRedirect?: boolean } }).data;
    if (data?.twoFactorRedirect) {
      setStep("two-factor");
      return;
    }
    done();
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(
      () => authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }),
      "Couldn't send a code. Email sending may not be set up on this server."
    );
    if (result && !result.error) {
      setStep("code-enter");
      setNotice(`We emailed a 6-digit code to ${email}.`);
    }
  }

  async function signInWithCode(e: React.FormEvent) {
    e.preventDefault();
    const result = await run(() => authClient.signIn.emailOtp({ email, otp: code.trim() }), "That code didn't work.");
    if (result && !result.error) done();
  }

  async function verifyTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.replace(/\s+/g, "");
    const isBackupCode = trimmed.length > 6;
    const result = await run(
      () =>
        isBackupCode
          ? authClient.twoFactor.verifyBackupCode({ code: trimmed, trustDevice })
          : authClient.twoFactor.verifyTotp({ code: trimmed, trustDevice }),
      "That code didn't work."
    );
    if (result && !result.error) done();
  }

  async function signInWithPasskey() {
    const result = await run(() => authClient.signIn.passkey(), "Fingerprint sign-in didn't work on this device.");
    if (result && !result.error) done();
  }

  const emailField = (
    <div className="flex flex-col gap-2">
      <label htmlFor="email" className="auth-label">Email address</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username webauthn"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
    </div>
  );

  return (
    <AuthShell title="Log in to Pocket Watcher" description="Your depos, budgets and payoff plans.">
      {step === "two-factor" ? (
        <form onSubmit={verifyTwoFactor} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="auth-label">Authenticator code</label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              required
            />
            <p className="text-xs text-[color:var(--muted)]">Enter the code from your authenticator app, or a backup code.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} />
            Don&rsquo;t ask again on this device for 30 days
          </label>
          {error && <p className="auth-error">{error}</p>}
          <MotionButton disabled={pending} type="submit" className="auth-submit">
            {pending ? "Checking…" : "Verify"}
          </MotionButton>
        </form>
      ) : step === "password" ? (
        <form onSubmit={signInWithPassword} className="mt-8 flex flex-col gap-5">
          {emailField}
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="auth-label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <MotionButton disabled={pending} type="submit" className="auth-submit mt-1">
            {pending ? "Logging in…" : "Log in"}
          </MotionButton>
        </form>
      ) : (
        <form onSubmit={step === "code-request" ? sendCode : signInWithCode} className="mt-8 flex flex-col gap-5">
          {emailField}
          {step === "code-enter" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="otp" className="auth-label">6-digit code</label>
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
          )}
          {notice && <p className="text-sm text-[color:var(--muted)]">{notice}</p>}
          {error && <p className="auth-error">{error}</p>}
          <MotionButton disabled={pending} type="submit" className="auth-submit mt-1">
            {pending ? "Working…" : step === "code-request" ? "Email me a code" : "Log in"}
          </MotionButton>
          {step === "code-enter" && (
            <button type="button" className="auth-link text-sm" onClick={() => setStep("code-request")}>
              Send a new code
            </button>
          )}
        </form>
      )}

      {step !== "two-factor" && (
        <div className="mt-5 flex flex-col gap-3">
          {passkeyAvailable && (
            <button type="button" disabled={pending} onClick={signInWithPasskey} className={secondaryClass}>
              Log in with fingerprint or face
            </button>
          )}
          {(codesAvailable || step !== "password") && <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setNotice(null);
              setCode("");
              setStep(step === "password" ? "code-request" : "password");
            }}
            className={secondaryClass}
          >
            {step === "password" ? "Email me a code instead" : "Use my password instead"}
          </button>}
        </div>
      )}

      <p className="auth-footer mt-7">
        New to Pocket Watcher?{" "}
        <Link href="/signup" className="auth-link">Create an account</Link>
      </p>
    </AuthShell>
  );
}
