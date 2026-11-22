import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, View } from "react-native";

import { Button, PeriodPicker, TextField } from "@/components/ui/controls";
import { EmptyState, Notice, PageHero, Screen, Section, StatGrid, StatTile } from "@/components/ui/layout";
import { AppText, Label } from "@/components/ui/text";
import { Spacing } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, MONTH_NAMES, parseAmount } from "@/lib/format";
import { useRemote } from "@/lib/remote";
import type { BudgetLine, BudgetResponse } from "@/lib/remote-types";
import { usePalette } from "@/lib/theme";

type Kind = "income" | "expense" | "debt" | "goal";

function usePeriod() {
  const params = useLocalSearchParams<{ year?: string; month?: string }>();
  const now = new Date();
  const year = Number(params.year);
  const month = Number(params.month);
  return {
    year: params.year && Number.isInteger(year) ? year : now.getFullYear(),
    monthIndex: params.month && Number.isInteger(month) && month >= 0 && month <= 11 ? month : now.getMonth(),
  };
}

export default function BudgetScreen() {
  const { user } = useAuth();
  const palette = usePalette();
  const router = useRouter();
  const { year, monthIndex } = usePeriod();
  const { data, loading, error, refresh, pulling, pull } = useRemote<BudgetResponse>(`/api/mobile/budget?year=${year}&month=${monthIndex}`);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const currency = user?.currency ?? "TT$";
  const money = (v: number) => formatCurrency(v, currency);

  const goTo = (delta: number) => {
    const d = new Date(year, monthIndex + delta, 1);
    router.setParams({ year: String(d.getFullYear()), month: String(d.getMonth()) });
  };

  async function saveLine(lineId: string, plannedAmount: number) {
    try {
      await apiFetch("/api/mobile/budget/line", { method: "POST", body: JSON.stringify({ lineId, plannedAmount }) });
      setSaveError(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Couldn't save that change.");
    }
  }

  async function setLocked(locked: boolean) {
    if (!data) return;
    setLocking(true);
    try {
      await apiFetch("/api/mobile/budget/lock", { method: "POST", body: JSON.stringify({ budgetId: data.budget.id, locked }) });
      await refresh();
    } catch {
      setSaveError("Couldn't reach the server to change the lock.");
    } finally {
      setLocking(false);
    }
  }

  const isLocked = data?.budget.isLocked ?? false;
  const t = data?.totals;

  return (
    <Screen refreshing={pulling} onRefresh={pull}>
      <PageHero
        title={`Budget: ${MONTH_NAMES[monthIndex]} ${year}`}
        description={
          isLocked
            ? "This budget is locked. Actuals are tracked against the amounts you committed to."
            : "Plan your budget before the month starts, then lock it in."
        }
        actions={
          <>
            <PeriodPicker label={`${MONTH_NAMES[monthIndex].slice(0, 3)} ${year}`} onPrevious={() => goTo(-1)} onNext={() => goTo(1)} />
            {data &&
              (isLocked ? (
                <Button label="Unlock to edit" variant="outline" size="sm" loading={locking} onPress={() => setLocked(false)} />
              ) : (
                <Button label="Lock budget" variant="good" size="sm" loading={locking} onPress={() => setLocked(true)} />
              ))}
          </>
        }
      />

      {error && <Notice tone="warning">{error}</Notice>}
      {saveError && <Notice tone="critical">{saveError}</Notice>}

      {!data || !t ? (
        <View style={{ paddingVertical: Spacing.eight }}>
          {loading ? <ActivityIndicator color={palette.primary} /> : <EmptyState>Connect to your server to plan this budget.</EmptyState>}
        </View>
      ) : (
        <>
          <StatGrid>
            <StatTile label="Planned income" value={money(t.plannedIncome)} detail={`Actual: ${money(t.actualIncome)}`} />
            <StatTile
              label="Total planned expenses"
              value={money(t.plannedExpense + t.plannedSubscriptions)}
              detail={`Actual: ${money(t.actualExpense + t.actualSubscriptions)}`}
            />
            <StatTile label="Planned subscriptions" value={money(t.plannedSubscriptions)} detail={`Actual: ${money(t.actualSubscriptions)}`} />
            <StatTile label="Planned debt payments" value={money(t.plannedDebt)} detail={`Actual: ${money(t.actualDebt)}`} />
            <StatTile label="Planned goal payments" value={money(t.plannedGoals)} detail={`Actual: ${money(t.actualGoals)}`} />
          </StatGrid>

          <LineSection title="Income" kind="income" lines={data.lines.income} currency={currency} locked={isLocked} onSave={saveLine} />
          <LineSection
            title="Expenses by category"
            subtitle="Day-to-day spending only. Subscriptions, debt payments, and goal payments are tracked separately below."
            kind="expense"
            lines={data.lines.expenses}
            currency={currency}
            locked={isLocked}
            onSave={saveLine}
          />

          <Section
            title="Subscriptions"
            subtitle="Every active subscription is added here automatically at its known cost. Just say whether you're paying it this month."
            padded={false}
          >
            {data.lines.subscriptions.length === 0 ? (
              <EmptyState>No active subscriptions to budget for.</EmptyState>
            ) : (
              data.lines.subscriptions.map((line) => (
                <SubscriptionLine key={line.id} line={line} currency={currency} locked={isLocked} onSave={saveLine} />
              ))
            )}
          </Section>

          <LineSection
            title="Debt payments"
            subtitle="Every debt with an outstanding balance is added here automatically."
            kind="debt"
            lines={data.lines.debts}
            currency={currency}
            locked={isLocked}
            onSave={saveLine}
            empty="No outstanding debts to budget for."
          />
          <LineSection
            title="Goal payments"
            subtitle="Every unfinished goal is added here automatically at its minimum monthly contribution."
            kind="goal"
            lines={data.lines.goals}
            currency={currency}
            locked={isLocked}
            onSave={saveLine}
            empty="No unfinished goals to budget for."
          />
        </>
      )}
    </Screen>
  );
}

function Variance({ value, good, currency }: { value: number; good: boolean; currency: string }) {
  return (
    <AppText size={13} weight="semibold" tabular align="right" color={value === 0 ? "mutedSoft" : good ? "good" : "critical"}>
      {value >= 0 ? "+" : ""}
      {formatCurrency(value, currency)}
    </AppText>
  );
}

function ColumnLabel({ children, align = "left" }: { children: string; align?: "left" | "right" }) {
  return <Label align={align}>{children}</Label>;
}

function LineSection({
  title,
  subtitle,
  kind,
  lines,
  currency,
  locked,
  onSave,
  empty,
}: {
  title: string;
  subtitle?: string;
  kind: Kind;
  lines: BudgetLine[];
  currency: string;
  locked: boolean;
  onSave: (lineId: string, amount: number) => Promise<void>;
  empty?: string;
}) {
  return (
    <Section title={title} subtitle={subtitle} padded={false}>
      {lines.length === 0 ? (
        <EmptyState>{empty ?? "Nothing to budget here yet."}</EmptyState>
      ) : (
        lines.map((line) => <PlannedLine key={line.id} line={line} kind={kind} currency={currency} locked={locked} onSave={onSave} />)
      )}
    </Section>
  );
}

function PlannedLine({
  line,
  kind,
  currency,
  locked,
  onSave,
}: {
  line: BudgetLine;
  kind: Kind;
  currency: string;
  locked: boolean;
  onSave: (lineId: string, amount: number) => Promise<void>;
}) {
  const palette = usePalette();
  const [text, setText] = useState(line.plannedAmount.toFixed(2));
  const [value, setValue] = useState(line.plannedAmount);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<number | null>(null);
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  });
  const variance = line.actual - value;
  const good = kind === "income" ? variance >= 0 : variance <= 0;

  const [syncedAmount, setSyncedAmount] = useState(line.plannedAmount);
  if (syncedAmount !== line.plannedAmount) {
    setSyncedAmount(line.plannedAmount);
    setText(line.plannedAmount.toFixed(2));
    setValue(line.plannedAmount);
  }

  // Leaving the screen flushes a pending edit instead of dropping it.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current !== null) save.current(line.id, pending.current);
    },
    [line.id]
  );

  function schedule(next: number, delay: number) {
    if (timer.current) clearTimeout(timer.current);
    pending.current = next;
    timer.current = setTimeout(() => {
      pending.current = null;
      save.current(line.id, next);
    }, delay);
  }

  return (
    <View style={[styles.line, { borderBottomColor: palette.border }]}>
      <AppText size={14} weight="medium" numberOfLines={1}>
        {line.label}
      </AppText>
      <View style={styles.lineColumns}>
        <View style={{ flex: 1.2, gap: 4 }}>
          <ColumnLabel>Budgeted</ColumnLabel>
          {locked ? (
            <AppText size={14} tabular>
              {formatCurrency(value, currency)}
            </AppText>
          ) : (
            <TextField
              value={text}
              keyboardType="decimal-pad"
              selectTextOnFocus
              onChangeText={(next) => {
                setText(next);
                const parsed = parseAmount(next);
                if (parsed !== null && parsed >= 0) {
                  setValue(parsed);
                  schedule(parsed, 1500);
                }
              }}
              onBlur={() => {
                const parsed = parseAmount(text);
                if (parsed !== null && parsed >= 0) schedule(parsed, 0);
                else setText(value.toFixed(2));
              }}
              style={{ minHeight: 38, fontSize: 14 }}
            />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <ColumnLabel align="right">Actual</ColumnLabel>
          <AppText size={14} tabular align="right">
            {formatCurrency(line.actual, currency)}
          </AppText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <ColumnLabel align="right">Variance</ColumnLabel>
          <Variance value={variance} good={good} currency={currency} />
        </View>
      </View>
    </View>
  );
}

function SubscriptionLine({
  line,
  currency,
  locked,
  onSave,
}: {
  line: BudgetLine;
  currency: string;
  locked: boolean;
  onSave: (lineId: string, amount: number) => Promise<void>;
}) {
  const palette = usePalette();
  const monthlyCost = line.monthlyCost ?? line.plannedAmount;
  const [included, setIncluded] = useState(line.plannedAmount > 0);
  const [saving, setSaving] = useState(false);
  const variance = line.actual - (included ? monthlyCost : 0);

  const [syncedAmount, setSyncedAmount] = useState(line.plannedAmount);
  if (syncedAmount !== line.plannedAmount) {
    setSyncedAmount(line.plannedAmount);
    setIncluded(line.plannedAmount > 0);
  }

  async function toggle(next: boolean) {
    setIncluded(next);
    setSaving(true);
    await onSave(line.id, next ? Number(monthlyCost.toFixed(2)) : 0);
    setSaving(false);
  }

  return (
    <View style={[styles.line, { borderBottomColor: palette.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
        <View style={{ flex: 1 }}>
          <AppText size={14} weight="medium" numberOfLines={1}>
            {line.label}
          </AppText>
          <AppText size={12} color="mutedSoft" tabular>
            {formatCurrency(monthlyCost, currency)}/mo
          </AppText>
        </View>
        <AppText size={12} color="muted">
          {included ? "Paying" : "Skipping"}
        </AppText>
        <Switch
          value={included}
          onValueChange={toggle}
          disabled={locked || saving}
          trackColor={{ false: palette.borderStrong, true: palette.primary }}
          thumbColor={palette.onFill}
        />
      </View>
      <View style={styles.lineColumns}>
        <View style={{ flex: 1, gap: 4 }}>
          <ColumnLabel>Actual</ColumnLabel>
          <AppText size={14} tabular>
            {formatCurrency(line.actual, currency)}
          </AppText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <ColumnLabel align="right">Variance</ColumnLabel>
          <Variance value={variance} good={variance < 0} currency={currency} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lineColumns: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.three },
});
