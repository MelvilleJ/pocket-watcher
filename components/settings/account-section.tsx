import { requireUser } from "@/lib/auth/dal";
import { SettingsForm } from "@/components/forms/settings-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { getVapidKeys } from "@/lib/push/keys";
import { NotificationsCard } from "@/components/settings/notifications-card";

export async function AccountSection() {
  const user = await requireUser();
  const [{ publicKey }, devices] = await Promise.all([
    getVapidKeys(),
    db
      .select({ id: pushSubscriptions.id, deviceName: pushSubscriptions.deviceName, endpoint: pushSubscriptions.endpoint })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id)),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Profile</h2>
        <SettingsForm name={user.name} currency={user.currency} savingsRate={Number(user.savingsRate)} />
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Appearance</h2>
        <ThemeToggle />
      </section>

      <NotificationsCard publicKey={publicKey} devices={devices} />
    </div>
  );
}
