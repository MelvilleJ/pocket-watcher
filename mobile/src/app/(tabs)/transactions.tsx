import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { DepoBadge, DepoChip, DepoList } from "@/components/depos";
import { TransactionForm } from "@/components/transaction-form";
import { LinkButton, Segmented } from "@/components/ui/controls";
import { EmptyState, FocalPanel, FocalRow, PageHero, Screen, Section } from "@/components/ui/layout";
import { Money } from "@/components/ui/money";
import { AppText } from "@/components/ui/text";
import { Spacing, withAlpha } from "@/constants/theme";
import { useAuth } from "@/lib/auth-context";
import { formatCurrency, formatDay, todayKey } from "@/lib/format";
import { useLocalData } from "@/lib/local";
import {
  deleteTransaction,
  listAllDepos,
  listDeposWithBalances,
  listNameOptions,
  listTransactions,
  setExpensePaid,
  type TransactionRow,
  type TransactionType,
} from "@/lib/models";
import { usePalette } from "@/lib/theme";

type Filter = "all" | TransactionType;

function groupByDay(rows: TransactionRow[]) {
  const groups: { key: string; rows: TransactionRow[] }[] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last?.key === row.dateKey) last.rows.push(row);
    else groups.push({ key: row.dateKey, rows: [row] });
  }
  return groups;
}

