import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { RoadmapAreaChart } from "@/components/charts";
import { PaymentForm, PaymentHistory } from "@/components/payments";
import { AmountSlider, StrategyTable } from "@/components/roadmap";
import { Button, Field, FieldGrid, LinkButton, SelectField, TextField } from "@/components/ui/controls";
import { EmptyState, FocalPanel, FocalRow, PageHero, ProgressBar, Screen, Section } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { simulateDebtRoadmap } from "@/lib/finance/debt-roadmap";
import { DEBT_TYPES } from "@/lib/finance/debts";
import { formatCurrency, monthsFromNowLabel, parseAmount } from "@/lib/format";
import { useLocalData } from "@/lib/local";
import { addDebt, addDebtPayment, deleteDebt, deleteDebtPayment, listDebtPayments, listDebtsWithBalances } from "@/lib/models";
import { usePalette } from "@/lib/theme";

const HALF = { flexGrow: 1, flexBasis: 140 } as const;

export default function DebtsScreen() {
  const { user } = useAuth();
  const palette = usePalette();
  const currency = user?.currency ?? "TT$";
  const money = (v: number) => formatCurrency(v, currency);
  const whole = (v: number) => formatCurrency(v, currency, 0);

  const load = useCallback(() => ({ debts: listDebtsWithBalances(), payments: listDebtPayments() }), []);
  const { data, commit, pulling, pull } = useLocalData(load);

  const [name, setName] = useState("");
  const [lenderType, setLenderType] = useState("");
  const [original, setOriginal] = useState("");
  const [rate, setRate] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [extra, setExtra] = useState(0);

  const totalBalance = data.debts.reduce((s, d) => s + d.currentBalance, 0);
  const activeDebts = data.debts.filter((d) => d.currentBalance > 0);
  const minTotal = activeDebts.reduce((s, d) => s + d.min_monthly_payment, 0);
  const roadmapInput = useMemo(
    () =>
      data.debts
        .filter((d) => d.currentBalance > 0)
        .map((d) => ({
          id: d.id,
          name: d.name,
          balance: d.currentBalance,
          interestRate: d.interest_rate,
          minMonthlyPayment: d.min_monthly_payment,
        })),
    [data.debts]
  );
  const avalanche = useMemo(() => simulateDebtRoadmap(roadmapInput, extra, "avalanche"), [roadmapInput, extra]);
  const snowball = useMemo(() => simulateDebtRoadmap(roadmapInput, extra, "snowball"), [roadmapInput, extra]);
  const chartData = Array.from({ length: Math.max(avalanche.months.length, snowball.months.length, 1) }, (_, i) => ({
    month: i + 1,
    avalanche: avalanche.months[i]?.totalBalance ?? 0,
    snowball: snowball.months[i]?.totalBalance ?? 0,
  }));
  const interestSaved = snowball.totalInterestPaid - avalanche.totalInterestPaid;

  function submit() {
    const originalAmount = parseAmount(original);
    const ratePercent = parseAmount(rate);
    const minimum = parseAmount(minPayment);
    if (!name.trim()) return setError("Name is required.");
    if (originalAmount === null || originalAmount <= 0) return setError("Enter the original amount.");
    if (ratePercent === null || ratePercent < 0 || ratePercent > 100) return setError("Interest rate must be between 0 and 100.");
    if (minimum === null || minimum < 0) return setError("Enter the minimum monthly payment.");
    commit(() =>
      addDebt({
        name,
        lenderType: lenderType || null,
        originalAmount,
        interestRate: ratePercent / 100,
        minMonthlyPayment: minimum,
      })
    );
    setError(null);
    setName("");
    setLenderType("");
    setOriginal("");
    setRate("");
    setMinPayment("");
  }

  return (
    <Screen refreshing={pulling} onRefresh={pull}>
      <PageHero
        title="Debts Roadmap"
        description="Track what you owe and compare strategies for paying it off."
      />

      <FocalPanel label="Still to pay off" footer={<FocalRow label="Minimum each month">{formatCurrency(minTotal, currency)}</FocalRow>}>
        <Money amount={totalBalance} currency={currency} size={44} color={totalBalance > 0 ? "critical" : "good"} />
      </FocalPanel>

      <Section title="Add a debt">
        <FieldGrid>
          <Field label="Debt name" style={HALF}>
            <TextField value={name} onChangeText={setName} placeholder="e.g. Visa card" maxLength={80} />
          </Field>
          <Field label="Type" style={HALF}>
            <SelectField
              title="Debt type"
              placeholder="Type (optional)"
              value={lenderType}
              onChange={setLenderType}
              options={[{ value: "", label: "No type" }, ...DEBT_TYPES.map((t) => ({ value: t, label: t }))]}
            />
          </Field>
          <Field label="Original amount" style={HALF}>
            <TextField value={original} onChangeText={setOriginal} placeholder="0.00" keyboardType="decimal-pad" emphasis />
          </Field>
          <Field label="Interest rate (%)" style={HALF}>
            <TextField value={rate} onChangeText={setRate} placeholder="0" keyboardType="decimal-pad" />
          </Field>
          <Field label="Min. monthly payment" style={{ flexBasis: "100%" }}>
            <TextField value={minPayment} onChangeText={setMinPayment} placeholder="0.00" keyboardType="decimal-pad" />
          </Field>
        </FieldGrid>
        {error && (
          <AppText size={13} color="critical">
            {error}
          </AppText>
        )}
        <Button label="Add debt" variant="dark" onPress={submit} />
      </Section>

      <Section title="Your debts" subtitle={`${data.debts.length} tracked`} padded={false}>
        {data.debts.length === 0 ? (
          <EmptyState>No debts logged yet.</EmptyState>
        ) : (
          data.debts.map((d) => (
            <View key={d.id} style={[styles.debt, { borderBottomColor: palette.border }]}>
              <View style={styles.debtTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText size={15} weight="semibold" numberOfLines={1}>
                    {d.name}
                  </AppText>
                  <AppText size={12} color="muted">
                    {[d.lender_type, `${(d.interest_rate * 100).toFixed(2)}%`, `min ${money(d.min_monthly_payment)}`].filter(Boolean).join(" · ")}
                  </AppText>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText size={16} weight="bold" tabular color={d.currentBalance > 0 ? "critical" : "good"}>
                    {money(d.currentBalance)}
                  </AppText>
                  <AppText size={12} color="muted" tabular>
                    of {money(d.original_amount)}
                  </AppText>
                </View>
              </View>
              <ProgressBar value={d.percentPaidOff} color={palette.good} />
              <View style={styles.debtBottom}>
                <AppText size={12} color="muted" tabular>
                  {(d.percentPaidOff * 100).toFixed(0)}% paid off
                </AppText>
                <LinkButton
                  label="Delete"
                  size={12}
                  color={palette.critical}
                  onPress={() =>
                    Alert.alert("Delete debt", `Delete "${d.name}" and stop tracking it?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => commit(() => deleteDebt(d.id)) },
                    ])
                  }
                />
              </View>
            </View>
          ))
        )}
      </Section>

      <Section title="Record a payment">
        <PaymentForm
          targets={data.debts.map((d) => ({ id: d.id, name: d.name }))}
          targetLabel="Debt"
          onSubmit={(p) => commit(() => addDebtPayment({ debtId: p.targetId, date: p.date, description: p.description, amount: p.amount }))}
        />
      </Section>

      <PaymentHistory
        title="Payment history"
        payments={data.payments}
        currency={currency}
        onDelete={(p) => commit(() => deleteDebtPayment(p.id))}
      />

      {roadmapInput.length === 0 ? (
        <AppText size={14} color="muted">
          Add debts to see a roadmap.
        </AppText>
      ) : (
        <>
          <AmountSlider
            label={`Extra payment per month, on top of ${whole(minTotal)} minimums:`}
            value={extra}
            max={Math.max(minTotal * 3, 500)}
            onChange={setExtra}
            currency={currency}
          />
          <Section title="When you'll be debt-free: avalanche vs snowball" subtitle="Total balance left each month. Drag across the chart to inspect a month">
            <RoadmapAreaChart
              data={chartData}
              currency={currency}
              summary={`Avalanche clears your debts in ${monthsFromNowLabel(avalanche.payoffMonth)}, snowball in ${monthsFromNowLabel(snowball.payoffMonth)}.`}
              series={[
                { key: "avalanche", name: "Avalanche (highest interest first)", color: palette.primaryDeep },
                { key: "snowball", name: "Snowball (smallest balance first)", color: palette.muted, dashed: true },
              ]}
            />
            <AppText size={13} color="muted">
              {interestSaved > 0.5
                ? `Avalanche saves ${whole(interestSaved)} in interest vs. snowball at this extra payment.`
                : "Both strategies cost about the same in interest at this extra payment."}
            </AppText>
          </Section>
          <StrategyTable
            title="Avalanche (highest interest first)"
            summary={`Debt-free in ${monthsFromNowLabel(avalanche.payoffMonth)} · Total interest ${whole(avalanche.totalInterestPaid)}`}
            columns={["Debt", "Paid off in", "Interest"]}
            rows={avalanche.debts.map((d) => ({ id: d.id, name: d.name, month: d.payoffMonth, amount: whole(d.totalInterestPaid) }))}
          />
          <StrategyTable
            title="Snowball (smallest balance first)"
            summary={`Debt-free in ${monthsFromNowLabel(snowball.payoffMonth)} · Total interest ${whole(snowball.totalInterestPaid)}`}
            columns={["Debt", "Paid off in", "Interest"]}
            rows={snowball.debts.map((d) => ({ id: d.id, name: d.name, month: d.payoffMonth, amount: whole(d.totalInterestPaid) }))}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  debt: { paddingHorizontal: Spacing.five, paddingVertical: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  debtTop: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
  debtBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
