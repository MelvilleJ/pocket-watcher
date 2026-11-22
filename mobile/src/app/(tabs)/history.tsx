import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { Pill } from "@/components/ui/controls";
import { EmptyState, Notice, PageHero, Screen, Section } from "@/components/ui/layout";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { useRemote } from "@/lib/remote";
import type { AuditLog } from "@/lib/remote-types";
import { usePalette } from "@/lib/theme";

const ENTITY_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  depo: "Depo",
  depo_transfer: "Depo transfer",
  subscription: "Subscription",
  debt: "Debt",
  debt_payment: "Debt payment",
  goal: "Goal",
  goal_payment: "Goal payment",
  budget: "Budget",
  user: "Profile",
};

const ACTION_LABELS: Record<string, string> = { create: "Created", update: "Updated", delete: "Deleted" };

// Bookkeeping columns and foreign-key ids mean nothing to a reader; secrets must never be shown.
const BOOKKEEPING_FIELD = /^(id|createdAt|updatedAt|deletedAt|created_at|updated_at|deleted_at)$|[a-z]Id$|_id$/;
const SECRET_FIELD = /password|hash|token|secret/i;
const isHidden = (key: string) => BOOKKEEPING_FIELD.test(key) || SECRET_FIELD.test(key);

function fieldLabel(key: string) {
  const words = key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function fieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function describeChanges(log: AuditLog): string[] {
  const before = asRecord(log.before);
  const after = asRecord(log.after);
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => !isHidden(k));

  if (log.action === "update") {
    return keys
      .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
      .map((k) => `${fieldLabel(k)}: ${fieldValue(before[k])} → ${fieldValue(after[k])}`);
  }
  const source = log.action === "delete" ? before : after;
  return keys.filter((k) => source[k] !== null && source[k] !== undefined && source[k] !== "").map((k) => `${fieldLabel(k)}: ${fieldValue(source[k])}`);
}

export default function HistoryScreen() {
  const palette = usePalette();
  const { data, loading, error, pulling, pull } = useRemote<{ logs: AuditLog[]; total?: number }>("/api/mobile/audit");
  const [openId, setOpenId] = useState<string | null>(null);
  const logs = data?.logs ?? [];
  const total = data?.total ?? logs.length;

  const actionColor = { create: palette.good, update: palette.muted, delete: palette.critical } as const;

  return (
    <Screen refreshing={pulling} onRefresh={pull}>
      <PageHero
        title="History & audit log"
        description="Every change made to your data, from either the web dashboard or the mobile app."
        stats={data ? [{ label: "Recorded changes", value: total.toLocaleString() }] : []}
      />

      {error && <Notice tone="warning">{error}</Notice>}

      <Section
        title="Recent changes"
        subtitle={
          total > logs.length
            ? `Showing the latest ${logs.length.toLocaleString()} of ${total.toLocaleString()}. Tap an entry to see what changed`
            : "Tap an entry to see what changed"
        }
        padded={false}
      >
        {!data ? (
          loading && (
            <View style={{ paddingVertical: Spacing.eight }}>
              <ActivityIndicator color={palette.primary} />
            </View>
          )
        ) : logs.length === 0 ? (
          <EmptyState>No activity recorded yet.</EmptyState>
        ) : (
          logs.map((log) => {
            const open = openId === log.id;
            const changes = open ? describeChanges(log) : [];
            return (
              <Pressable
                key={log.id}
                onPress={() => setOpenId(open ? null : log.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: palette.border, backgroundColor: pressed ? palette.surfaceInset : "transparent" },
                ]}
              >
                <View style={styles.rowTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText size={14} weight="semibold">
                      {ENTITY_LABELS[log.entityType] ?? log.entityType}
                    </AppText>
                    <AppText size={12} color="muted">
                      {new Date(log.createdAt).toLocaleString()} · {log.source === "mobile" ? "Mobile" : "Web"}
                    </AppText>
                  </View>
                  <Pill label={ACTION_LABELS[log.action] ?? log.action} color={actionColor[log.action] ?? palette.muted} />
                </View>
                {open && (
                  <View style={[styles.changes, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
                    {changes.length === 0 ? (
                      <AppText size={13} color="muted">
                        No field details were recorded for this change.
                      </AppText>
                    ) : (
                      changes.map((line, i) => (
                        <AppText key={i} size={13} tabular>
                          {line}
                        </AppText>
                      ))
                    )}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: Spacing.five, paddingVertical: 12, gap: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
  changes: { borderWidth: 1, borderRadius: 8, padding: Spacing.three, gap: 4 },
});
