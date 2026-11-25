export const SETTINGS_SECTIONS = [
  { slug: "account", label: "Account", href: "/dashboard/settings/account" },
  { slug: "email-import", label: "Email import", href: "/dashboard/settings/email-import" },
  { slug: "ai", label: "AI", href: "/dashboard/settings/ai" },
  { slug: "data", label: "Privacy & data", href: "/dashboard/settings/data" },
] as const;

export type SettingsSlug = (typeof SETTINGS_SECTIONS)[number]["slug"];
