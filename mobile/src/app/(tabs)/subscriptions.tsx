import { useCallback, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { Button, CreatableSelect, DateField, Field, FieldGrid, LinkButton, Pill, SelectField, TextField } from "@/components/ui/controls";
import { EmptyState, FocalPanel, FocalRow, PageHero, Screen, Section } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";
import { AppText, Label } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { BILLING_CYCLE_LABELS, calcMonthlyCost } from "@/lib/finance/subscriptions";
import { formatCurrency, parseAmount, todayKey } from "@/lib/format";
import { useLocalData } from "@/lib/local";
import { addSubscription, cancelSubscription, deleteSubscription, listNameOptions, listSubscriptions, type Subscription } from "@/lib/models";
import { usePalette } from "@/lib/theme";

const HALF = { flexGrow: 1, flexBasis: 140 } as const;

export default function SubscriptionsScreen() {
  const { user } = useAuth();
  const palette = usePalette();
  const currency = user?.currency ?? "TT$";
  const money = (v: number) => formatCurrency(v, currency);

  const load = useCallback(() => ({ rows: listSubscriptions(), categories: listNameOptions("expense_category") }), []);
  const { data, commit, pulling, pull } = useLocalData(load);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [cycle, setCycle] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(todayKey);
  const [error, setError] = useState<string | null>(null);

  const active = data.rows.filter((r) => r.status === "active");
  const totalMonthly = active.reduce((sum, r) => sum + calcMonthlyCost(r.billing_cycle, r.billed_amount), 0);

  function submit() {
    const billed = parseAmount(amount);
    if (!name.trim()) return setError("Name is required.");
    if (!category.trim()) return setError("Category is required.");
    if (billed === null || billed < 0) return setError("Enter the billed amount.");
    commit(() => addSubscription({ name, categoryName: category, billingCycle: cycle, billedAmount: billed, startDate }));
    setError(null);
    setName("");
    setAmount("");
  }

  function confirm(title: string, message: string, action: string, run: () => void) {
    Alert.alert(title, message, [
      { text: "Keep", style: "cancel" },
      { text: action, style: "destructive", onPress: () => commit(run) },
    ]);
  }

  return (
    <Screen refreshing={pulling} onRefresh={pull}>
      <PageHero
        title="Subscriptions"
        description="One row per subscription. Billed in every month it was active."
      />

      <FocalPanel label="Each month" footer={<FocalRow label="Active subscriptions">{String(active.length)}</FocalRow>}>
        <Money amount={totalMonthly} currency={currency} size={44} />
      </FocalPanel>

      <Section title="Add a subscription">
        <FieldGrid>
          <Field label="Name" style={{ flexBasis: "100%" }}>
            <TextField value={name} onChangeText={setName} placeholder="e.g. Netflix" maxLength={80} />
          </Field>
          <Field label="Category" style={HALF}>
            <CreatableSelect
              title="Category"
              value={category}
              onChange={setCategory}
              options={data.categories}
              placeholder="Category"
              newPlaceholder="New category"
            />
          </Field>
          <Field label="Billing cycle" style={HALF}>
            <SelectField
              title="Billing cycle"
              value={cycle}
              onChange={setCycle}
              options={Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Billed amount" style={HALF}>
            <TextField value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" emphasis />
          </Field>
          <Field label="Start date" style={HALF}>
            <DateField value={startDate} onChange={setStartDate} />
          </Field>
        </FieldGrid>
        {error && (
          <AppText size={13} color="critical">
            {error}
          </AppText>
        )}
        <Button label="Add subscription" variant="dark" onPress={submit} />
      </Section>

      <Section title="Your subscriptions" subtitle={`${data.rows.length} total`} padded={false}>
        {data.rows.length === 0 ? (
          <EmptyState>No subscriptions logged yet.</EmptyState>
        ) : (
          data.rows.map((row: Subscription) => (
            <View key={row.id} style={[styles.row, { borderBottomColor: palette.border }]}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText size={15} weight="semibold" numberOfLines={1}>
                    {row.name}
                  </AppText>
                  <AppText size={12} color="muted">
                    {row.category_name} · {BILLING_CYCLE_LABELS[row.billing_cycle] ?? row.billing_cycle}
                  </AppText>
                </View>
                <Pill label={row.status === "active" ? "Active" : "Cancelled"} color={row.status === "active" ? palette.good : palette.mutedSoft} dot />
              </View>
              <View style={styles.rowBottom}>
                <View style={{ flex: 1 }}>
                  <Label>Billed</Label>
                  <AppText size={14} tabular>
                    {money(row.billed_amount)}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <Label>Monthly</Label>
                  <AppText size={14} weight="semibold" tabular>
                    {money(calcMonthlyCost(row.billing_cycle, row.billed_amount))}
                  </AppText>
                </View>
                <View style={{ flexDirection: "row", gap: Spacing.four }}>
                  {row.status === "active" && (
                    <LinkButton
                      label="Cancel"
                      size={12}
                      onPress={() => confirm("Cancel subscription", `Stop billing "${row.name}" from today?`, "Cancel it", () => cancelSubscription(row.id))}
                    />
                  )}
                  <LinkButton
                    label="Delete"
                    size={12}
                    color={palette.critical}
                    onPress={() => confirm("Delete subscription", `Delete "${row.name}"?`, "Delete", () => deleteSubscription(row.id))}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: Spacing.five, paddingVertical: 14, gap: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTop: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
  rowBottom: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.three },
});
