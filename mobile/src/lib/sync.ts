import { db, getSyncCursor, setSyncCursor, type SyncedTable } from "@/lib/db";
import { apiFetch } from "@/lib/api";
import { replaceNameOptions } from "@/lib/models";

type Row = Record<string, any>;
type SqlValue = string | number | null;

const MAX_BATCH = 500;

function dirtyRows(table: SyncedTable): Row[] {
  return db.getAllSync(`SELECT * FROM ${table} WHERE dirty = 1 LIMIT ${MAX_BATCH}`);
}

const deleted = (r: Row) => Boolean(r.deleted_at);

// Each entry maps a local table to the server's payload key and record shape.
const PUSH: { table: SyncedTable; key: string; toPayload: (r: Row) => Row }[] = [
  {
    table: "depos",
    key: "depos",
    toPayload: (r) => ({
      clientId: r.id,
      name: r.name,
      kind: r.kind,
      color: r.color,
      icon: r.icon,
      openingBalance: r.opening_balance,
      deleted: deleted(r),
    }),
  },
  {
    table: "debts",
    key: "debts",
    toPayload: (r) => ({
      clientId: r.id,
      name: r.name,
      lenderType: r.lender_type,
      originalAmount: r.original_amount,
      interestRate: r.interest_rate,
      minMonthlyPayment: r.min_monthly_payment,
      notes: r.notes,
      deleted: deleted(r),
    }),
  },
  {
    table: "goals",
    key: "goals",
    toPayload: (r) => ({
      clientId: r.id,
      name: r.name,
      targetAmount: r.target_amount,
      initialSaved: r.initial_saved,
      minMonthlyContribution: r.min_monthly_contribution,
      notes: r.notes,
      deleted: deleted(r),
    }),
  },
  {
    table: "depo_transfers",
    key: "depoTransfers",
    toPayload: (r) => ({
      clientId: r.id,
      fromDepoClientId: r.from_depo_id,
      toDepoClientId: r.to_depo_id,
      date: r.date,
      amount: r.amount,
      fee: r.fee,
      description: r.description,
      deleted: deleted(r),
    }),
  },
  {
    table: "debt_payments",
    key: "debtPayments",
    toPayload: (r) => ({
      clientId: r.id,
      debtClientId: r.debt_id,
      date: r.date,
      description: r.description,
      amount: r.amount,
      notes: r.notes,
      deleted: deleted(r),
    }),
  },
  {
    table: "goal_payments",
    key: "goalPayments",
    toPayload: (r) => ({
      clientId: r.id,
      goalClientId: r.goal_id,
      date: r.date,
      description: r.description,
      amount: r.amount,
      notes: r.notes,
      deleted: deleted(r),
    }),
  },
  {
    table: "income",
    key: "income",
    toPayload: (r) => ({
      clientId: r.id,
      date: r.date,
      appliedMonth: r.applied_month ?? undefined,
      sourceName: r.source_name,
      depoClientId: r.depo_id,
      description: r.description,
      amount: r.amount,
      notes: r.notes,
      deleted: deleted(r),
    }),
  },
  {
    table: "expenses",
    key: "expenses",
    toPayload: (r) => ({
      clientId: r.id,
      date: r.date,
      categoryName: r.category_name,
      depoClientId: r.depo_id,
      description: r.description,
      amount: r.amount,
      paid: Boolean(r.paid),
      notes: r.notes,
      deleted: deleted(r),
    }),
  },
  {
    table: "subscriptions",
    key: "subscriptions",
    toPayload: (r) => ({
      clientId: r.id,
      name: r.name,
      categoryName: r.category_name,
      billingCycle: r.billing_cycle,
      billedAmount: r.billed_amount,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
      notes: r.notes,
      deleted: deleted(r),
    }),
  },
];

export type SyncRejection = { type: string; clientId: string; reason: string };

