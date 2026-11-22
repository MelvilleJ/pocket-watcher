import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("pocket-watcher.db");

const MIGRATIONS: string[] = [
  `
    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      source_name TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      category_name TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      paid INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category_name TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      billed_amount REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      lender_type TEXT,
      original_amount REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0,
      min_monthly_payment REAL NOT NULL DEFAULT 0,
      notes TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY NOT NULL,
      debt_id TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS name_options (
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (kind, name)
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `,
  `
    ALTER TABLE income ADD COLUMN applied_month TEXT;
    ALTER TABLE income ADD COLUMN depo_id TEXT;
    ALTER TABLE income ADD COLUMN created_at TEXT;
    ALTER TABLE expenses ADD COLUMN depo_id TEXT;
    ALTER TABLE expenses ADD COLUMN is_subscription_charge INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE expenses ADD COLUMN created_at TEXT;

    CREATE TABLE IF NOT EXISTS depos (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS depo_transfers (
      id TEXT PRIMARY KEY NOT NULL,
      from_depo_id TEXT NOT NULL,
      to_depo_id TEXT NOT NULL,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      description TEXT,
      created_at TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_saved REAL NOT NULL DEFAULT 0,
      initial_saved REAL NOT NULL DEFAULT 0,
      min_monthly_contribution REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS goal_payments (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL,
      deleted_at TEXT,
      dirty INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS remote_cache (
      key TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      fetched_at TEXT NOT NULL
    );

    -- Earlier versions never pulled depos, goals or depo links, so start the next pull from scratch.
    DELETE FROM sync_state WHERE key = 'last_synced_at';
  `,
];

const SYNCED_TABLES = [
  "income",
  "expenses",
  "subscriptions",
  "debts",
  "debt_payments",
  "depos",
  "depo_transfers",
  "goals",
  "goal_payments",
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

export function initDatabase() {
  db.execSync("PRAGMA journal_mode = WAL;");
  const current = db.getFirstSync<{ user_version: number }>("PRAGMA user_version")?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[version]);
      db.execSync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

export function unsyncedChangeCount() {
  return SYNCED_TABLES.reduce(
    (total, table) => total + (db.getFirstSync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE dirty = 1`)?.n ?? 0),
    0
  );
}

export function hasUnsyncedChanges() {
  return unsyncedChangeCount() > 0;
}

// Wipes everything tied to the signed-in account so the next user starts clean.
export function clearLocalData() {
  db.withTransactionSync(() => {
    for (const table of [...SYNCED_TABLES, "name_options", "sync_state", "remote_cache"]) {
      db.runSync(`DELETE FROM ${table}`);
    }
  });
}

export function getSyncCursor(): string {
  const row = db.getFirstSync<{ value: string }>("SELECT value FROM sync_state WHERE key = 'last_synced_at'");
  return row?.value ?? new Date(0).toISOString();
}

export function setSyncCursor(value: string) {
  db.runSync(
    "INSERT INTO sync_state (key, value) VALUES ('last_synced_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    value
  );
}

export function readCache<T>(key: string): { data: T; fetchedAt: string } | null {
  const row = db.getFirstSync<{ json: string; fetched_at: string }>("SELECT json, fetched_at FROM remote_cache WHERE key = ?", [key]);
  if (!row) return null;
  try {
    return { data: JSON.parse(row.json) as T, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

export function writeCache(key: string, data: unknown) {
  db.runSync(
    "INSERT INTO remote_cache (key, json, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET json = excluded.json, fetched_at = excluded.fetched_at",
    [key, JSON.stringify(data), new Date().toISOString()]
  );
}

export function getDataOwner(): string | null {
  return db.getFirstSync<{ value: string }>("SELECT value FROM sync_state WHERE key = 'owner'")?.value ?? null;
}

export function setDataOwner(userId: string) {
  db.runSync(
    "INSERT INTO sync_state (key, value) VALUES ('owner', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [userId]
  );
}
