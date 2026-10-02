import * as z from "zod";
import { DEPO_ICONS, DEPO_KIND_VALUES } from "@/lib/depos";
import { DEBT_TYPES } from "@/lib/debts";

const amount = z.coerce.number().min(0).max(100_000_000);
const dateStr = z.string().min(1, { error: "Date is required." });
const optionalDepoId = z
  .string()
  .optional()
  .transform((value) => value || null);

export const IncomeSchema = z.object({
  date: dateStr,
  appliedMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "Select the month this income applies to." }),
  sourceName: z.string().min(1, { error: "Source is required." }),
  depoId: optionalDepoId,
  description: z.string().optional(),
  amount,
  notes: z.string().optional(),
});

export const ExpenseSchema = z.object({
  date: dateStr,
  categoryName: z.string().min(1, { error: "Category is required." }),
  depoId: optionalDepoId,
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
  lenderType: z.union([z.enum(DEBT_TYPES), z.literal("")]).optional(),
  originalAmount: amount,
  interestRatePercent: z.coerce.number().min(0).max(100),
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

export const DepoSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }).max(60),
  kind: z.enum(DEPO_KIND_VALUES),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Pick a colour." }),
  icon: z.enum(DEPO_ICONS),
  openingBalance: z.coerce.number().min(-100_000_000).max(100_000_000).default(0),
});

export const TransferSchema = z
  .object({
    date: dateStr,
    fromDepoId: z.string().min(1, { error: "Choose where the money leaves." }),
    toDepoId: z.string().min(1, { error: "Choose where the money lands." }),
    amount: z.coerce.number().positive().max(100_000_000),
    fee: z.coerce.number().min(0, { error: "Fee can't be negative." }).max(100_000_000).default(0),
    description: z.string().optional(),
  })
  .refine((t) => t.fromDepoId !== t.toDepoId, {
    error: "Pick two different depos.",
    path: ["toDepoId"],
  });
