import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { NamePicker } from "@/components/name-picker";
import { Spacing } from "@/constants/theme";
import { addIncome, deleteIncome, listIncome, listNameOptions, type IncomeRow } from "@/lib/models";
import { useAuth } from "@/lib/auth-context";

export default function IncomeScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(() => {
    setRows(listIncome());
    setSources(listNameOptions("income_source"));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onAdd() {
    const value = Number(amount);
    if (!source.trim() || !Number.isFinite(value) || value <= 0) return;
    addIncome({ date: new Date().toISOString().slice(0, 10), sourceName: source.trim(), description: description.trim() || undefined, amount: value });
    setSource("");
    setDescription("");
    setAmount("");
    load();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <NamePicker options={sources} value={source} onChange={setSource} newPlaceholder="New source" />
        <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} />
        <TextInput placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.input} />
        <Pressable style={styles.button} onPress={onAdd}>
          <ThemedText style={styles.buttonText}>Add income</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">{item.source_name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.date} {item.description ? `· ${item.description}` : ""}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">
              {user?.currency ?? "TT$"}{item.amount.toFixed(2)}
            </ThemedText>
            <Pressable onPress={() => { deleteIncome(item.id); load(); }} style={styles.deleteBtn}>
              <ThemedText type="small" style={{ color: "#d03b3b" }}>Delete</ThemedText>
            </Pressable>
          </ThemedView>
        )}
        ListEmptyComponent={<ThemedText themeColor="textSecondary" style={styles.empty}>No income logged yet.</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: Spacing.three, gap: Spacing.two },
  input: { borderWidth: 1, borderColor: "#c3c2b7", borderRadius: 8, padding: Spacing.two },
  button: { backgroundColor: "#2a78d6", borderRadius: 8, padding: Spacing.two, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
  list: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two, borderRadius: Spacing.two, padding: Spacing.two },
  deleteBtn: { paddingLeft: Spacing.two },
  empty: { textAlign: "center", marginTop: Spacing.four },
});
