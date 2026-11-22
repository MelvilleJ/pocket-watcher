import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { DepoBadge } from "@/components/depos";
import { Icon } from "@/components/icons";
import { Button, CreatableSelect, DateField, Field, FieldGrid, MonthStepper, Segmented, SelectField, TextField } from "@/components/ui/controls";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { appliedMonthFor, parseAmount, todayKey } from "@/lib/format";
import { addExpense, addIncome, addTransfer, type DepoWithBalance } from "@/lib/models";
import { usePalette } from "@/lib/theme";

type Mode = "expense" | "income" | "transfer";

const HALF = { flexGrow: 1, flexBasis: 140 } as const;

export function TransactionForm({
  depos,
  categories,
  sources,
  defaultDepoId,
  commit,
}: {
  depos: DepoWithBalance[];
  categories: string[];
  sources: string[];
  defaultDepoId?: string;
  commit: (mutation: () => void) => void;
}) {
  const palette = usePalette();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("expense");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("");
  const [date, setDate] = useState(todayKey);
  const [appliedMonth, setAppliedMonth] = useState(() => appliedMonthFor(todayKey()));
  const [depoId, setDepoId] = useState<string | null>(defaultDepoId ?? null);
  const [toDepoId, setToDepoId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paid, setPaid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const isDepo = (id: string | null) => depos.some((d) => d.id === id);
  const firstDepoId = depos[0]?.id ?? "";
  const singleId = depoId === null ? (defaultDepoId ?? firstDepoId) : isDepo(depoId) ? depoId : "";
  const fromId = isDepo(depoId) ? (depoId as string) : firstDepoId;
  const toId = isDepo(toDepoId) && toDepoId !== fromId ? (toDepoId as string) : (depos.find((d) => d.id !== fromId)?.id ?? "");
  const canTransfer = depos.length >= 2;

  const depoOptions = (allowNone: boolean) => [
    ...(allowNone ? [{ value: "", label: "No depo" }] : []),
    ...depos.map((d) => ({ value: d.id, label: d.name, leading: <DepoBadge icon={d.icon} color={d.color} size="sm" /> })),
  ];

  function submit() {
    setSaved(null);
    const value = parseAmount(amount);
    if (value === null || value <= 0) return setError("Enter an amount greater than zero.");

    if (mode === "transfer") {
      const feeValue = fee.trim() === "" ? 0 : parseAmount(fee);
      if (feeValue === null || feeValue < 0) return setError("Fee can't be negative.");
      if (!fromId || !toId || fromId === toId) return setError("Pick two different depos.");
      commit(() => addTransfer({ date, fromDepoId: fromId, toDepoId: toId, amount: value, fee: feeValue, description }));
      setSaved("Money moved.");
    } else if (mode === "income") {
      if (!name.trim()) return setError("Source is required.");
      commit(() => addIncome({ date, appliedMonth, sourceName: name, depoId: singleId || null, description, amount: value }));
      setSaved("Income logged.");
    } else {
      if (!name.trim()) return setError("Category is required.");
      commit(() => addExpense({ date, categoryName: name, depoId: singleId || null, description, amount: value, paid }));
      setSaved("Expense logged.");
    }

    setError(null);
    setAmount("");
    setFee("");
    setDescription("");
  }

  const submitVariant = mode === "income" ? "good" : mode === "expense" ? "critical" : "dark";
  const fromName = depos.find((d) => d.id === fromId)?.name;
  const toName = depos.find((d) => d.id === toId)?.name;

  return (
    <View style={{ gap: Spacing.four }}>
      <Segmented
        value={mode}
        onChange={(next) => {
          setMode(next);
          setName("");
          setError(null);
          setSaved(null);
        }}
        options={[
          { value: "expense", label: "Money out", activeColor: palette.critical },
          { value: "income", label: "Money in", activeColor: palette.good },
          { value: "transfer", label: "Transfer", activeColor: palette.primaryDeep },
        ]}
      />

      {mode === "transfer" && !canTransfer ? (
        <AppText size={14} color="muted">
          Add at least two depos to move money between them.
        </AppText>
      ) : (
        <FieldGrid>
          <Field label={mode === "transfer" ? "Amount sent" : "Amount"} style={HALF}>
            <TextField value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" emphasis />
          </Field>

          {mode === "transfer" ? (
            <>
              <Field label="Fee / tax" style={HALF}>
                <TextField value={fee} onChangeText={setFee} placeholder="0.00" keyboardType="decimal-pad" />
              </Field>
              <Field label="From" style={HALF}>
                <SelectField title="Money leaves" value={fromId} options={depoOptions(false)} onChange={setDepoId} />
              </Field>
              <Field label="To" style={HALF}>
                <SelectField title="Money lands" value={toId} options={depoOptions(false)} onChange={setToDepoId} />
              </Field>
            </>
          ) : (
            <>
              <Field label={mode === "income" ? "Into depo" : "Out of depo"} style={HALF}>
                <SelectField
                  title={mode === "income" ? "Into depo" : "Out of depo"}
                  value={singleId}
                  options={depoOptions(true)}
                  onChange={(next) => setDepoId(next)}
                />
              </Field>
              <Field label={mode === "income" ? "Source" : "Category"} style={HALF}>
                <CreatableSelect
                  key={mode}
                  title={mode === "income" ? "Income source" : "Expense category"}
                  value={name}
                  onChange={setName}
                  options={mode === "income" ? sources : categories}
                  placeholder={mode === "income" ? "Choose source" : "Choose category"}
                  newPlaceholder={mode === "income" ? "New source" : "New category"}
                />
              </Field>
            </>
          )}

          <Field label={mode === "income" ? "Received" : "Date"} style={HALF}>
            <DateField
              value={date}
              onChange={(next) => {
                setDate(next);
                setAppliedMonth(appliedMonthFor(next));
              }}
            />
          </Field>

          {mode === "income" && (
            <Field label="Applies to" style={HALF}>
              <MonthStepper value={appliedMonth} onChange={setAppliedMonth} />
            </Field>
          )}

          <Field label="Description" style={{ flexBasis: "100%" }}>
            <TextField value={description} onChangeText={setDescription} placeholder="Optional note" maxLength={500} />
          </Field>

          {mode === "expense" && (
            <Pressable onPress={() => setPaid(!paid)} style={styles.paid} accessibilityRole="checkbox" accessibilityState={{ checked: paid }}>
              <View style={[styles.checkbox, { borderColor: paid ? palette.primary : palette.borderStrong, backgroundColor: paid ? palette.primary : palette.surface }]}>
                {paid && <Icon name="check" size={13} color={palette.onFill} strokeWidth={2.5} />}
              </View>
              <AppText size={14} color="muted">
                Paid
              </AppText>
            </Pressable>
          )}

          {mode === "transfer" && Number(fee) > 0 && (
            <AppText size={13} tabular color="muted" style={{ flexBasis: "100%" }}>
              {fromName} pays <AppText size={13} weight="bold">{((parseAmount(amount) ?? 0) + Number(fee)).toFixed(2)}</AppText> · {toName} receives{" "}
              <AppText size={13} weight="bold">{(parseAmount(amount) ?? 0).toFixed(2)}</AppText>
            </AppText>
          )}
        </FieldGrid>
      )}

      {error && (
        <AppText size={13} color="critical">
          {error}
        </AppText>
      )}
      {saved && !error && (
        <AppText size={13} color="good">
          {saved}
        </AppText>
      )}

      {!(mode === "transfer" && !canTransfer) && (
        <View style={{ flexDirection: "row", gap: Spacing.two }}>
          <Button
            label={mode === "income" ? "Log income" : mode === "expense" ? "Log expense" : "Move money"}
            variant={submitVariant}
            onPress={submit}
            style={{ flex: 1 }}
          />
          {mode === "expense" && <Button label="Scan" icon="camera" variant="outline" onPress={() => router.push("/scan")} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  paid: { flexDirection: "row", alignItems: "center", gap: Spacing.two, minHeight: 44 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
});
