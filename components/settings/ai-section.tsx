import { requireUser } from "@/lib/auth/dal";
import { getAiSettingsSummary } from "@/lib/queries/email-import";
import { isEncryptionConfigured } from "@/lib/ai/crypto";
import { AiSettingsForm } from "@/components/forms/ai-settings-form";

export async function AiSection() {
  const user = await requireUser();
  const ai = await getAiSettingsSummary(user.id);

  return (
    <section className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 p-5">
      <h2 className="mb-1 text-sm font-semibold text-zinc-700 dark:text-zinc-300">AI provider</h2>
      <p className="mb-4 text-xs text-[color:var(--muted)]">
        Reads emails your templates don&rsquo;t cover and suggests categories.
      </p>
      <AiSettingsForm current={ai} encryptionReady={isEncryptionConfigured()} />
    </section>
  );
}
