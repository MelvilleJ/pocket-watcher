import { syncAllMailboxes } from "@/lib/email/mailbox";
import { runAllAiCatchUps } from "@/lib/email/ai-catchup";

const INTERVAL_MS = 5 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 30 * 1000;

// Stored on globalThis so dev-server reloads don't start a second timer in the same process.
const state = globalThis as typeof globalThis & { __mailboxPoller?: NodeJS.Timeout };

export function startMailboxPolling() {
  if (state.__mailboxPoller) return;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await syncAllMailboxes();
      await runAllAiCatchUps();
    } catch (error) {
      console.error("Mailbox polling failed", error);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, FIRST_RUN_DELAY_MS);
  state.__mailboxPoller = setInterval(tick, INTERVAL_MS);
}
