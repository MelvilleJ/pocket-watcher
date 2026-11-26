import { AuthShell } from "@/components/auth-shell";
import { EmailCodeForm } from "@/components/auth/email-code-form";

export default function LoginPage() {
  return (
    <AuthShell title="Log in to Pocket Watcher" description="We'll email you a code. No password needed.">
      <EmailCodeForm mode="login" />
    </AuthShell>
  );
}
