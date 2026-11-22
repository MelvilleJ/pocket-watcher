import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { Icon } from "@/components/icons";
import { ServerUrlField } from "@/components/server-url-field";
import { Button, CreatableSelect, Field, LinkButton, Pill, SwitchRow, TextField } from "@/components/ui/controls";
import { EmptyState, Notice, PageHero, Screen, Section } from "@/components/ui/layout";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getSyncCursor, hasUnsyncedChanges } from "@/lib/db";
import { CURRENCY_OPTIONS } from "@/lib/finance/currencies";
import { parseAmount } from "@/lib/format";
import type { SessionInfo } from "@/lib/remote-types";
import { fullSync } from "@/lib/sync";
import { useAppTheme } from "@/lib/theme";
import { useConfirmLogout } from "@/lib/use-confirm-logout";

export default function SettingsScreen() {
  const { user, updateProfile } = useAuth();
  const confirmLogout = useConfirmLogout();
  const { palette, isDark, setDark } = useAppTheme();

  const [name, setName] = useState(user?.name ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "TT$");
  const [savings, setSavings] = useState(String(Math.round((user?.savingsRate ?? 0.2) * 1000) / 10));
  const [profileStatus, setProfileStatus] = useState<{ tone: "good" | "critical"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ tone: "neutral" | "warning" | "critical"; text: string } | null>(null);
  const [lastSynced, setLastSynced] = useState(getSyncCursor());
  const [pending, setPending] = useState(hasUnsyncedChanges());

  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch("/api/mobile/sessions");
      setSessions(data.sessions);
      setSessionsError(null);
    } catch {
      setSessionsError("Connect to your server to see signed-in devices.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPending(hasUnsyncedChanges());
      setLastSynced(getSyncCursor());
      loadSessions();
    }, [loadSessions])
  );

  const currencyOptions = CURRENCY_OPTIONS.map((o) => o.value);
  if (!currencyOptions.includes(currency) && currency) currencyOptions.unshift(currency);

  async function saveProfile() {
    const rate = parseAmount(savings);
    if (name.trim().length < 2) return setProfileStatus({ tone: "critical", text: "Name must be at least 2 characters." });
    if (!currency.trim()) return setProfileStatus({ tone: "critical", text: "Choose a currency." });
    if (rate === null || rate < 0 || rate > 100) return setProfileStatus({ tone: "critical", text: "Savings rate must be between 0 and 100." });
    setSavingProfile(true);
    try {
      await updateProfile({ name: name.trim(), currency: currency.trim(), savingsRatePercent: rate });
      setProfileStatus({ tone: "good", text: "Profile saved." });
    } catch (e) {
      setProfileStatus({ tone: "critical", text: e instanceof ApiError ? e.message : "Couldn't reach the server. Try again when you're online." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const rejected = await fullSync();
      setSyncStatus(
        rejected.length > 0
          ? { tone: "warning", text: `Synced, but ${rejected.length} change${rejected.length === 1 ? " was" : "s were"} refused: ${rejected.map((r) => r.reason).join(" ")}` }
          : { tone: "neutral", text: "Everything is up to date." }
      );
    } catch (e) {
      setSyncStatus({ tone: "critical", text: e instanceof Error && e.name !== "AbortError" ? e.message : "Couldn't reach the server." });
    } finally {
      setSyncing(false);
      setPending(hasUnsyncedChanges());
      setLastSynced(getSyncCursor());
    }
  }

  function revoke(session: SessionInfo) {
    Alert.alert("Sign out device", `Sign out "${session.deviceName ?? "this device"}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await apiFetch("/api/mobile/sessions/revoke", { method: "POST", body: JSON.stringify({ sessionId: session.id }) }).catch(() => {});
          loadSessions();
        },
      },
    ]);
  }

  const neverSynced = new Date(lastSynced).getTime() === 0;

  return (
    <Screen>
      <PageHero title="Settings" description="Profile, currency, savings rate, and device sessions." />

      <Section title="Profile">
        <Field label="Name">
          <TextField value={name} onChangeText={setName} maxLength={80} />
        </Field>
        <Field label="Currency">
          <CreatableSelect
            title="Currency"
            value={currency}
            onChange={setCurrency}
            options={currencyOptions}
            placeholder="Choose currency"
            newPlaceholder="Symbol, e.g. R$"
            addLabel="Other…"
            maxLength={8}
          />
        </Field>
        <Field label="Savings rate (% of net income saved)">
          <TextField value={savings} onChangeText={setSavings} keyboardType="decimal-pad" />
        </Field>
        {profileStatus && (
          <AppText size={13} color={profileStatus.tone}>
            {profileStatus.text}
          </AppText>
        )}
        <Button label="Save changes" variant="dark" loading={savingProfile} onPress={saveProfile} style={{ alignSelf: "flex-start" }} />
      </Section>

      <Section title="Appearance">
        <View style={[styles.themeCard, { borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}>
          <View style={[styles.themeIcon, { backgroundColor: palette.surfaceInset }]}>
            <Icon name={isDark ? "moon" : "sun"} size={20} color={palette.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <SwitchRow value={isDark} onChange={setDark} label="Dark mode" description="Use a darker palette throughout Pocket Watcher." />
          </View>
        </View>
      </Section>

      <Section title="Sync & server">
        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two, flexWrap: "wrap" }}>
          <Pill label={pending ? "Changes waiting to sync" : "All changes synced"} color={pending ? palette.warningInk : palette.good} dot />
          <AppText size={12} color="mutedSoft">
            {neverSynced ? "Not synced yet" : `Last synced ${new Date(lastSynced).toLocaleString()}`}
          </AppText>
        </View>
        <Button label="Sync now" icon="refresh" variant="outline" loading={syncing} onPress={syncNow} style={{ alignSelf: "flex-start" }} />
        {syncStatus && <Notice tone={syncStatus.tone}>{syncStatus.text}</Notice>}
        <ServerUrlField />
      </Section>

      <Section title="Active sessions" subtitle="Web and mobile devices signed in to your account." padded={false}>
        {sessionsError ? (
          <EmptyState>{sessionsError}</EmptyState>
        ) : !sessions ? (
          <EmptyState>Loading…</EmptyState>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={[styles.session, { borderBottomColor: palette.border }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText size={14} weight="semibold" numberOfLines={1}>
                  {s.deviceName ?? "Unknown device"}
                  {s.current ? " (this device)" : ""}
                </AppText>
                <AppText size={12} color="muted">
                  {s.platform === "mobile" ? "Mobile" : "Web"} · {new Date(s.lastUsedAt).toLocaleString()}
                </AppText>
              </View>
              {s.active ? (
                s.current ? (
                  <Pill label="Active" color={palette.good} dot />
                ) : (
                  <LinkButton label="Sign out" size={12} color={palette.critical} onPress={() => revoke(s)} />
                )
              ) : (
                <AppText size={12} color="mutedSoft">
                  Signed out
                </AppText>
              )}
            </View>
          ))
        )}
      </Section>

      <Button
        label="Log out"
        icon="logout"
        variant="critical"
        onPress={confirmLogout}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  themeCard: { flexDirection: "row", alignItems: "center", gap: Spacing.three, borderWidth: 1, borderRadius: 14, padding: Spacing.four },
  themeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  session: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
