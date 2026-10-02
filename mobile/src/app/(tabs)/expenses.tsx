import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { NamePicker } from "@/components/name-picker";
import { Spacing } from "@/constants/theme";
import { addExpense, deleteExpense, listExpenses, listNameOptions, type ExpenseRow } from "@/lib/models";
import { useAuth } from "@/lib/auth-context";

export default function ExpensesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(() => {
    setRows(listExpenses());
    setCategories(listNameOptions("expense_category"));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onAdd() {
    const value = Number(amount);
    if (!category.trim() || !Number.isFinite(value) || value <= 0) return;
    addExpense({ date: new Date().toISOString().slice(0, 10), categoryName: category.trim(), description: description.trim() || undefined, amount: value });
    setCategory("");
    setDescription("");
    setAmount("");
    load();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <NamePicker options={categories} value={category} onChange={setCategory} newPlaceholder="New category" />
        <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} />
        <TextInput placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.input} />
        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => router.push("/scan")}>
            <ThemedText style={styles.buttonSecondaryText}>Scan receipt</ThemedText>
          </Pressable>
          <Pressable style={styles.button} onPress={onAdd}>
            <ThemedText style={styles.buttonText}>Add expense</ThemedText>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">{item.category_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.date} {item.description ? `· ${item.description}` : ""}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">
              {user?.currency ?? "TT$"}{item.amount.toFixed(2)}
            </ThemedText>
            <Pressable onPress={() => { deleteExpense(item.id); load(); }} style={styles.deleteBtn}>
              <ThemedText type="small" style={{ color: "#d03b3b" }}>Delete</ThemedText>
            </Pressable>
          </ThemedView>
        )}
        ListEmptyComponent={<ThemedText themeColor="textSecondary" style={styles.empty}>No expenses logged yet.</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: Spacing.three, gap: Spacing.two },
  input: { borderWidth: 1, borderColor: "#c3c2b7", borderRadius: 8, padding: Spacing.two },
  buttonRow: { flexDirection: "row", gap: Spacing.two },
  button: { flex: 1, backgroundColor: "#2a78d6", borderRadius: 8, padding: Spacing.two, alignItems: "center" },
  buttonSecondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#2a78d6" },
  buttonText: { color: "#fff", fontWeight: "600" },
  buttonSecondaryText: { color: "#2a78d6", fontWeight: "600" },
  list: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two, borderRadius: Spacing.two, padding: Spacing.two },
  deleteBtn: { paddingLeft: Spacing.two },
  empty: { textAlign: "center", marginTop: Spacing.four },
});
