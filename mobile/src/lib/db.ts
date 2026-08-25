import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("pocket-watcher.db");

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

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

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

export function getSyncCursor(): string {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM sync_state WHERE key = 'last_synced_at'"
  );
  return row?.value ?? new Date(0).toISOString();
}

export function setSyncCursor(value: string) {
  db.runSync(
    "INSERT INTO sync_state (key, value) VALUES ('last_synced_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    value
  );
}
