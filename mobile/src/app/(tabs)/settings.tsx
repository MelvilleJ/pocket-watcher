import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { getServerUrl, setServerUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fullSync } from "@/lib/sync";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [serverUrl, setServerUrlInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    getServerUrl().then(setServerUrlInput);
  }, []);

  async function onSaveServerUrl() {
    await setServerUrl(serverUrl);
    setStatus("Server URL saved.");
  }

  async function onSyncNow() {
    setSyncing(true);
    setStatus(null);
    try {
      await fullSync();
      setStatus("Synced successfully.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">{user?.name}</ThemedText>
      <ThemedText themeColor="textSecondary">{user?.email}</ThemedText>

      <View style={styles.section}>
        <ThemedText type="smallBold">Server URL</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Use your computer&apos;s LAN IP (not localhost) when testing on a physical device.
        </ThemedText>
        <TextInput
          value={serverUrl}
          onChangeText={setServerUrlInput}
          autoCapitalize="none"
          style={styles.input}
          placeholder="http://192.168.1.x:3000"
        />
        <Pressable style={styles.button} onPress={onSaveServerUrl}>
          <ThemedText style={styles.buttonText}>Save</ThemedText>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.button} onPress={onSyncNow} disabled={syncing}>
          {syncing ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Sync now</ThemedText>}
        </Pressable>
        {status && <ThemedText type="small" style={{ marginTop: Spacing.one }}>{status}</ThemedText>}
      </View>

      <Pressable style={[styles.button, styles.logoutButton]} onPress={logout}>
        <ThemedText style={styles.buttonText}>Log out</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  section: { gap: Spacing.one, marginTop: Spacing.two },
  input: { borderWidth: 1, borderColor: "#c3c2b7", borderRadius: 8, padding: Spacing.two },
  button: { backgroundColor: "#2a78d6", borderRadius: 8, padding: Spacing.two, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  logoutButton: { backgroundColor: "#d03b3b", marginTop: "auto" },
});
