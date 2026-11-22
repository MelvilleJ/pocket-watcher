import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { Button, DateField, Field, FieldGrid, LinkButton, SelectField, TextField } from "@/components/ui/controls";
import { EmptyState, Section } from "@/components/ui/layout";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { dateKeyOf, formatCurrency, formatShortDate, parseAmount, todayKey } from "@/lib/format";
import type { PaymentRow } from "@/lib/models";
import { usePalette } from "@/lib/theme";

const HALF = { flexGrow: 1, flexBasis: 140 } as const;

export function PaymentForm({
  targets,
  targetLabel,
  onSubmit,
}: {
  targets: { id: string; name: string }[];
  targetLabel: string;
  onSubmit: (input: { targetId: string; date: string; description: string; amount: number }) => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [date, setDate] = useState(todayKey);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const value = parseAmount(amount);
    if (!targets.some((t) => t.id === targetId)) return setError(`Select a ${targetLabel.toLowerCase()}.`);
    if (value === null || value <= 0) return setError("Enter an amount greater than zero.");
    onSubmit({ targetId, date, description: description.trim(), amount: value });
    setError(null);
    setDescription("");
    setAmount("");
  }

  if (targets.length === 0) {
    return (
      <AppText size={14} color="muted">
        Add a {targetLabel.toLowerCase()} first.
      </AppText>
    );
  }

  return (
    <>
      <FieldGrid>
        <Field label={targetLabel} style={HALF}>
          <SelectField
            title={`Select ${targetLabel.toLowerCase()}`}
            placeholder={`Select ${targetLabel.toLowerCase()}`}
            value={targetId}
            onChange={setTargetId}
            options={targets.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Field>
        <Field label="Date" style={HALF}>
          <DateField value={date} onChange={setDate} />
        </Field>
        <Field label="Amount" style={HALF}>
          <TextField value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" emphasis />
        </Field>
        <Field label="Description" style={HALF}>
          <TextField value={description} onChangeText={setDescription} placeholder="Optional" maxLength={500} />
        </Field>
      </FieldGrid>
      {error && (
        <AppText size={13} color="critical">
          {error}
        </AppText>
      )}
      <Button label="Record payment" variant="dark" onPress={submit} />
    </>
  );
}

export function PaymentHistory({
  title,
  payments,
  currency,
  onDelete,
}: {
  title: string;
  payments: PaymentRow[];
  currency: string;
  onDelete: (payment: PaymentRow) => void;
}) {
  const palette = usePalette();
  return (
    <Section title={title} subtitle={`${payments.length} recorded`} padded={false}>
      {payments.length === 0 ? (
        <EmptyState>No payments recorded yet.</EmptyState>
      ) : (
        payments.map((p) => (
          <View key={p.id} style={[styles.row, { borderBottomColor: palette.border }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText size={14} weight="semibold" numberOfLines={1}>
                {p.parent_name}
              </AppText>
              <AppText size={12} color="muted" numberOfLines={1}>
                {formatShortDate(dateKeyOf(p.date))}
                {p.description ? ` · ${p.description}` : ""}
              </AppText>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <AppText size={14} weight="semibold" tabular>
                {formatCurrency(p.amount, currency)}
              </AppText>
              <LinkButton
                label="Delete"
                size={11}
                color={palette.critical}
                onPress={() =>
                  Alert.alert("Delete payment", "Remove this payment?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => onDelete(p) },
                  ])
                }
              />
            </View>
          </View>
        ))
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
