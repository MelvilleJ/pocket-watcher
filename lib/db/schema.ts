import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const billingCycleEnum = pgEnum("billing_cycle", [
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "half_yearly",
  "yearly",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
]);

export const sourceEnum = pgEnum("change_source", ["web", "mobile"]);

export const budgetStatusEnum = pgEnum("budget_status", ["draft", "locked"]);

export const budgetLineKindEnum = pgEnum("budget_line_kind", [
  "income",
  "expense",
  "debt",
  "subscription",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("TT$"),
  savingsRate: numeric("savings_rate", { precision: 4, scale: 3 }).notNull().default("0.20"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_email_idx").on(t.email)]);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  deviceName: text("device_name"),
  platform: sourceEnum("platform").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: auditActionEnum("action").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  source: sourceEnum("source").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("audit_logs_user_idx").on(t.userId),
  index("audit_logs_entity_idx").on(t.entityType, t.entityId),
]);

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("expense_categories_user_name_idx").on(t.userId, t.name)]);

export const incomeSources = pgTable("income_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("income_sources_user_name_idx").on(t.userId, t.name)]);

const syncColumns = {
  clientId: uuid("client_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const income = pgTable("income", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  sourceId: uuid("source_id").references(() => incomeSources.id, { onDelete: "set null" }),
  sourceName: text("source_name").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  ...syncColumns,
}, (t) => [
  index("income_user_date_idx").on(t.userId, t.date),
  uniqueIndex("income_client_idx").on(t.userId, t.clientId),
]);

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  categoryName: text("category_name").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paid: boolean("paid").notNull().default(true),
  notes: text("notes"),
  ...syncColumns,
}, (t) => [
  index("expenses_user_date_idx").on(t.userId, t.date),
  uniqueIndex("expenses_client_idx").on(t.userId, t.clientId),
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  categoryName: text("category_name").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  billedAmount: numeric("billed_amount", { precision: 12, scale: 2 }).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  ...syncColumns,
}, (t) => [
  index("subscriptions_user_idx").on(t.userId),
  uniqueIndex("subscriptions_client_idx").on(t.userId, t.clientId),
]);

export const debts = pgTable("debts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  lenderType: text("lender_type"),
  originalAmount: numeric("original_amount", { precision: 12, scale: 2 }).notNull(),
  interestRate: numeric("interest_rate", { precision: 6, scale: 4 }).notNull().default("0"),
  minMonthlyPayment: numeric("min_monthly_payment", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  ...syncColumns,
}, (t) => [
  index("debts_user_idx").on(t.userId),
  uniqueIndex("debts_client_idx").on(t.userId, t.clientId),
]);

export const debtPayments = pgTable("debt_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  debtId: uuid("debt_id").notNull().references(() => debts.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  ...syncColumns,
}, (t) => [
  index("debt_payments_user_idx").on(t.userId),
  index("debt_payments_debt_idx").on(t.debtId),
  uniqueIndex("debt_payments_client_idx").on(t.userId, t.clientId),
]);

export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  status: budgetStatusEnum("status").notNull().default("draft"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("budgets_user_period_idx").on(t.userId, t.year, t.month),
]);

export const budgetLines = pgTable("budget_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  budgetId: uuid("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  kind: budgetLineKindEnum("kind").notNull(),
  label: text("label").notNull(),
  plannedAmount: numeric("planned_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("budget_lines_budget_kind_label_idx").on(t.budgetId, t.kind, t.label),
]);

export const budgetsRelations = relations(budgets, ({ many }) => ({
  lines: many(budgetLines),
}));

export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  budget: one(budgets, { fields: [budgetLines.budgetId], references: [budgets.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  income: many(income),
  expenses: many(expenses),
  subscriptions: many(subscriptions),
  debts: many(debts),
}));

export const debtsRelations = relations(debts, ({ many }) => ({
  payments: many(debtPayments),
}));

export const debtPaymentsRelations = relations(debtPayments, ({ one }) => ({
  debt: one(debts, { fields: [debtPayments.debtId], references: [debts.id] }),
}));
