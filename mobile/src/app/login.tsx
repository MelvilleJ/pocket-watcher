import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

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
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Pocket Watcher
        </ThemedText>
        <ThemedText type="subtitle">Log in</ThemedText>

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}

        <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Log in</ThemedText>}
        </Pressable>

        <Link href="/signup" style={styles.link}>
          <ThemedText type="link">No account yet? Sign up</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four, gap: Spacing.two, justifyContent: "center" },
  title: { marginBottom: Spacing.one },
  input: {
    borderWidth: 1,
    borderColor: "#c3c2b7",
    borderRadius: 8,
    padding: Spacing.two,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2a78d6",
    borderRadius: 8,
    padding: Spacing.three,
    alignItems: "center",
    marginTop: Spacing.two,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#d03b3b" },
  link: { marginTop: Spacing.three, alignSelf: "center" },
});
