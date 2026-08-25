import { randomUUID } from "expo-crypto";
import { db } from "@/lib/db";

export type IncomeRow = {
  id: string;
  date: string;
  source_name: string;
  description: string | null;
  amount: number;
  notes: string | null;
};

export type ExpenseRow = {
  id: string;
  date: string;
  category_name: string;
  description: string | null;
  amount: number;
  paid: number;
  notes: string | null;
};

export type SubscriptionRow = {
  id: string;
  name: string;
  category_name: string;
  billing_cycle: string;
  billed_amount: number;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
};

export type DebtRow = {
  id: string;
  name: string;
  lender_type: string | null;
  original_amount: number;
  interest_rate: number;
  min_monthly_payment: number;
  notes: string | null;
};

export type DebtPaymentRow = {
  id: string;
  debt_id: string;
  date: string;
  description: string | null;
  amount: number;
  notes: string | null;
};

function newId() {
  return randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

export function listIncome(): IncomeRow[] {
  return db.getAllSync(
    "SELECT id, date, source_name, description, amount, notes FROM income WHERE deleted_at IS NULL ORDER BY date DESC"
  );
}

export function addIncome(input: { date: string; sourceName: string; description?: string; amount: number; notes?: string }) {
  db.runSync(
    "INSERT INTO income (id, date, source_name, description, amount, notes, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    [newId(), input.date, input.sourceName, input.description ?? null, input.amount, input.notes ?? null, nowIso()]
  );
}

export function deleteIncome(id: string) {
  db.runSync("UPDATE income SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?", [nowIso(), nowIso(), id]);
}

export function listExpenses(): ExpenseRow[] {
  return db.getAllSync(
    "SELECT id, date, category_name, description, amount, paid, notes FROM expenses WHERE deleted_at IS NULL ORDER BY date DESC"
  );
}

export function addExpense(input: {
  date: string;
  categoryName: string;
  description?: string;
  amount: number;
  paid?: boolean;
  notes?: string;
}) {
  db.runSync(
    "INSERT INTO expenses (id, date, category_name, description, amount, paid, notes, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
    [
      newId(),
      input.date,
      input.categoryName,
      input.description ?? null,
      input.amount,
      input.paid === false ? 0 : 1,
      input.notes ?? null,
      nowIso(),
    ]
  );
}

export function deleteExpense(id: string) {
  db.runSync("UPDATE expenses SET deleted_at = ?, updated_at = ?, dirty = 1 WHERE id = ?", [nowIso(), nowIso(), id]);
}

export function listSubscriptions(): SubscriptionRow[] {
  return db.getAllSync(
    "SELECT id, name, category_name, billing_cycle, billed_amount, start_date, end_date, status, notes FROM subscriptions WHERE deleted_at IS NULL ORDER BY name"
  );
}

export function addSubscription(input: {
  name: string;
  categoryName: string;
  billingCycle: string;
  billedAmount: number;
  startDate: string;
  notes?: string;
}) {
  db.runSync(
    "INSERT INTO subscriptions (id, name, category_name, billing_cycle, billed_amount, start_date, status, notes, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, 1)",
    [
      newId(),
      input.name,
      input.categoryName,
      input.billingCycle,
      input.billedAmount,
      input.startDate,
      input.notes ?? null,
      nowIso(),
    ]
  );
}

export function listDebts(): DebtRow[] {
  return db.getAllSync(
    "SELECT id, name, lender_type, original_amount, interest_rate, min_monthly_payment, notes FROM debts WHERE deleted_at IS NULL ORDER BY name"
  );
}

export function addDebt(input: {
  name: string;
  lenderType?: string;
  originalAmount: number;
  interestRate: number;
  minMonthlyPayment: number;
  notes?: string;
}) {
  db.runSync(
    "INSERT INTO debts (id, name, lender_type, original_amount, interest_rate, min_monthly_payment, notes, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
    [
      newId(),
      input.name,
      input.lenderType ?? null,
      input.originalAmount,
      input.interestRate,
      input.minMonthlyPayment,
      input.notes ?? null,
      nowIso(),
    ]
  );
}

export function listDebtPayments(debtId: string): DebtPaymentRow[] {
  return db.getAllSync(
    "SELECT id, debt_id, date, description, amount, notes FROM debt_payments WHERE debt_id = ? AND deleted_at IS NULL ORDER BY date DESC",
    [debtId]
  );
}

export function addDebtPayment(input: { debtId: string; date: string; description?: string; amount: number; notes?: string }) {
  db.runSync(
    "INSERT INTO debt_payments (id, debt_id, date, description, amount, notes, updated_at, dirty) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
    [newId(), input.debtId, input.date, input.description ?? null, input.amount, input.notes ?? null, nowIso()]
  );
}

export function debtBalance(debtId: string, originalAmount: number): number {
  const row = db.getFirstSync<{ total: number | null }>(
    "SELECT SUM(amount) as total FROM debt_payments WHERE debt_id = ? AND deleted_at IS NULL",
    [debtId]
  );
  return Math.max(originalAmount - (row?.total ?? 0), 0);
}
