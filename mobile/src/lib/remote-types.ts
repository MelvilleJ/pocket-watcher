export type MonthTotals = {
  income: number;
  expenses: number;
  subscriptions: number;
  debtPayments: number;
  totalOut: number;
  net: number;
};

export type SummaryResponse = {
  year: number;
  monthIndex: number;
  savingsRate: number;
  selected: MonthTotals;
  ytd: MonthTotals;
  months: { monthIndex: number; income: number; expenses: number; subscriptions: number; debtPayments: number }[];
  categories: { category: string; value: number }[];
  outstandingDebt: number;
  depos: { id: string; name: string; kind: string; color: string; icon: string; balance: number }[];
};

export type CalendarDay = {
  day: number;
  income: number;
  expenses: number;
  subscriptions: number;
  debtPayments: number;
  goalPayments: number;
};

export type CalendarMonth = {
  monthIndex: number;
  income: number;
  expenses: number;
  subscriptions: number;
  debtPayments: number;
  goalPayments: number;
  totalOut: number;
  net: number;
  days: CalendarDay[];
};

export type CalendarResponse = { year: number; years: number[]; months: CalendarMonth[] };

export type BudgetLine = { id: string; label: string; plannedAmount: number; actual: number; monthlyCost?: number };

export type BudgetResponse = {
  budget: { id: string; year: number; monthIndex: number; status: "draft" | "locked"; isLocked: boolean };
  lines: {
    income: BudgetLine[];
    expenses: BudgetLine[];
    subscriptions: BudgetLine[];
    debts: BudgetLine[];
    goals: BudgetLine[];
  };
  totals: {
    plannedIncome: number;
    plannedExpense: number;
    plannedSubscriptions: number;
    plannedDebt: number;
    plannedGoals: number;
    actualIncome: number;
    actualExpense: number;
    actualSubscriptions: number;
    actualDebt: number;
    actualGoals: number;
  };
};

export type AuditLog = {
  id: string;
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  before: unknown;
  after: unknown;
  source: "web" | "mobile";
  createdAt: string;
};

export type SessionInfo = {
  id: string;
  deviceName: string | null;
  platform: "web" | "mobile";
  lastUsedAt: string;
  active: boolean;
  current: boolean;
};
