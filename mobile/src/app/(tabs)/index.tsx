import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { listDebts, listExpenses, listIncome, listSubscriptions, debtBalance } from "@/lib/models";
import { fullSync } from "@/lib/sync";
import { useAuth } from "@/lib/auth-context";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function SummaryScreen() {
  const { user, offline } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ income: 0, expenses: 0, subscriptions: 0, debt: 0 });

  const load = useCallback(() => {
    const thisMonth = monthKey(new Date());

    const income = listIncome()
      .filter((r) => r.date.startsWith(thisMonth))
      .reduce((sum, r) => sum + r.amount, 0);

    const expenses = listExpenses()
      .filter((r) => r.date.startsWith(thisMonth))
      .reduce((sum, r) => sum + r.amount, 0);

    const subscriptions = listSubscriptions()
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + r.billed_amount, 0);

    const debt = listDebts().reduce((sum, d) => sum + debtBalance(d.id, d.original_amount), 0);

    setStats({ income, expenses, subscriptions, debt });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await fullSync();
      load();
    } catch {
      // offline or server unreachable; local data still shown
    } finally {
      setRefreshing(false);
    }
  }

  const currency = user?.currency ?? "TT$";
  const netThisMonth = stats.income - stats.expenses;

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.content}
    >
      {offline && (
        <ThemedView type="backgroundSelected" style={styles.offlineBanner}>
          <ThemedText type="small">You&apos;re offline. Showing data saved on this device.</ThemedText>
        </ThemedView>
      )}

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Income this month
        </ThemedText>
        <ThemedText type="title" style={styles.value}>
          {currency}
          {stats.income.toFixed(2)}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Expenses this month
        </ThemedText>
        <ThemedText type="title" style={styles.value}>
          {currency}
          {stats.expenses.toFixed(2)}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Net this month
        </ThemedText>
        <ThemedText type="title" style={styles.value}>
          {currency}
          {netThisMonth.toFixed(2)}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Active subscriptions (monthly)
        </ThemedText>
        <ThemedText type="title" style={styles.value}>
          {currency}
          {stats.subscriptions.toFixed(2)}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Outstanding debt
        </ThemedText>
        <ThemedText type="title" style={styles.value}>
          {currency}
          {stats.debt.toFixed(2)}
        </ThemedText>
      </ThemedView>

      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
        Pull down to sync with the server.
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  offlineBanner: { borderRadius: Spacing.two, padding: Spacing.two },
  card: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.one },
  value: { fontSize: 28, lineHeight: 32 },
  hint: { textAlign: "center", marginTop: Spacing.two },
});
