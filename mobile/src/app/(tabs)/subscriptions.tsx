import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { NamePicker } from "@/components/name-picker";
import { Spacing } from "@/constants/theme";
import { addSubscription, listNameOptions, listSubscriptions, type SubscriptionRow } from "@/lib/models";
import { useAuth } from "@/lib/auth-context";

const CYCLES = ["monthly", "weekly", "fortnightly", "quarterly", "half_yearly", "yearly"];

export default function SubscriptionsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState("monthly");

  const load = useCallback(() => {
    setRows(listSubscriptions());
    setCategories(listNameOptions("expense_category"));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onAdd() {
    const value = Number(amount);
    if (!name.trim() || !category.trim() || !Number.isFinite(value) || value <= 0) return;
    addSubscription({
      name: name.trim(),
      categoryName: category.trim(),
      billingCycle: cycle,
      billedAmount: value,
      startDate: new Date().toISOString().slice(0, 10),
    });
    setName("");
    setCategory("");
    setAmount("");
    load();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <TextInput placeholder="Subscription name" value={name} onChangeText={setName} style={styles.input} />
        <NamePicker options={categories} value={category} onChange={setCategory} newPlaceholder="New category" />
        <TextInput placeholder="Billed amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.input} />
        <View style={styles.cycleRow}>
          {CYCLES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCycle(c)}
              style={[styles.cycleChip, cycle === c && styles.cycleChipActive]}
            >
              <ThemedText type="small" style={cycle === c ? { color: "#fff" } : undefined}>
                {c.replace("_", "-")}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.button} onPress={onAdd}>
          <ThemedText style={styles.buttonText}>Add subscription</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">{item.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.category_name} · {item.billing_cycle.replace("_", "-")} · {item.status}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">
              {user?.currency ?? "TT$"}{item.billed_amount.toFixed(2)}
            </ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={<ThemedText themeColor="textSecondary" style={styles.empty}>No subscriptions logged yet.</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: Spacing.three, gap: Spacing.two },
  input: { borderWidth: 1, borderColor: "#c3c2b7", borderRadius: 8, padding: Spacing.two },
  cycleRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.one },
  cycleChip: { borderWidth: 1, borderColor: "#c3c2b7", borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half },
  cycleChipActive: { backgroundColor: "#2a78d6", borderColor: "#2a78d6" },
  button: { backgroundColor: "#2a78d6", borderRadius: 8, padding: Spacing.two, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  list: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two, borderRadius: Spacing.two, padding: Spacing.two },
  empty: { textAlign: "center", marginTop: Spacing.four },
});
