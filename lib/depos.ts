export const DEPO_KIND_VALUES = ["cash", "bank", "credit_union", "wallet", "other"] as const;

export type DepoKind = (typeof DEPO_KIND_VALUES)[number];

export const DEPO_KIND_LABELS: Record<DepoKind, string> = {
  cash: "Cash in hand",
  bank: "Bank",
  credit_union: "Credit union",
  wallet: "Digital wallet",
  other: "Other",
};

export const DEPO_ICONS = [
  "cash",
  "bank",
  "credit-union",
  "card",
  "wallet",
  "piggy",
  "safe",
  "phone",
  "coins",
  "home",
  "briefcase",
  "star",
] as const;

export type DepoIconName = (typeof DEPO_ICONS)[number];

export const DEPO_COLORS = [
  "#ff5c8d",
  "#ff8a76",
  "#f5b040",
  "#41a866",
  "#5bc0be",
  "#3b82f6",
  "#8a75e8",
  "#64748b",
];

export const DEFAULT_ICON_FOR_KIND: Record<DepoKind, DepoIconName> = {
  cash: "cash",
  bank: "bank",
  credit_union: "credit-union",
  wallet: "wallet",
  other: "piggy",
};

export function depoKindLabel(kind: string) {
  return DEPO_KIND_LABELS[kind as DepoKind] ?? kind;
}
