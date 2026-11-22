import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { AuthShell } from "@/components/auth-shell";
import { ServerUrlField } from "@/components/server-url-field";
import { Button, Field, TextField } from "@/components/ui/controls";
import { Notice } from "@/components/ui/layout";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SignupScreen() {
  const { user, loading, signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Redirect href="/(tabs)" />;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signup(name, email, password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reach the server. Check the server address below.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Track every depo, lock a budget each month, and see when your debts will be paid off."
    >
      <View style={{ gap: Spacing.four, marginTop: Spacing.eight }}>
        <Field label="Your name">
          <TextField value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
        </Field>
        <Field label="Email address">
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </Field>
        <Field label="Password">
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="new-password"
          />
        </Field>
        <AppText size={12} color="mutedSoft">
          Use at least 8 characters with a letter and a number.
        </AppText>
        {error && <Notice tone="critical">{error}</Notice>}
        <Button label="Create account" size="lg" loading={submitting} onPress={onSubmit} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: Spacing.six }}>
        <AppText size={14} color="muted">
          Already have an account?
        </AppText>
        <Link href="/login">
          <AppText size={14} weight="bold" color="primaryDeep">
            Log in
          </AppText>
        </Link>
      </View>
      <View style={{ marginTop: Spacing.six }}>
        <ServerUrlField />
      </View>
    </AuthShell>
  );
}
