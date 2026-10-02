import { db, getSyncCursor, setSyncCursor } from "@/lib/db";
import { apiFetch } from "@/lib/api";
import { replaceNameOptions } from "@/lib/models";

type Row = Record<string, unknown>;

function dirtyRows(table: string): Row[] {
  return db.getAllSync(`SELECT * FROM ${table} WHERE dirty = 1`);
}

function clearDirty(table: string, ids: string[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  db.runSync(`UPDATE ${table} SET dirty = 0 WHERE id IN (${placeholders})`, ids);
}

function buildPushPayload() {
  const income = dirtyRows("income").map((r) => ({
    clientId: r.id,
    date: r.date,
    sourceName: r.source_name,
    description: r.description,
    amount: r.amount,
    notes: r.notes,
    deleted: Boolean(r.deleted_at),
  }));

  const expenses = dirtyRows("expenses").map((r) => ({
    clientId: r.id,
    date: r.date,
    categoryName: r.category_name,
    description: r.description,
    amount: r.amount,
    paid: Boolean(r.paid),
    notes: r.notes,
    deleted: Boolean(r.deleted_at),
  }));

  const subscriptions = dirtyRows("subscriptions").map((r) => ({
    clientId: r.id,
    name: r.name,
    categoryName: r.category_name,
    billingCycle: r.billing_cycle,
    billedAmount: r.billed_amount,
    startDate: r.start_date,
    endDate: r.end_date,
    status: r.status,
    notes: r.notes,
    deleted: Boolean(r.deleted_at),
  }));

  const debts = dirtyRows("debts").map((r) => ({
    clientId: r.id,
    name: r.name,
    lenderType: r.lender_type,
    originalAmount: r.original_amount,
    interestRate: r.interest_rate,
    minMonthlyPayment: r.min_monthly_payment,
    notes: r.notes,
    deleted: Boolean(r.deleted_at),
  }));

  const debtPayments = dirtyRows("debt_payments").map((r) => ({
    clientId: r.id,
    debtClientId: r.debt_id,
    date: r.date,
    description: r.description,
    amount: r.amount,
    notes: r.notes,
    deleted: Boolean(r.deleted_at),
  }));

  return { income, expenses, subscriptions, debts, debtPayments };
}

export async function pushSync() {
  const payload = buildPushPayload();
  const hasChanges = Object.values(payload).some((arr) => arr.length > 0);
  if (!hasChanges) return;

  await apiFetch("/api/mobile/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  clearDirty(
    "income",
    payload.income.map((r) => r.clientId as string)
  );
  clearDirty(
    "expenses",
    payload.expenses.map((r) => r.clientId as string)
  );
  clearDirty(
    "subscriptions",
    payload.subscriptions.map((r) => r.clientId as string)
  );
  clearDirty(
    "debts",
    payload.debts.map((r) => r.clientId as string)
  );
  clearDirty(
    "debt_payments",
    payload.debtPayments.map((r) => r.clientId as string)
  );
}

type SqlValue = string | number | null;

function upsertLocal(table: string, columns: string[], values: SqlValue[]) {
  const placeholders = columns.map(() => "?").join(",");
  const updates = columns
    .filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  db.runSync(
    `INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    values
  );
}

export async function pullSync() {
  const since = getSyncCursor();
  const data = await apiFetch(`/api/mobile/sync?since=${encodeURIComponent(since)}`);

  for (const r of data.income) {
    upsertLocal(
      "income",
      ["id", "date", "source_name", "description", "amount", "notes", "updated_at", "deleted_at", "dirty"],
      [r.clientId, r.date, r.sourceName, r.description, Number(r.amount), r.notes, r.updatedAt, r.deletedAt, 0]
    );
  }

  for (const r of data.expenses) {
    upsertLocal(
      "expenses",
      [
        "id", "date", "category_name", "description", "amount", "paid", "notes",
        "updated_at", "deleted_at", "dirty",
      ],
      [
        r.clientId, r.date, r.categoryName, r.description, Number(r.amount), r.paid ? 1 : 0,
        r.notes, r.updatedAt, r.deletedAt, 0,
      ]
    );
  }

  for (const r of data.subscriptions) {
    upsertLocal(
      "subscriptions",
      [
        "id", "name", "category_name", "billing_cycle", "billed_amount", "start_date",
        "end_date", "status", "notes", "updated_at", "deleted_at", "dirty",
      ],
      [
        r.clientId, r.name, r.categoryName, r.billingCycle, Number(r.billedAmount), r.startDate,
        r.endDate, r.status, r.notes, r.updatedAt, r.deletedAt, 0,
      ]
    );
  }

  for (const r of data.debts) {
    upsertLocal(
      "debts",
      [
        "id", "name", "lender_type", "original_amount", "interest_rate", "min_monthly_payment",
        "notes", "updated_at", "deleted_at", "dirty",
      ],
      [
        r.clientId, r.name, r.lenderType, Number(r.originalAmount), Number(r.interestRate),
        Number(r.minMonthlyPayment), r.notes, r.updatedAt, r.deletedAt, 0,
      ]
    );
  }

  for (const r of data.debtPayments) {
    upsertLocal(
      "debt_payments",
      ["id", "debt_id", "date", "description", "amount", "notes", "updated_at", "deleted_at", "dirty"],
      [r.clientId, r.debtClientId, r.date, r.description, Number(r.amount), r.notes, r.updatedAt, r.deletedAt, 0]
    );
  }

  replaceNameOptions("expense_category", activeNames(data.expenseCategories));
  replaceNameOptions("income_source", activeNames(data.incomeSources));

  setSyncCursor(data.serverTime);
}

function activeNames(rows: { name: string; isArchived: boolean }[] = []) {
  return rows.filter((r) => !r.isArchived).map((r) => r.name);
}

export async function fullSync() {
  await pushSync();
  await pullSync();
}
