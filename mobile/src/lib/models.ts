import { randomUUID } from "expo-crypto";

import { db } from "@/lib/db";
import { dateKeyOf } from "@/lib/format";

function nowIso() {
  return new Date().toISOString();
}

function softDelete(table: string, id: string) {
  const now = nowIso();
  db.runSync(`UPDATE ${table} SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?`, [now, now, id]);
}

/* Names ------------------------------------------------------------ */

export type NameOptionKind = "expense_category" | "income_source";

const USED_NAMES_QUERY: Record<NameOptionKind, string> = {
  expense_category:
    "SELECT category_name AS name FROM expenses WHERE deleted_at IS NULL UNION SELECT category_name FROM subscriptions WHERE deleted_at IS NULL",
  income_source: "SELECT source_name AS name FROM income WHERE deleted_at IS NULL",
};

// Includes names used offline that the server has not seen yet, so a new category is reusable before the next sync.
export function listNameOptions(kind: NameOptionKind): string[] {
  const synced = db.getAllSync<{ name: string }>("SELECT name FROM name_options WHERE kind = ?", [kind]);
  const used = db.getAllSync<{ name: string }>(USED_NAMES_QUERY[kind]);
  const byKey = new Map<string, string>();
  for (const { name } of [...synced, ...used]) {
    const key = name.trim().toLowerCase();
    if (key && !byKey.has(key)) byKey.set(key, name.trim());
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

export function replaceNameOptions(kind: NameOptionKind, names: string[]) {
  db.withTransactionSync(() => {
    db.runSync("DELETE FROM name_options WHERE kind = ?", [kind]);
    for (const name of names) {
      db.runSync("INSERT OR IGNORE INTO name_options (kind, name) VALUES (?, ?)", [kind, name]);
    }
  });
}

/* Depos ------------------------------------------------------------ */

export type Depo = {
  id: string;
  name: string;
  kind: string;
  color: string;
  icon: string;
  opening_balance: number;
  deleted_at: string | null;
};

export type DepoWithBalance = Depo & { balance: number };

export type DepoInput = { name: string; kind: string; color: string; icon: string; openingBalance: number };

export function listAllDepos(): Depo[] {
  return db.getAllSync("SELECT id, name, kind, color, icon, opening_balance, deleted_at FROM depos ORDER BY created_at, rowid");
}

export function listDeposWithBalances(): DepoWithBalance[] {
  const totals = (sql: string) =>
    new Map(db.getAllSync<{ depo_id: string; total: number }>(sql).map((r) => [r.depo_id, r.total ?? 0]));
  const incomeIn = totals("SELECT depo_id, SUM(amount) AS total FROM income WHERE deleted_at IS NULL AND depo_id IS NOT NULL GROUP BY depo_id");
  const expenseOut = totals(
    "SELECT depo_id, SUM(amount) AS total FROM expenses WHERE deleted_at IS NULL AND paid = 1 AND depo_id IS NOT NULL GROUP BY depo_id"
  );
  const transferOut = totals("SELECT from_depo_id AS depo_id, SUM(amount + fee) AS total FROM depo_transfers WHERE deleted_at IS NULL GROUP BY from_depo_id");
  const transferIn = totals("SELECT to_depo_id AS depo_id, SUM(amount) AS total FROM depo_transfers WHERE deleted_at IS NULL GROUP BY to_depo_id");

  return listAllDepos()
    .filter((d) => !d.deleted_at)
    .map((d) => ({
      ...d,
      balance:
        d.opening_balance +
        (incomeIn.get(d.id) ?? 0) -
        (expenseOut.get(d.id) ?? 0) +
        (transferIn.get(d.id) ?? 0) -
        (transferOut.get(d.id) ?? 0),
    }));
}

export function depoNameTaken(name: string, exceptId?: string) {
  const row = db.getFirstSync<{ id: string }>(
    "SELECT id FROM depos WHERE deleted_at IS NULL AND lower(name) = lower(?) AND id != ?",
    [name.trim(), exceptId ?? ""]
  );
  return Boolean(row);
}

export function addDepo(input: DepoInput) {
  const now = nowIso();
  db.runSync(
    "INSERT INTO depos (id, name, kind, color, icon, opening_balance, created_at, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
    [randomUUID(), input.name.trim(), input.kind, input.color, input.icon, input.openingBalance, now, now]
  );
}

export function updateDepo(id: string, input: DepoInput) {
  db.runSync(
    "UPDATE depos SET name = ?, kind = ?, color = ?, icon = ?, opening_balance = ?, updated_at = ?, dirty = 1 WHERE id = ?",
    [input.name.trim(), input.kind, input.color, input.icon, input.openingBalance, nowIso(), id]
  );
}

export function deleteDepo(id: string) {
  softDelete("depos", id);
}

/* Transactions ----------------------------------------------------- */

export type TransactionType = "income" | "expense" | "transfer";

export type TransactionRow = {
  id: string;
  type: TransactionType;
  dateKey: string;
  createdAt: string;
  title: string;
  description: string | null;
  amount: number;
  fee: number;
  depoId: string | null;
  toDepoId: string | null;
  appliedMonth: string | null;
  paid: boolean;
};

export function listTransactions(filters: { depoId?: string; type?: TransactionType } = {}, limit = 300): TransactionRow[] {
  const { depoId, type } = filters;
  const wants = (t: TransactionType) => !type || type === t;
  const depoClause = (column: string) => (depoId ? ` AND ${column} = ?` : "");
  const depoArgs = depoId ? [depoId] : [];

  const incomeRows = wants("income")
    ? db.getAllSync<{ id: string; date: string; created_at: string | null; source_name: string; description: string | null; amount: number; depo_id: string | null; applied_month: string | null }>(
        `SELECT id, date, created_at, source_name, description, amount, depo_id, applied_month FROM income WHERE deleted_at IS NULL${depoClause("depo_id")}`,
        depoArgs
      )
    : [];
  const expenseRows = wants("expense")
    ? db.getAllSync<{ id: string; date: string; created_at: string | null; category_name: string; description: string | null; amount: number; depo_id: string | null; paid: number }>(
        `SELECT id, date, created_at, category_name, description, amount, depo_id, paid FROM expenses WHERE deleted_at IS NULL${depoClause("depo_id")}`,
        depoArgs
      )
    : [];
  const transferRows = wants("transfer")
    ? db.getAllSync<{ id: string; date: string; created_at: string | null; description: string | null; amount: number; fee: number; from_depo_id: string; to_depo_id: string }>(
        `SELECT id, date, created_at, description, amount, fee, from_depo_id, to_depo_id FROM depo_transfers WHERE deleted_at IS NULL${
          depoId ? " AND (from_depo_id = ? OR to_depo_id = ?)" : ""
        }`,
        depoId ? [depoId, depoId] : []
      )
    : [];

  const rows: TransactionRow[] = [
    ...incomeRows.map((r) => ({
      id: r.id,
      type: "income" as const,
      dateKey: dateKeyOf(r.date),
      createdAt: r.created_at ?? r.date,
      title: r.source_name,
      description: r.description,
      amount: r.amount,
      fee: 0,
      depoId: r.depo_id,
      toDepoId: null,
      appliedMonth: r.applied_month,
      paid: true,
    })),
    ...expenseRows.map((r) => ({
      id: r.id,
      type: "expense" as const,
      dateKey: dateKeyOf(r.date),
      createdAt: r.created_at ?? r.date,
      title: r.category_name,
      description: r.description,
      amount: r.amount,
      fee: 0,
      depoId: r.depo_id,
      toDepoId: null,
      appliedMonth: null,
      paid: Boolean(r.paid),
    })),
    ...transferRows.map((r) => ({
      id: r.id,
      type: "transfer" as const,
      dateKey: dateKeyOf(r.date),
      createdAt: r.created_at ?? r.date,
      title: "Transfer",
      description: r.description,
      amount: r.amount,
      fee: r.fee,
      depoId: r.from_depo_id,
      toDepoId: r.to_depo_id,
      appliedMonth: null,
      paid: true,
    })),
  ];

  return rows
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function addIncome(input: {
  date: string;
  appliedMonth: string;
  sourceName: string;
  depoId: string | null;
  description?: string;
  amount: number;
}) {
  const now = nowIso();
  db.runSync(
    "INSERT INTO income (id, date, applied_month, source_name, depo_id, description, amount, created_at, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
    [randomUUID(), input.date, input.appliedMonth, input.sourceName.trim(), input.depoId, input.description || null, input.amount, now, now]
  );
}

export function addExpense(input: {
  date: string;
  categoryName: string;
  depoId: string | null;
  description?: string;
  amount: number;
  paid: boolean;
}) {
  const now = nowIso();
  db.runSync(
    "INSERT INTO expenses (id, date, category_name, depo_id, description, amount, paid, created_at, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
    [randomUUID(), input.date, input.categoryName.trim(), input.depoId, input.description || null, input.amount, input.paid ? 1 : 0, now, now]
  );
}

export function addTransfer(input: {
  date: string;
  fromDepoId: string;
  toDepoId: string;
  amount: number;
  fee: number;
  description?: string;
}) {
  const now = nowIso();
  db.runSync(
    "INSERT INTO depo_transfers (id, from_depo_id, to_depo_id, date, amount, fee, description, created_at, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
    [randomUUID(), input.fromDepoId, input.toDepoId, input.date, input.amount, input.fee, input.description || null, now, now]
  );
}

export function setExpensePaid(id: string, paid: boolean) {
  db.runSync("UPDATE expenses SET paid = ?, updated_at = ?, dirty = 1 WHERE id = ?", [paid ? 1 : 0, nowIso(), id]);
}

const TRANSACTION_TABLES: Record<TransactionType, string> = {
  income: "income",
  expense: "expenses",
  transfer: "depo_transfers",
};

export function deleteTransaction(type: TransactionType, id: string) {
  softDelete(TRANSACTION_TABLES[type], id);
}

/* Subscriptions ---------------------------------------------------- */

export type Subscription = {
  id: string;
  name: string;
  category_name: string;
  billing_cycle: string;
  billed_amount: number;
  start_date: string;
  end_date: string | null;
  status: string;
};

export function listSubscriptions(): Subscription[] {
  return db.getAllSync(
    "SELECT id, name, category_name, billing_cycle, billed_amount, start_date, end_date, status FROM subscriptions WHERE deleted_at IS NULL ORDER BY status, name COLLATE NOCASE"
  );
}

export function addSubscription(input: {
  name: string;
  categoryName: string;
  billingCycle: string;
  billedAmount: number;
  startDate: string;
}) {
  db.runSync(
    "INSERT INTO subscriptions (id, name, category_name, billing_cycle, billed_amount, start_date, status, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 1)",
    [randomUUID(), input.name.trim(), input.categoryName.trim(), input.billingCycle, input.billedAmount, input.startDate, nowIso()]
  );
}

export function cancelSubscription(id: string) {
  const now = nowIso();
  db.runSync("UPDATE subscriptions SET status = 'cancelled', end_date = ?, updated_at = ?, dirty = 1 WHERE id = ?", [now, now, id]);
}

export function deleteSubscription(id: string) {
  softDelete("subscriptions", id);
}

/* Debts ------------------------------------------------------------ */

export type DebtWithBalance = {
  id: string;
  name: string;
  lender_type: string | null;
  original_amount: number;
  interest_rate: number;
  min_monthly_payment: number;
  paidToDate: number;
  currentBalance: number;
  percentPaidOff: number;
};

export function listDebtsWithBalances(): DebtWithBalance[] {
  const rows = db.getAllSync<Omit<DebtWithBalance, "paidToDate" | "currentBalance" | "percentPaidOff"> & { paid: number | null }>(
    `SELECT d.id, d.name, d.lender_type, d.original_amount, d.interest_rate, d.min_monthly_payment,
       (SELECT SUM(p.amount) FROM debt_payments p WHERE p.debt_id = d.id AND p.deleted_at IS NULL) AS paid
     FROM debts d WHERE d.deleted_at IS NULL ORDER BY d.name COLLATE NOCASE`
  );
  return rows.map(({ paid, ...d }) => {
    const paidToDate = paid ?? 0;
    return {
      ...d,
      paidToDate,
      currentBalance: Math.max(d.original_amount - paidToDate, 0),
      percentPaidOff: d.original_amount > 0 ? paidToDate / d.original_amount : 0,
    };
  });
}

export function addDebt(input: {
  name: string;
  lenderType: string | null;
  originalAmount: number;
  interestRate: number;
  minMonthlyPayment: number;
}) {
  db.runSync(
    "INSERT INTO debts (id, name, lender_type, original_amount, interest_rate, min_monthly_payment, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    [randomUUID(), input.name.trim(), input.lenderType, input.originalAmount, input.interestRate, input.minMonthlyPayment, nowIso()]
  );
}

export function deleteDebt(id: string) {
  softDelete("debts", id);
}

export type PaymentRow = {
  id: string;
  parent_id: string;
  parent_name: string;
  date: string;
  description: string | null;
  amount: number;
};

export function listDebtPayments(limit = 100): PaymentRow[] {
  return db.getAllSync(
    `SELECT p.id, p.debt_id AS parent_id, d.name AS parent_name, p.date, p.description, p.amount
     FROM debt_payments p JOIN debts d ON d.id = p.debt_id
     WHERE p.deleted_at IS NULL AND d.deleted_at IS NULL
     ORDER BY substr(p.date, 1, 10) DESC, p.rowid DESC LIMIT ?`,
    [limit]
  );
}

export function addDebtPayment(input: { debtId: string; date: string; description?: string; amount: number }) {
  db.runSync(
    "INSERT INTO debt_payments (id, debt_id, date, description, amount, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, 1)",
    [randomUUID(), input.debtId, input.date, input.description || null, input.amount, nowIso()]
  );
}

export function deleteDebtPayment(id: string) {
  softDelete("debt_payments", id);
}

/* Goals ------------------------------------------------------------ */

export type Goal = {
  id: string;
  name: string;
  target_amount: number;
  current_saved: number;
  min_monthly_contribution: number;
};

export function listGoals(): Goal[] {
  return db.getAllSync(
    "SELECT id, name, target_amount, current_saved, min_monthly_contribution FROM goals WHERE deleted_at IS NULL ORDER BY created_at, rowid"
  );
}

export function goalNameTaken(name: string) {
  return Boolean(db.getFirstSync("SELECT id FROM goals WHERE lower(name) = lower(?)", [name.trim()]));
}

export function addGoal(input: { name: string; targetAmount: number; currentSaved: number; minMonthlyContribution: number; notes?: string }) {
  const now = nowIso();
  db.runSync(
    "INSERT INTO goals (id, name, target_amount, current_saved, initial_saved, min_monthly_contribution, notes, created_at, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
    [randomUUID(), input.name.trim(), input.targetAmount, input.currentSaved, input.currentSaved, input.minMonthlyContribution, input.notes || null, now, now]
  );
}

export function deleteGoal(id: string) {
  softDelete("goals", id);
}

export function listGoalPayments(limit = 100): PaymentRow[] {
  return db.getAllSync(
    `SELECT p.id, p.goal_id AS parent_id, g.name AS parent_name, p.date, p.description, p.amount
     FROM goal_payments p JOIN goals g ON g.id = p.goal_id
     WHERE p.deleted_at IS NULL AND g.deleted_at IS NULL
     ORDER BY substr(p.date, 1, 10) DESC, p.rowid DESC LIMIT ?`,
    [limit]
  );
}

// The local current_saved is adjusted optimistically; the server's figure replaces it on the next pull.
export function addGoalPayment(input: { goalId: string; date: string; description?: string; amount: number }) {
  db.withTransactionSync(() => {
    db.runSync(
      "INSERT INTO goal_payments (id, goal_id, date, description, amount, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, 1)",
      [randomUUID(), input.goalId, input.date, input.description || null, input.amount, nowIso()]
    );
    db.runSync("UPDATE goals SET current_saved = current_saved + ? WHERE id = ?", [input.amount, input.goalId]);
  });
}

export function deleteGoalPayment(payment: PaymentRow) {
  db.withTransactionSync(() => {
    softDelete("goal_payments", payment.id);
    db.runSync("UPDATE goals SET current_saved = MAX(current_saved - ?, 0) WHERE id = ?", [payment.amount, payment.parent_id]);
  });
}
