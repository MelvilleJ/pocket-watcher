import * as z from "zod";

const amount = z.coerce.number().min(0).max(100_000_000);
const dateStr = z.string().min(1, { error: "Date is required." });

export const IncomeSchema = z.object({
  date: dateStr,
  sourceName: z.string().min(1, { error: "Source is required." }),
  description: z.string().optional(),
  amount,
  notes: z.string().optional(),
});

export const ExpenseSchema = z.object({
  date: dateStr,
  categoryName: z.string().min(1, { error: "Category is required." }),
  description: z.string().optional(),
  amount,
  paid: z.coerce.boolean().optional(),
  notes: z.string().optional(),
});

export const SubscriptionSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }),
  categoryName: z.string().min(1, { error: "Category is required." }),
  billingCycle: z.enum([
    "weekly",
    "fortnightly",
    "monthly",
    "quarterly",
    "half_yearly",
    "yearly",
  ]),
  billedAmount: amount,
  startDate: dateStr,
  endDate: z.string().optional(),
  status: z.enum(["active", "cancelled"]).default("active"),
  notes: z.string().optional(),
});

export const DebtSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }),
  lenderType: z.string().optional(),
  originalAmount: amount,
  interestRate: z.coerce.number().min(0).max(1),
  minMonthlyPayment: amount,
  notes: z.string().optional(),
});

export const DebtPaymentSchema = z.object({
  debtId: z.string().min(1),
  date: dateStr,
  description: z.string().optional(),
  amount,
  notes: z.string().optional(),
});

export type FormState =
  | { error: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export const GoalSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }),
  targetAmount: amount,
  currentSaved: amount.optional(),
  minMonthlyContribution: amount.optional(),
  notes: z.string().optional(),
});

export const GoalPaymentSchema = z.object({
  goalId: z.string().min(1),
  date: dateStr,
  description: z.string().optional(),
  amount: z.coerce.number().positive().max(100_000_000),
  notes: z.string().optional(),
});
