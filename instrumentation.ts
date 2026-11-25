export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMailboxPolling } = await import("@/lib/email/mailbox-poller");
    startMailboxPolling();
  }
}