export async function pushSync(): Promise<SyncRejection[]> {
  const batches = PUSH.map((entry) => ({ ...entry, rows: dirtyRows(entry.table) }));
  if (batches.every((b) => b.rows.length === 0)) return [];

  const payload = Object.fromEntries(batches.map((b) => [b.key, b.rows.map(b.toPayload)]));
  const result: { accepted: Record<string, string[]>; rejected: SyncRejection[] } = await apiFetch("/api/mobile/sync", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Only clear rows whose pushed version is still current, so edits made mid-sync go out next time.
  db.withTransactionSync(() => {
    for (const batch of batches) {
      const accepted = new Set(result.accepted?.[batch.key] ?? []);
      for (const row of batch.rows) {
        if (accepted.has(row.id)) {
          db.runSync(`UPDATE ${batch.table} SET dirty = 0 WHERE id = ? AND updated_at = ?`, [row.id, row.updated_at]);
        }
      }
    }
  });

  return result.rejected ?? [];
}

function upsertLocal(table: SyncedTable, values: Record<string, SqlValue>) {
  const columns = Object.keys(values);
  const updates = columns
    .filter((c) => c !== "id")
    .map((c) => `${c} = excluded.${c}`)
    .join(", ");
  // A row with unsynced local edits wins until it has been pushed.
  db.runSync(
    `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})
     ON CONFLICT(id) DO UPDATE SET ${updates} WHERE ${table}.dirty = 0`,
    columns.map((c) => values[c])
  );
}

const num = (v: unknown) => Number(v ?? 0);
const synced = (r: Row) => ({ updated_at: r.updatedAt, deleted_at: r.deletedAt, dirty: 0 });

export async function pullSync() {
  const since = getSyncCursor();
  const data = await apiFetch(`/api/mobile/sync?since=${encodeURIComponent(since)}`);

  db.withTransactionSync(() => {
    for (const r of data.depos ?? []) {
      upsertLocal("depos", {
        id: r.clientId,
        name: r.name,
        kind: r.kind,
        color: r.color,
        icon: r.icon,
        opening_balance: num(r.openingBalance),
        created_at: r.createdAt,
        ...synced(r),
      });
    }

    for (const r of data.depoTransfers ?? []) {
      if (!r.fromDepoClientId || !r.toDepoClientId) continue;
      upsertLocal("depo_transfers", {
        id: r.clientId,
        from_depo_id: r.fromDepoClientId,
        to_depo_id: r.toDepoClientId,
        date: r.date,
        amount: num(r.amount),
        fee: num(r.fee),
        description: r.description,
        created_at: r.createdAt,
        ...synced(r),
      });
    }

    for (const r of data.income ?? []) {
      upsertLocal("income", {
        id: r.clientId,
        date: r.date,
        applied_month: r.appliedMonth,
        source_name: r.sourceName,
        depo_id: r.depoClientId,
        description: r.description,
        amount: num(r.amount),
        notes: r.notes,
        created_at: r.createdAt,
        ...synced(r),
      });
    }

    for (const r of data.expenses ?? []) {
      upsertLocal("expenses", {
        id: r.clientId,
        date: r.date,
        category_name: r.categoryName,
        depo_id: r.depoClientId,
        description: r.description,
        amount: num(r.amount),
        paid: r.paid ? 1 : 0,
        is_subscription_charge: r.subscriptionId ? 1 : 0,
        notes: r.notes,
        created_at: r.createdAt,
        ...synced(r),
      });
    }

    for (const r of data.subscriptions ?? []) {
      upsertLocal("subscriptions", {
        id: r.clientId,
        name: r.name,
        category_name: r.categoryName,
        billing_cycle: r.billingCycle,
        billed_amount: num(r.billedAmount),
        start_date: r.startDate,
        end_date: r.endDate,
        status: r.status,
        notes: r.notes,
        ...synced(r),
      });
    }

    for (const r of data.debts ?? []) {
      upsertLocal("debts", {
        id: r.clientId,
        name: r.name,
        lender_type: r.lenderType,
        original_amount: num(r.originalAmount),
        interest_rate: num(r.interestRate),
        min_monthly_payment: num(r.minMonthlyPayment),
        notes: r.notes,
        ...synced(r),
      });
    }

    for (const r of data.debtPayments ?? []) {
      if (!r.debtClientId) continue;
      upsertLocal("debt_payments", {
        id: r.clientId,
        debt_id: r.debtClientId,
        date: r.date,
        description: r.description,
        amount: num(r.amount),
        notes: r.notes,
        ...synced(r),
      });
    }

    for (const r of data.goals ?? []) {
      upsertLocal("goals", {
        id: r.clientId,
        name: r.name,
        target_amount: num(r.targetAmount),
        current_saved: num(r.currentSaved),
        min_monthly_contribution: num(r.minMonthlyContribution),
        notes: r.notes,
        created_at: r.createdAt,
        ...synced(r),
      });
    }

    for (const r of data.goalPayments ?? []) {
      if (!r.goalClientId) continue;
      upsertLocal("goal_payments", {
        id: r.clientId,
        goal_id: r.goalClientId,
        date: r.date,
        description: r.description,
        amount: num(r.amount),
        notes: r.notes,
        ...synced(r),
      });
    }

    replaceNameOptions("expense_category", activeNames(data.expenseCategories));
    replaceNameOptions("income_source", activeNames(data.incomeSources));
    setSyncCursor(data.serverTime);
  });
}

function activeNames(rows: { name: string; isArchived: boolean }[] = []) {
  return rows.filter((r) => !r.isArchived).map((r) => r.name);
}

let inFlight: Promise<SyncRejection[]> | null = null;

// Concurrent callers share one run so a pull-to-refresh and a screen focus can't push the same rows twice.
export function fullSync(): Promise<SyncRejection[]> {
  inFlight ??= (async () => {
    try {
      const rejected = await pushSync();
      await pullSync();
      return rejected;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
