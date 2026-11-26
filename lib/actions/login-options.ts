"use server";

import { isEmailSendingConfigured } from "@/lib/email/sender";

// Better Auth reports success for email codes even when sending fails (so it can't reveal which emails exist),
// so the login page only offers codes once the server can actually send them.
export async function emailCodesAvailable() {
  return isEmailSendingConfigured();
}
