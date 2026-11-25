const MAX_BODY_CHARS = 20_000;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export function htmlToText(html: string) {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? " ");
}

// Long digit runs are account or card numbers. Masking them the same way before templating and before
// parsing keeps template rules valid while keeping full numbers away from the AI provider.
export function redactAccountNumbers(text: string) {
  return text.replace(/\b\d{8,19}\b/g, (digits) => `****${digits.slice(-4)}`);
}

export function normalizeEmailBody(body: string, isHtml = /<(html|body|div|p|br|table|td|span)\b/i.test(body)) {
  const text = isHtml ? htmlToText(body) : body;
  return redactAccountNumbers(
    text
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t\u00a0]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim()
  ).slice(0, MAX_BODY_CHARS);
}

const FORWARD_MARKER = /-{2,}\s*(?:Forwarded message|Original Message)\s*-{2,}/i;

// A manual "Fwd:" puts the user in From; the bank's sender and subject live in the quoted header block.
export function unwrapForwarded(email: { fromAddress: string; subject: string; text: string }) {
  const marker = FORWARD_MARKER.exec(email.text);
  if (!marker) return email;
  const header = email.text.slice(marker.index, marker.index + 1500);
  const from = /^\s*From:\s*(.+)$/im.exec(header)?.[1]?.trim();
  const subject = /^\s*Subject:\s*(.+)$/im.exec(header)?.[1]?.trim();
  return {
    fromAddress: from || email.fromAddress,
    subject: subject || email.subject.replace(/^\s*(fwd?|fw):\s*/i, ""),
    text: email.text.slice(marker.index + marker[0].length).trim(),
  };
}
