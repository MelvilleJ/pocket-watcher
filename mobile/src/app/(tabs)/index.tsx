import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { CategoryBreakdownChart, MoneyFlowChart } from "@/components/charts";
import { DepoBadge } from "@/components/depos";
import { EmptyState, FocalPanel, FocalRow, Notice, PageHero, ProgressBar, Screen, Section } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";
import { AppText } from "@/components/ui/text";
import { mix, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { depoKindLabel } from "@/lib/finance/depos";
import { formatCurrency, MONTH_NAMES } from "@/lib/format";
import { useRemote } from "@/lib/remote";
import type { SummaryResponse } from "@/lib/remote-types";
import { usePalette } from "@/lib/theme";

export default function SummaryScreen() {
  const { user } = useAuth();
  const palette = usePalette();
  const router = useRouter();
  const { data, loading, error, pulling, pull } = useRemote<SummaryResponse>("/api/mobile/summary");
  const currency = user?.currency ?? "TT$";
  const money = (v: number) => formatCurrency(v, currency);

  const now = new Date();
  const monthIndex = data?.monthIndex ?? now.getMonth();
  const year = data?.year ?? now.getFullYear();
  const nextMonth = new Date(year, monthIndex + 1, 1);

  const net = data?.selected.net ?? 0;
  const savingsRate = data?.savingsRate ?? user?.savingsRate ?? 0;
  const savings = net > 0 ? net * savingsRate : 0;
  const funMoney = net > 0 ? net - savings : 0;
  const depoTotal = data?.depos.reduce((sum, d) => sum + d.balance, 0) ?? 0;

  return (
    <Screen refreshing={pulling} onRefresh={pull}>
      <PageHero
        title={`${MONTH_NAMES[monthIndex]} ${year}`}
        description="Everything here is calculated from your Transactions, Subscriptions, and Debts logs."
      />

      {data && (
        <FocalPanel
          label="Net this month"
          footer={
            <>
              <FocalRow label="Income">
                <AppText size={15} weight="semibold" tabular color="good">
                  {money(data.selected.income)}
                </AppText>
              </FocalRow>
              <FocalRow label="Money out">{money(data.selected.totalOut)}</FocalRow>
            </>
          }
        >
          <Money amount={net} currency={currency} size={44} color={net >= 0 ? "good" : "critical"} />
        </FocalPanel>
      )}

      {error && <Notice tone="warning">{error}</Notice>}

      {!data ? (
        <View style={{ paddingVertical: Spacing.eight }}>
          {loading ? <ActivityIndicator color={palette.primary} /> : <EmptyState>Connect to your server to load your summary.</EmptyState>}
        </View>
      ) : (
        <>
          <Section title="This month" padded={false}>
            {[
              { label: `Set aside (${Math.round(savingsRate * 100)}%)`, value: savings },
              { label: "Fun money", value: funMoney },
              {
                label: "Outstanding debt",
                value: data.outstandingDebt,
                color: data.outstandingDebt > 0 ? ("critical" as const) : undefined,
              },
              { label: "Across depos", value: depoTotal, color: depoTotal < 0 ? ("critical" as const) : undefined },
            ].map((row, i, rows) => (
              <View
                key={row.label}
                style={[styles.listRow, { borderBottomColor: palette.border, borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth }]}
              >
                <AppText size={14} color="muted">
                  {row.label}
                </AppText>
                <AppText size={15} weight="semibold" tabular color={row.color ?? "foreground"}>
                  {money(row.value)}
                </AppText>
              </View>
            ))}
          </Section>

          <Section title={`Money in vs money out each month, ${year}`} subtitle="Tap a month for details">
            <MoneyFlowChart data={data.months} currency={currency} />
          </Section>

          <Section title={`Where ${MONTH_NAMES[monthIndex]}'s spending went`}>
            {data.categories.length > 0 ? (
              <CategoryBreakdownChart data={data.categories} currency={currency} />
            ) : (
              <AppText size={14} color="muted">
                No expenses logged this month yet.
              </AppText>
            )}
          </Section>

          <Section
            title="Where your money is"
            subtitle={`${money(depoTotal)} across ${data.depos.length} depo${data.depos.length === 1 ? "" : "s"}`}
          >
            {data.depos.length > 0 ? (
              <View style={styles.depoCards}>
                {data.depos.map((depo) => (
                  <Pressable
                    key={depo.id}
                    onPress={() => router.navigate({ pathname: "/transactions", params: { depo: depo.id } })}
                    style={({ pressed }) => [
                      styles.depoCard,
                      {
                        borderColor: pressed ? mix(depo.color, palette.border, 0.45) : palette.border,
                        backgroundColor: pressed ? palette.surfaceInset : palette.surface,
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <DepoBadge icon={depo.icon} color={depo.color} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText size={14} weight="semibold" numberOfLines={1}>
                          {depo.name}
                        </AppText>
                        <AppText size={12} color="muted">
                          {depoKindLabel(depo.kind)}
                        </AppText>
                      </View>
                    </View>
                    <Money amount={depo.balance} currency={currency} size={24} color={depo.balance < 0 ? "critical" : "foreground"} />
                    <ProgressBar value={depoTotal > 0 ? depo.balance / depoTotal : 0} color={depo.color} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={{ gap: Spacing.three }}>
                <AppText size={14} color="muted">
                  Add depos like cash in hand, your bank, or a credit union to see where your money sits.
                </AppText>
                <TextLink label="Set up depos" onPress={() => router.navigate("/transactions")} />
              </View>
            )}
          </Section>

          <Section title="Year to date" subtitle={String(year)} padded={false}>
            {[
              { label: "Income", value: data.ytd.income },
              { label: "Expenses", value: data.ytd.expenses },
              { label: "Subscriptions", value: data.ytd.subscriptions },
              { label: "Debt payments", value: data.ytd.debtPayments },
            ].map((row) => (
              <View key={row.label} style={[styles.listRow, { borderBottomColor: palette.border }]}>
                <AppText size={14} color="muted">
                  {row.label}
                </AppText>
                <AppText size={14} weight="medium" tabular>
                  {money(row.value)}
                </AppText>
              </View>
            ))}
            <View style={[styles.listRow, { borderBottomWidth: 0, paddingVertical: 14 }]}>
              <AppText size={14} weight="semibold">
                Net
              </AppText>
              <AppText size={16} weight="bold" tabular color={data.ytd.net >= 0 ? "good" : "critical"}>
                {money(data.ytd.net)}
              </AppText>
            </View>
            <View style={{ gap: Spacing.three, paddingHorizontal: Spacing.five, paddingBottom: Spacing.five, paddingTop: Spacing.two }}>
              <TextLink
                label="Plan next month's budget"
                onPress={() =>
                  router.navigate({
                    pathname: "/budget",
                    params: { year: String(nextMonth.getFullYear()), month: String(nextMonth.getMonth()) },
                  })
                }
              />
              <TextLink label="Plan your debt payoff roadmap" onPress={() => router.navigate("/debts")} />
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="link" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <AppText size={14} weight="semibold" color="primaryDeep" style={{ textDecorationLine: "underline" }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  depoCards: { gap: Spacing.three },
  depoCard: { borderWidth: 1, borderRadius: 14, padding: Spacing.four, gap: Spacing.three },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
