import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { RoadmapAreaChart } from "@/components/charts";
import { PaymentForm, PaymentHistory } from "@/components/payments";
import { AmountSlider, StrategyTable } from "@/components/roadmap";
import { Button, Field, FieldGrid, LinkButton, TextField } from "@/components/ui/controls";
import { EmptyState, FocalPanel, FocalRow, PageHero, ProgressBar, Screen, Section } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";
import { AppText } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { simulateGoalsRoadmap } from "@/lib/finance/goals-roadmap";
import { formatCurrency, monthsFromNowLabel, parseAmount } from "@/lib/format";
import { useLocalData } from "@/lib/local";
import { addGoal, addGoalPayment, deleteGoal, deleteGoalPayment, goalNameTaken, listGoalPayments, listGoals } from "@/lib/models";
import { usePalette } from "@/lib/theme";

const HALF = { flexGrow: 1, flexBasis: 140 } as const;

export default function GoalsScreen() {
  const { user } = useAuth();
  const palette = usePalette();
  const currency = user?.currency ?? "TT$";
  const money = (v: number) => formatCurrency(v, currency);
  const whole = (v: number) => formatCurrency(v, currency, 0);

  const load = useCallback(() => ({ goals: listGoals(), payments: listGoalPayments() }), []);
  const { data, commit, pulling, pull } = useLocalData(load);

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [minimum, setMinimum] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const goals = useMemo(
    () =>
      data.goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.target_amount,
        currentSaved: g.current_saved,
        minMonthlyContribution: g.min_monthly_contribution,
      })),
    [data.goals]
  );
  const minTotal = goals.reduce((s, g) => s + g.minMonthlyContribution, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentSaved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

  const [allocation, setAllocation] = useState(0);

  const largest = useMemo(() => simulateGoalsRoadmap(goals, allocation, "largest"), [goals, allocation]);
  const smallest = useMemo(() => simulateGoalsRoadmap(goals, allocation, "smallest"), [goals, allocation]);
  const chartData = Array.from({ length: Math.max(largest.months.length, smallest.months.length, 1) }, (_, i) => ({
    month: i + 1,
    largest: largest.months[i]?.totalRemaining ?? 0,
    smallest: smallest.months[i]?.totalRemaining ?? 0,
  }));

  function submit() {
    const targetAmount = parseAmount(target);
    const currentSaved = saved.trim() === "" ? 0 : parseAmount(saved);
    const minContribution = minimum.trim() === "" ? 0 : parseAmount(minimum);
    if (!name.trim()) return setError("Name is required.");
    if (goalNameTaken(name)) return setError(`You already have a goal called "${name.trim()}".`);
    if (targetAmount === null || targetAmount <= 0) return setError("Enter a target amount.");
    if (currentSaved === null || currentSaved < 0) return setError("Currently saved must be a number.");
    if (minContribution === null || minContribution < 0) return setError("Minimum contribution must be a number.");
    commit(() => addGoal({ name, targetAmount, currentSaved, minMonthlyContribution: minContribution, notes }));
    setError(null);
    setName("");
    setTarget("");
    setSaved("");
    setMinimum("");
    setNotes("");
  }

  return (
    <Screen refreshing={pulling} onRefresh={pull}>
      <PageHero
        title="Goals Roadmap"
        description="Plan how your monthly savings allocation completes your goals."
      />

      <FocalPanel
        label="Saved so far"
        footer={
          <>
            <FocalRow label="Across all targets">{formatCurrency(totalTarget, currency)}</FocalRow>
            <ProgressBar value={totalTarget > 0 ? totalSaved / totalTarget : 0} color={palette.primaryDeep} />
          </>
        }
      >
        <Money amount={totalSaved} currency={currency} size={44} />
      </FocalPanel>

      <Section title="Create a goal">
        <FieldGrid>
          <Field label="Goal name" style={HALF}>
            <TextField value={name} onChangeText={setName} placeholder="e.g. Emergency fund" maxLength={80} />
          </Field>
          <Field label="Target amount" style={HALF}>
            <TextField value={target} onChangeText={setTarget} placeholder="0.00" keyboardType="decimal-pad" emphasis />
          </Field>
          <Field label="Currently saved" style={HALF}>
            <TextField value={saved} onChangeText={setSaved} placeholder="0.00" keyboardType="decimal-pad" />
          </Field>
          <Field label="Min. monthly contribution" style={HALF}>
            <TextField value={minimum} onChangeText={setMinimum} placeholder="0.00" keyboardType="decimal-pad" />
          </Field>
          <Field label="Notes" style={{ flexBasis: "100%" }}>
            <TextField value={notes} onChangeText={setNotes} placeholder="Optional" maxLength={2000} />
          </Field>
        </FieldGrid>
        {error && (
          <AppText size={13} color="critical">
            {error}
          </AppText>
        )}
        <Button label="Add goal" variant="dark" onPress={submit} />
      </Section>

      <Section title="Your goals" subtitle={`${goals.length} in progress`} padded={false}>
        {goals.length === 0 ? (
          <EmptyState>No goals logged yet.</EmptyState>
        ) : (
          goals.map((g) => {
            const progress = g.targetAmount === 0 ? 0 : g.currentSaved / g.targetAmount;
            return (
              <View key={g.id} style={[styles.goal, { borderBottomColor: palette.border }]}>
                <View style={styles.goalTop}>
                  <AppText size={15} weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                    {g.name}
                  </AppText>
                  <AppText size={14} weight="bold" tabular>
                    {(progress * 100).toFixed(0)}%
                  </AppText>
                </View>
                <ProgressBar value={progress} color={palette.primary} />
                <View style={styles.goalTop}>
                  <AppText size={12} color="muted" tabular style={{ flex: 1 }}>
                    {money(g.currentSaved)} of {money(g.targetAmount)}
                  </AppText>
                  <LinkButton
                    label="Delete"
                    size={12}
                    color={palette.critical}
                    onPress={() =>
                      Alert.alert("Delete goal", `Delete "${g.name}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => commit(() => deleteGoal(g.id)) },
                      ])
                    }
                  />
                </View>
              </View>
            );
          })
        )}
      </Section>

      <Section title="Record a payment">
        <PaymentForm
          targets={goals.map((g) => ({ id: g.id, name: g.name }))}
          targetLabel="Goal"
          onSubmit={(p) => commit(() => addGoalPayment({ goalId: p.targetId, date: p.date, description: p.description, amount: p.amount }))}
        />
      </Section>

      <PaymentHistory title="Payment history" payments={data.payments} currency={currency} onDelete={(p) => commit(() => deleteGoalPayment(p))} />

      {goals.length === 0 ? (
        <AppText size={14} color="muted">
          Add goals to see a roadmap.
        </AppText>
      ) : (
        <>
          <AmountSlider
            label={`Monthly allocation (on top of ${whole(minTotal)} minimums):`}
            value={allocation}
            max={Math.max(minTotal * 5, 2000)}
            onChange={setAllocation}
            currency={currency}
          />
          <Section title="When your goals are funded: largest vs smallest first" subtitle="Total left to save each month. Drag across the chart to inspect a month">
            <RoadmapAreaChart
              data={chartData}
              currency={currency}
              summary={`Funding the largest goal first completes everything in ${monthsFromNowLabel(largest.completionMonth)}, smallest first in ${monthsFromNowLabel(smallest.completionMonth)}.`}
              series={[
                { key: "largest", name: "Largest remaining first", color: palette.primaryDeep },
                { key: "smallest", name: "Smallest remaining first", color: palette.muted, dashed: true },
              ]}
            />
          </Section>
          <StrategyTable
            title="Largest remaining first"
            summary={`All goals complete in ${monthsFromNowLabel(largest.completionMonth)} · Total contributed ${whole(largest.totalContributed)}`}
            columns={["Goal", "Completed in", "Contributed"]}
            rows={largest.goals.map((g) => ({ id: g.id, name: g.name, month: g.completionMonth, amount: whole(g.totalContributed) }))}
          />
          <StrategyTable
            title="Smallest remaining first"
            summary={`All goals complete in ${monthsFromNowLabel(smallest.completionMonth)} · Total contributed ${whole(smallest.totalContributed)}`}
            columns={["Goal", "Completed in", "Contributed"]}
            rows={smallest.goals.map((g) => ({ id: g.id, name: g.name, month: g.completionMonth, amount: whole(g.totalContributed) }))}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  goal: { paddingHorizontal: Spacing.five, paddingVertical: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  goalTop: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
});
