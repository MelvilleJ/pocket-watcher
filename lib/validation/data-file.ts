import * as z from "zod";
import { DEPO_ICONS, DEPO_KIND_VALUES } from "@/lib/depos";

const MAX_RECORDS = 10_000;
const MAX_AMOUNT = 1_000_000_000;

const date = z
  .string()
  .max(60)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), { error: "Invalid date" });

const nullableDate = date.nullable().optional().transform((value) => (value ? new Date(value) : null));

// The DB stores money as numeric(12,2); exports serialize it as strings. Accept both.
const amount = z
  .union([
    z.string().regex(/^-?\d+(\.\d{1,2})?$/),
    z.number().finite().min(-MAX_AMOUNT).max(MAX_AMOUNT),
  ])
  .transform((value) => Number(value).toFixed(2));

const rate = (scale: number) =>
  z
    .union([
      z.string().regex(new RegExp(`^-?\\d+(\\.\\d{1,${scale}})?$`)),
      z.number().finite().min(-10).max(10),
    ])
    .transform((value) => Number(value).toFixed(scale));

const name = z.string().trim().min(1).max(80);
const optionalText = (max: number) => z.string().max(max).nullable().optional().transform((v) => v ?? null);
const bool = z.boolean().optional().transform((v) => v ?? false);
const clientId = z.uuid();

const namedList = z.object({ name, isArchived: bool });

const budgetLineKind = z.enum(["income", "expense", "debt", "goal", "subscription"]);

export const DataFileSchema = z.object({
  app: z.literal("pocket-watcher"),
  exportVersion: z.literal(1),
  exportedAt: date.optional(),
  user: z.object({
    name,
    email: z.string().min(1).max(255),
    currency: z.string().min(1).max(8),
    savingsRate: rate(3),
  }),
  expenseCategories: z.array(namedList).max(MAX_RECORDS),
  incomeSources: z.array(namedList).max(MAX_RECORDS),
  depos: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        kind: z.enum(DEPO_KIND_VALUES),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        icon: z.enum(DEPO_ICONS),
        openingBalance: amount,
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  depoTransfers: z
    .array(
      z.object({
        fromDepoClientId: clientId,
        toDepoClientId: clientId,
        date,
        amount,
        fee: amount.optional(),
        description: optionalText(500),
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  income: z
    .array(
      z.object({
        date,
        appliedMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable().optional(),
        sourceName: name,
        depoClientId: clientId.nullable().optional(),
        description: optionalText(500),
        amount,
        notes: optionalText(2000),
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  expenses: z
    .array(
      z.object({
        date,
        categoryName: name,
        depoClientId: clientId.nullable().optional(),
        subscriptionClientId: clientId.nullable().optional(),
        description: optionalText(500),
        amount,
        paid: bool,
        notes: optionalText(2000),
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  subscriptions: z
    .array(
      z.object({
        name,
        categoryName: name,
        billingCycle: z.enum(["weekly", "fortnightly", "monthly", "quarterly", "half_yearly", "yearly"]),
        billedAmount: amount,
        startDate: date,
        endDate: nullableDate,
        status: z.enum(["active", "cancelled"]).optional(),
        paymentsTrackedFrom: date.optional(),
        notes: optionalText(2000),
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  debts: z
    .array(
      z.object({
        name,
        lenderType: optionalText(60),
        originalAmount: amount,
        interestRate: rate(4),
        minMonthlyPayment: amount,
        notes: optionalText(2000),
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  debtPayments: z
    .array(
      z.object({
        debtClientId: clientId,
        date,
        description: optionalText(500),
        amount,
        notes: optionalText(2000),
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  goals: z
    .array(
      z.object({
        name,
        targetAmount: amount,
        currentSaved: amount.optional(),
        minMonthlyContribution: amount,
        notes: optionalText(2000),
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  goalPayments: z
    .array(
      z.object({
        goalClientId: clientId,
        date,
        description: optionalText(500),
        amount,
        notes: optionalText(2000),
        clientId,
        deletedAt: nullableDate,
      })
    )
    .max(MAX_RECORDS),
  budgets: z
    .array(
      z.object({
        year: z.number().int().min(2000).max(9999),
        month: z.number().int().min(1).max(12),
        status: z.enum(["draft", "locked"]),
        lockedAt: nullableDate,
        lines: z
          .array(
            z.object({
              kind: budgetLineKind,
              label: z.string().min(1).max(120),
              plannedAmount: amount,
            })
          )
          .max(2000)
          .optional(),
      })
    )
    .max(1200),
});

export type DataFile = z.infer<typeof DataFileSchema>;
