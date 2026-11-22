import * as z from "zod";
import { DEPO_ICONS, DEPO_KIND_VALUES } from "@/lib/depos";

const MAX_RECORDS = 500;
const MAX_AMOUNT = 100_000_000;

const amount = z.number().finite().min(0).max(MAX_AMOUNT);
const date = z
  .string()
  .max(40)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), { error: "Invalid date" });
const name = z.string().trim().min(1).max(80);
const optionalText = (max: number) => z.string().max(max).nullable().optional();
const clientRef = z.uuid().nullable().optional();
const list = <T extends z.ZodType>(schema: T) => z.array(schema).max(MAX_RECORDS).optional();

const base = {
  clientId: z.uuid(),
  deleted: z.boolean().optional(),
};

export const SyncDepoSchema = z.object({
  ...base,
  name: z.string().trim().min(1).max(60),
  kind: z.enum(DEPO_KIND_VALUES),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.enum(DEPO_ICONS),
  openingBalance: z.number().finite().min(-MAX_AMOUNT).max(MAX_AMOUNT),
});

export const SyncDepoTransferSchema = z.object({
  ...base,
  fromDepoClientId: z.uuid(),
  toDepoClientId: z.uuid(),
  date,
  amount,
  fee: amount.optional(),
  description: optionalText(500),
});

export const SyncIncomeSchema = z.object({
  ...base,
  date,
  appliedMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable().optional(),
  sourceName: name,
  depoClientId: clientRef,
  description: optionalText(500),
  amount,
  notes: optionalText(2000),
});

export const SyncExpenseSchema = z.object({
  ...base,
  date,
  categoryName: name,
  depoClientId: clientRef,
  description: optionalText(500),
  amount,
  paid: z.boolean().optional(),
  notes: optionalText(2000),
});

export const SyncSubscriptionSchema = z.object({
  ...base,
  name,
  categoryName: name,
  billingCycle: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "half_yearly", "yearly"]),
  billedAmount: amount,
  startDate: date,
  endDate: date.nullable().optional(),
  status: z.enum(["active", "cancelled"]).optional(),
  notes: optionalText(2000),
});

export const SyncDebtSchema = z.object({
  ...base,
  name,
  lenderType: optionalText(60),
  originalAmount: amount,
  interestRate: z.number().finite().min(0).max(1),
  minMonthlyPayment: amount,
  notes: optionalText(2000),
});

export const SyncDebtPaymentSchema = z.object({
  ...base,
  debtClientId: z.uuid(),
  date,
  description: optionalText(500),
  amount,
  notes: optionalText(2000),
});

export const SyncGoalSchema = z.object({
  ...base,
  name,
  targetAmount: amount,
  initialSaved: amount.optional(),
  minMonthlyContribution: amount,
  notes: optionalText(2000),
});

export const SyncGoalPaymentSchema = z.object({
  ...base,
  goalClientId: z.uuid(),
  date,
  description: optionalText(500),
  amount,
  notes: optionalText(2000),
});

export const SyncPushSchema = z.object({
  depos: list(SyncDepoSchema),
  depoTransfers: list(SyncDepoTransferSchema),
  income: list(SyncIncomeSchema),
  expenses: list(SyncExpenseSchema),
  subscriptions: list(SyncSubscriptionSchema),
  debts: list(SyncDebtSchema),
  debtPayments: list(SyncDebtPaymentSchema),
  goals: list(SyncGoalSchema),
  goalPayments: list(SyncGoalPaymentSchema),
});
