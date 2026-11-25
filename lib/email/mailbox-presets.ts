export type MailboxPreset = {
  name: string;
  host: string;
  port: number;
  appPasswordUrl?: string;
  unsupported?: string;
};

const GMAIL: MailboxPreset = {
  name: "Gmail",
  host: "imap.gmail.com",
  port: 993,
  appPasswordUrl: "https://myaccount.google.com/apppasswords",
};
const YAHOO: MailboxPreset = {
  name: "Yahoo Mail",
  host: "imap.mail.yahoo.com",
  port: 993,
  appPasswordUrl: "https://login.yahoo.com/account/security",
};
const ICLOUD: MailboxPreset = {
  name: "iCloud Mail",
  host: "imap.mail.me.com",
  port: 993,
  appPasswordUrl: "https://account.apple.com/account/manage",
};
const OUTLOOK: MailboxPreset = {
  name: "Outlook",
  host: "outlook.office365.com",
  port: 993,
  unsupported:
    "Outlook, Hotmail and Live accounts no longer allow app passwords, so they can't be connected. Forward your bank alerts to a Gmail account and connect that instead.",
};

const BY_DOMAIN: Record<string, MailboxPreset> = {
  "gmail.com": GMAIL,
  "googlemail.com": GMAIL,
  "yahoo.com": YAHOO,
  "ymail.com": YAHOO,
  "icloud.com": ICLOUD,
  "me.com": ICLOUD,
  "mac.com": ICLOUD,
  "outlook.com": OUTLOOK,
  "hotmail.com": OUTLOOK,
  "live.com": OUTLOOK,
  "msn.com": OUTLOOK,
};

export function presetForEmail(email: string): MailboxPreset | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  return (domain && BY_DOMAIN[domain]) || null;
}

export function parseSenderList(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,;]/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length >= 3)
    ),
  ];
}
