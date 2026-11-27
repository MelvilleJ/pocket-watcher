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
import { relations, sql } from "drizzle-orm";

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
  "export",
  "import",
  "account_deletion",
]);

export const sourceEnum = pgEnum("change_source", ["web", "mobile"]);

export const budgetStatusEnum = pgEnum("budget_status", ["draft", "locked"]);

export const budgetLineKindEnum = pgEnum("budget_line_kind", [
  "income",
  "expense",
  "debt",
  "goal",
  "subscription",
]);

export const depoKindEnum = pgEnum("depo_kind", [
  "cash",
  "bank",
  "credit_union",
  "wallet",
  "other",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("TT$"),
  savingsRate: numeric("savings_rate", { precision: 4, scale: 3 }).notNull().default("0.20"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("users_email_idx").on(t.email)]);

// Better Auth tables. Property names must match Better Auth's field names; columns stay snake_case.
export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("auth_sessions_token_idx").on(t.token), index("auth_sessions_user_idx").on(t.userId)]);

export const authAccounts = pgTable("auth_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("auth_accounts_user_idx").on(t.userId)]);

export const authVerifications = pgTable("auth_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("auth_verifications_identifier_idx").on(t.identifier)]);

export const authPasskeys = pgTable("auth_passkeys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name"),
  publicKey: text("public_key").notNull(),
  credentialID: text("credential_id").notNull(),
  counter: integer("counter").notNull(),
  deviceType: text("device_type").notNull(),
  backedUp: boolean("backed_up").notNull(),
  transports: text("transports"),
  aaguid: text("aaguid"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [index("auth_passkeys_user_idx").on(t.userId), uniqueIndex("auth_passkeys_credential_idx").on(t.credentialID)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Nullable + SET NULL so the account-deletion record survives the user row being wiped.
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
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

export const depos = pgTable("depos", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: depoKindEnum("kind").notNull().default("bank"),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  ...syncColumns,
}, (t) => [
  index("depos_user_idx").on(t.userId),
  uniqueIndex("depos_client_idx").on(t.userId, t.clientId),
  uniqueIndex("depos_user_name_idx").on(t.userId, t.name).where(sql`${t.deletedAt} is null`),
]);

export const depoTransfers = pgTable("depo_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fromDepoId: uuid("from_depo_id").notNull().references(() => depos.id, { onDelete: "cascade" }),
  toDepoId: uuid("to_depo_id").notNull().references(() => depos.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 12, scale: 2 }).notNull().default("0"),
  description: text("description"),
  ...syncColumns,
}, (t) => [
  index("depo_transfers_user_date_idx").on(t.userId, t.date),
  uniqueIndex("depo_transfers_client_idx").on(t.userId, t.clientId),
]);

export const income = pgTable("income", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  appliedMonth: text("applied_month"),
  sourceId: uuid("source_id").references(() => incomeSources.id, { onDelete: "set null" }),
  sourceName: text("source_name").notNull(),
  depoId: uuid("depo_id").references(() => depos.id, { onDelete: "set null" }),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  ...syncColumns,
}, (t) => [
  index("income_user_date_idx").on(t.userId, t.date),
  index("income_user_applied_month_idx").on(t.userId, t.appliedMonth),
  index("income_depo_idx").on(t.depoId),
  uniqueIndex("income_client_idx").on(t.userId, t.clientId),
]);

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  categoryName: text("category_name").notNull(),
  depoId: uuid("depo_id").references(() => depos.id, { onDelete: "set null" }),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paid: boolean("paid").notNull().default(true),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  notes: text("notes"),
  ...syncColumns,
}, (t) => [
  index("expenses_user_date_idx").on(t.userId, t.date),
  index("expenses_depo_idx").on(t.depoId),
  uniqueIndex("expenses_client_idx").on(t.userId, t.clientId),
  uniqueIndex("expenses_subscription_date_idx").on(t.subscriptionId, t.date),
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
  // Charges dated before this are generated as already paid, so backfilled history isn't left unconfirmed.
  paymentsTrackedFrom: timestamp("payments_tracked_from", { withTimezone: true }).notNull().defaultNow(),
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

export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: numeric("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentSaved: numeric("current_saved", { precision: 12, scale: 2 }).notNull().default("0"),
  minMonthlyContribution: numeric("min_monthly_contribution", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  clientId: uuid("client_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [
  index("goals_user_idx").on(t.userId),
  uniqueIndex("goals_client_idx").on(t.userId, t.clientId),
  uniqueIndex("goals_user_name_idx").on(t.userId, t.name),
]);

export const goalPayments = pgTable("goal_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  ...syncColumns,
}, (t) => [
  index("goal_payments_user_idx").on(t.userId),
  index("goal_payments_goal_idx").on(t.goalId),
  uniqueIndex("goal_payments_client_idx").on(t.userId, t.clientId),
]);

export const goalsRelations = relations(goals, ({ many }) => ({
  payments: many(goalPayments),
}));
export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  budget: one(budgets, { fields: [budgetLines.budgetId], references: [budgets.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(authSessions),
  income: many(income),
  expenses: many(expenses),
  subscriptions: many(subscriptions),
  debts: many(debts),
  goals: many(goals),
  depos: many(depos),
}));

export const debtsRelations = relations(debts, ({ many }) => ({
  payments: many(debtPayments),
}));

export const debtPaymentsRelations = relations(debtPayments, ({ one }) => ({
  debt: one(debts, { fields: [debtPayments.debtId], references: [debts.id] }),
}));

export const goalPaymentsRelations = relations(goalPayments, ({ one }) => ({
  goal: one(goals, { fields: [goalPayments.goalId], references: [goals.id] }),
}));

export const aiProviderEnum = pgEnum("ai_provider", ["anthropic", "openai", "google", "openrouter", "local"]);
export const entryKindEnum = pgEnum("entry_kind", ["expense", "income"]);
export const inboundEmailSourceEnum = pgEnum("inbound_email_source", ["paste", "forward", "mailbox"]);
export const inboundEmailStatusEnum = pgEnum("inbound_email_status", ["parsed", "unmatched", "failed", "skipped"]);
export const templateOutcomeEnum = pgEnum("template_outcome", ["transaction", "declined"]);
export const pendingStatusEnum = pgEnum("pending_status", ["pending", "approved", "dismissed"]);
export const parseMethodEnum = pgEnum("parse_method", ["template", "ai"]);

export const aiSettings = pgTable("ai_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: aiProviderEnum("provider").notNull(),
  model: text("model").notNull(),
  baseUrl: text("base_url"),
  encryptedKey: text("encrypted_key").notNull(),
  keyLast4: text("key_last4").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("ai_settings_user_idx").on(t.userId)]);

