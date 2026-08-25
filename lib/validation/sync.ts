import * as z from "zod";

const base = {
  clientId: z.string().uuid(),
  deleted: z.boolean().optional(),
};

export const SyncIncomeSchema = z.object({
  ...base,
  date: z.string(),
  sourceName: z.string(),
  description: z.string().nullable().optional(),
  amount: z.number(),
  notes: z.string().nullable().optional(),
});

export const SyncExpenseSchema = z.object({
  ...base,
  date: z.string(),
  categoryName: z.string(),
  description: z.string().nullable().optional(),
  amount: z.number(),
  paid: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export const SyncSubscriptionSchema = z.object({
  ...base,
  name: z.string(),
  categoryName: z.string(),
  billingCycle: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "half_yearly", "yearly"]),
  billedAmount: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  status: z.enum(["active", "cancelled"]).optional(),
  notes: z.string().nullable().optional(),
});

export const SyncDebtSchema = z.object({
  ...base,
  name: z.string(),
  lenderType: z.string().nullable().optional(),
  originalAmount: z.number(),
  interestRate: z.number(),
  minMonthlyPayment: z.number(),
  notes: z.string().nullable().optional(),
});

export const SyncDebtPaymentSchema = z.object({
  ...base,
  debtClientId: z.string().uuid(),
  date: z.string(),
  description: z.string().nullable().optional(),
  amount: z.number(),
  notes: z.string().nullable().optional(),
});

export const SyncPushSchema = z.object({
  income: z.array(SyncIncomeSchema).optional(),
  expenses: z.array(SyncExpenseSchema).optional(),
  subscriptions: z.array(SyncSubscriptionSchema).optional(),
  debts: z.array(SyncDebtSchema).optional(),
  debtPayments: z.array(SyncDebtPaymentSchema).optional(),
});
