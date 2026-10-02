import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { addDebt, addDebtPayment, debtBalance, listDebts, type DebtRow } from "@/lib/models";
import { useAuth } from "@/lib/auth-context";

export default function DebtsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<(DebtRow & { balance: number })[]>([]);
  const [name, setName] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [minPayment, setMinPayment] = useState("");

  const load = useCallback(() => {
    setRows(listDebts().map((d) => ({ ...d, balance: debtBalance(d.id, d.original_amount) })));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onAdd() {
    const original = Number(originalAmount);
    const rate = Number(interestRate);
    const minPay = Number(minPayment);
    if (!name.trim() || !Number.isFinite(original) || original <= 0) return;
    addDebt({ name: name.trim(), originalAmount: original, interestRate: (rate || 0) / 100, minMonthlyPayment: minPay || 0 });
    setName("");
    setOriginalAmount("");
    setInterestRate("");
    setMinPayment("");
    load();
  }

  function onQuickPayment(debtId: string) {
    addDebtPayment({ debtId, date: new Date().toISOString().slice(0, 10), amount: 50 });
    load();
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <TextInput placeholder="Debt name" value={name} onChangeText={setName} style={styles.input} />
        <TextInput placeholder="Original amount" keyboardType="decimal-pad" value={originalAmount} onChangeText={setOriginalAmount} style={styles.input} />
        <TextInput placeholder="Interest rate (%)" keyboardType="decimal-pad" value={interestRate} onChangeText={setInterestRate} style={styles.input} />
        <TextInput placeholder="Min. monthly payment" keyboardType="decimal-pad" value={minPayment} onChangeText={setMinPayment} style={styles.input} />
        <Pressable style={styles.button} onPress={onAdd}>
          <ThemedText style={styles.buttonText}>Add debt</ThemedText>
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
                Balance: {user?.currency ?? "TT$"}{item.balance.toFixed(2)} · {(item.interest_rate * 100).toFixed(1)}%
              </ThemedText>
            </View>
            <Pressable onPress={() => onQuickPayment(item.id)} style={styles.payButton}>
              <ThemedText type="small" style={{ color: "#fff" }}>+{user?.currency ?? "TT$"}50</ThemedText>
            </Pressable>
          </ThemedView>
        )}
        ListEmptyComponent={<ThemedText themeColor="textSecondary" style={styles.empty}>No debts logged yet.</ThemedText>}
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
  payButton: { backgroundColor: "#d03b3b", borderRadius: 8, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  empty: { textAlign: "center", marginTop: Spacing.four },
});
