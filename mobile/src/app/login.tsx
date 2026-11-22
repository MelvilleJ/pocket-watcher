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

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Redirect href="/(tabs)" />;

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't reach the server. Check the server address below.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Log in to Pocket Watcher" description="Your depos, budgets and payoff plans, on your phone and the web.">
      <View style={{ gap: Spacing.five, marginTop: Spacing.eight }}>
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
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="current-password"
            onSubmitEditing={onSubmit}
          />
        </Field>
        {error && <Notice tone="critical">{error}</Notice>}
        <Button label="Log in" size="lg" loading={submitting} onPress={onSubmit} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: Spacing.six }}>
        <AppText size={14} color="muted">
          New to Pocket Watcher?
        </AppText>
        <Link href="/signup">
          <AppText size={14} weight="bold" color="primaryDeep">
            Create an account
          </AppText>
        </Link>
      </View>
      <View style={{ marginTop: Spacing.six }}>
        <ServerUrlField />
      </View>
    </AuthShell>
  );
}