export default function TransactionsScreen() {
  const { user } = useAuth();
  const palette = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ depo?: string }>();
  const [filter, setFilter] = useState<Filter>("all");
  const currency = user?.currency ?? "TT$";
  const money = (v: number) => formatCurrency(v, currency);

  const activeDepoParam = typeof params.depo === "string" && params.depo ? params.depo : undefined;

  const load = useCallback(
    () => ({
      depos: listDeposWithBalances(),
      lookup: new Map(listAllDepos().map((d) => [d.id, d])),
      rows: listTransactions({ depoId: activeDepoParam, type: filter === "all" ? undefined : filter }),
      monthRows: listTransactions({ depoId: activeDepoParam }, 5000),
      categories: listNameOptions("expense_category"),
      sources: listNameOptions("income_source"),
    }),
    [activeDepoParam, filter]
  );
  const { data, commit, pulling, pull } = useLocalData(load);

  const activeDepo = data.depos.find((d) => d.id === activeDepoParam);
  const total = data.depos.reduce((sum, d) => sum + d.balance, 0);
  const thisMonth = todayKey().slice(0, 7);
  const monthRows = data.monthRows.filter((r) => r.dateKey.startsWith(thisMonth));
  const monthIn = monthRows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const monthOut = monthRows.reduce((s, r) => (r.type === "expense" ? (r.paid ? s + r.amount : s) : s + r.fee), 0);
  const groups = useMemo(() => groupByDay(data.rows), [data.rows]);

  const selectDepo = (id: string | undefined) => router.setParams({ depo: id ?? "" });

  function confirmDelete(row: TransactionRow) {
    Alert.alert("Delete transaction", "This can't be undone from the app.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => commit(() => deleteTransaction(row.type, row.id)) },
    ]);
  }

  const typeStyle = {
    income: { glyph: "↓", color: palette.good },
    expense: { glyph: "↑", color: palette.critical },
    transfer: { glyph: "⇄", color: palette.primaryDeep },
  } as const;

  return (
    <Screen refreshing={pulling} onRefresh={pull}>
      <PageHero
        title="Transactions"
        description="Log money in, money out, and moves between your depos, all in one place."
      />

      <FocalPanel
        label={activeDepo ? `In ${activeDepo.name}` : "Across your depos"}
        footer={
          <>
            <FocalRow label="In this month">
              <AppText size={15} weight="semibold" tabular color="good">
                {formatCurrency(monthIn, currency)}
              </AppText>
            </FocalRow>
            <FocalRow label="Out this month">{formatCurrency(monthOut, currency)}</FocalRow>
          </>
        }
      >
        <Money
          amount={activeDepo?.balance ?? total}
          currency={currency}
          size={44}
          color={(activeDepo?.balance ?? total) < 0 ? "critical" : "foreground"}
        />
      </FocalPanel>

      <Section>
        <TransactionForm
          key={activeDepo?.id ?? "all"}
          depos={data.depos}
          categories={data.categories}
          sources={data.sources}
          defaultDepoId={activeDepo?.id}
          commit={commit}
        />
      </Section>

      <Section padded={false}>
        <View style={[styles.listHeader, { borderBottomColor: palette.border }]}>
          {activeDepo ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}>
              <DepoBadge icon={activeDepo.icon} color={activeDepo.color} size="sm" />
              <AppText size={14} weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {activeDepo.name}
              </AppText>
              <LinkButton label="Clear" size={12} onPress={() => selectDepo(undefined)} />
            </View>
          ) : (
            <AppText size={14} weight="semibold">
              All transactions
            </AppText>
          )}
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "income", label: "In" },
              { value: "expense", label: "Out" },
              { value: "transfer", label: "Transfers" },
            ]}
          />
        </View>

        {groups.length === 0 ? (
          <EmptyState>
            Nothing logged {activeDepo ? `for ${activeDepo.name} ` : ""}yet. Use the form above to add your first transaction.
          </EmptyState>
        ) : (
          groups.map((group) => (
            <View key={group.key}>
              <View style={[styles.day, { backgroundColor: palette.surfaceSoft, borderBottomColor: palette.border }]}>
                <AppText size={12} weight="semibold" color="muted">
                  {formatDay(group.key)}
                </AppText>
              </View>
              {group.rows.map((row) => {
                const t = typeStyle[row.type];
                return (
                  <View key={`${row.type}-${row.id}`} style={[styles.row, { borderBottomColor: palette.border }]}>
                    <View style={[styles.typeBadge, { backgroundColor: withAlpha(t.color, 0.13) }]}>
                      <AppText size={15} weight="bold" color={t.color}>
                        {t.glyph}
                      </AppText>
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      {row.type === "transfer" ? (
                        <View style={styles.chips}>
                          <DepoChip depo={row.depoId ? data.lookup.get(row.depoId) : undefined} />
                          <AppText size={12} color="mutedSoft">
                            →
                          </AppText>
                          <DepoChip depo={row.toDepoId ? data.lookup.get(row.toDepoId) : undefined} />
                        </View>
                      ) : (
                        <AppText size={14} weight="semibold" numberOfLines={1}>
                          {row.title}
                        </AppText>
                      )}
                      <View style={styles.chips}>
                        {row.type !== "transfer" && <DepoChip depo={row.depoId ? data.lookup.get(row.depoId) : undefined} />}
                        {row.description ? (
                          <AppText size={12} color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {row.description}
                          </AppText>
                        ) : null}
                        {row.type === "income" && row.appliedMonth && (
                          <AppText size={12} color="mutedSoft">
                            for {row.appliedMonth}
                          </AppText>
                        )}
                        {row.type === "expense" && !row.paid && <Tag label="Unpaid" color={palette.warningInk} />}
                        {row.fee > 0 && <Tag label={`+${money(row.fee)} fee`} color={palette.serious} />}
                      </View>
                    </View>
                    <View style={styles.rowEnd}>
                      <AppText
                        size={14}
                        weight="bold"
                        tabular
                        color={row.type === "income" ? "good" : row.type === "transfer" ? "muted" : "foreground"}
                      >
                        {row.type === "income" ? "+" : row.type === "expense" ? "−" : ""}
                        {money(row.amount)}
                      </AppText>
                      <View style={{ flexDirection: "row", gap: Spacing.three }}>
                        {row.type === "expense" && (
                          <LinkButton
                            label={row.paid ? "Mark unpaid" : "Mark paid"}
                            size={11}
                            onPress={() => commit(() => setExpensePaid(row.id, !row.paid))}
                          />
                        )}
                        <LinkButton label="Delete" size={11} color={palette.critical} onPress={() => confirmDelete(row)} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </Section>

      <Section title="Depos" padded={false} right={<AppText size={12} weight="medium" tabular color="mutedSoft">{money(total)}</AppText>}>
        <DepoList depos={data.depos} currency={currency} activeDepoId={activeDepo?.id} onSelect={selectDepo} onChanged={() => commit(() => {})} />
      </Section>
    </Screen>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, backgroundColor: withAlpha(color, 0.14) }}>
      <AppText size={11} weight="semibold" tabular color={color}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  day: { paddingHorizontal: Spacing.five, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeBadge: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  rowEnd: { alignItems: "flex-end", gap: 4 },
});