export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  last4: text("last4").notNull(),
  name: text("name").notNull(),
  depoId: uuid("depo_id").references(() => depos.id, { onDelete: "set null" }),
  declineFee: numeric("decline_fee", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("cards_user_last4_idx").on(t.userId, t.last4)]);

// What the user has approved for a merchant before, keyed by merchantKey() so changing reference codes still match.
export const merchantRules = pgTable("merchant_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: entryKindEnum("kind").notNull(),
  merchantKey: text("merchant_key").notNull(),
  displayName: text("display_name"),
  categoryName: text("category_name").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("merchant_rules_user_key_idx").on(t.userId, t.kind, t.merchantKey)]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  deviceName: text("device_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint), index("push_subscriptions_user_idx").on(t.userId)]);

// Server-generated values that must stay stable across restarts, e.g. the web push (VAPID) key pair.
export const appSecrets = pgTable("app_secrets", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mailboxConnections = pgTable("mailbox_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(993),
  encryptedPassword: text("encrypted_password").notNull(),
  folder: text("folder").notNull().default("INBOX"),
  extraSenders: text("extra_senders").notNull().default(""),
  // IMAP UIDs are only meaningful within one UIDVALIDITY; a change means the folder was rebuilt.
  uidValidity: text("uid_validity"),
  lastUid: integer("last_uid"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("mailbox_connections_user_idx").on(t.userId)]);

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: entryKindEnum("kind").notNull(),
  senderPattern: text("sender_pattern").notNull(),
  subjectPattern: text("subject_pattern"),
  outcome: templateOutcomeEnum("outcome").notNull().default("transaction"),
  // Newline-separated phrases that must all appear in the body, e.g. "was declined".
  mustContain: text("must_contain").notNull().default(""),
  rules: jsonb("rules").notNull(),
  defaultDepoId: uuid("default_depo_id").references(() => depos.id, { onDelete: "set null" }),
  defaultCategoryName: text("default_category_name"),
  autoApprove: boolean("auto_approve").notNull().default(false),
  matchCount: integer("match_count").notNull().default(0),
  failCount: integer("fail_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("email_templates_user_idx").on(t.userId)]);

export const inboundEmails = pgTable("inbound_emails", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  messageId: text("message_id").notNull(),
  source: inboundEmailSourceEnum("source").notNull(),
  fromAddress: text("from_address").notNull().default(""),
  subject: text("subject").notNull().default(""),
  // Nulled by the retention purge; the parsed result lives on in pending_transactions.
  body: text("body"),
  status: inboundEmailStatusEnum("status").notNull(),
  templateId: uuid("template_id").references(() => emailTemplates.id, { onDelete: "set null" }),
  error: text("error"),
  // Set when reading failed only because the AI was unreachable; the poller retries until then.
  aiRetryUntil: timestamp("ai_retry_until", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("inbound_emails_message_idx").on(t.userId, t.messageId),
  index("inbound_emails_user_received_idx").on(t.userId, t.receivedAt),
]);

export const pendingTransactions = pgTable("pending_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  inboundEmailId: uuid("inbound_email_id").notNull().references(() => inboundEmails.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").references(() => emailTemplates.id, { onDelete: "set null" }),
  kind: entryKindEnum("kind").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  categoryName: text("category_name"),
  depoId: uuid("depo_id").references(() => depos.id, { onDelete: "set null" }),
  parseMethod: parseMethodEnum("parse_method").notNull(),
  originalDescription: text("original_description"),
  categorySource: text("category_source"),
  aiCategoryTried: boolean("ai_category_tried").notNull().default(false),
  possibleDuplicate: boolean("possible_duplicate").notNull().default(false),
  status: pendingStatusEnum("status").notNull().default("pending"),
  createdEntityId: uuid("created_entity_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (t) => [index("pending_transactions_user_status_idx").on(t.userId, t.status)]);
