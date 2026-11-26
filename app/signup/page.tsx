import { AuthShell } from "@/components/auth-shell";
import { EmailCodeForm } from "@/components/auth/email-code-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Track every depo, lock a budget each month, and see when your debts will be paid off."
    >
      <EmailCodeForm mode="signup" />
    </AuthShell>
  );
}
