import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { listDepos } from "@/lib/queries/depos";
import { getExpenseCategories, getIncomeSources } from "@/lib/queries/lists";
import {
  getAiSettingsSummary,
  getMailboxSummary,
  listCards,
  listEmailTemplates,
  listUnreadEmails,
} from "@/lib/queries/email-import";
import { EmailImportWorkspace } from "@/components/email-import/workspace";
import { MailboxSection } from "@/components/email-import/mailbox-section";
import { CardsSection } from "@/components/email-import/cards-section";
import { parseSenderList } from "@/lib/email/mailbox-presets";
import { sectionClass } from "@/components/email-import/ui";

export default async function EmailImportPage() {
  const user = await requireUser();
  const [ai, mailbox, templates, unread, depos, categories, sources, cards] = await Promise.all([
    getAiSettingsSummary(user.id),
    getMailboxSummary(user.id),
    listEmailTemplates(user.id),
    listUnreadEmails(user.id),
    listDepos(user.id),
    getExpenseCategories(user.id),
    getIncomeSources(user.id),
    listCards(user.id),
  ]);

  const depoOptions = depos.map((d) => ({ id: d.id, name: d.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const sourceOptions = sources.map((s) => ({ id: s.id, name: s.name }));
  const templateSenders = parseSenderList(templates.map((t) => t.senderPattern).join("\n"));

  return (
    <div className="flex flex-col gap-6">

      {!ai && (
        <p className={`${sectionClass} text-sm`}>
          <Link href="/dashboard/settings/ai" className="font-medium underline">
            Connect an AI model
          </Link>{" "}
          to read emails without templates.
        </p>
      )}

      <MailboxSection
        key={mailbox ? `${mailbox.email}-${mailbox.folder}-${mailbox.extraSenders}` : "none"}
        mailbox={mailbox && { ...mailbox, lastCheckedAt: mailbox.lastCheckedAt?.toISOString() ?? null }}
        templateSenders={templateSenders}
      />

      <CardsSection
        cards={cards}
        depos={depos.map((d) => ({ id: d.id, name: d.name, color: d.color, icon: d.icon }))}
        currency={user.currency}
      />

      <EmailImportWorkspace
        unread={unread.map((e) => ({ ...e, receivedAt: e.receivedAt.toISOString() }))}
        templates={templates}
        depos={depoOptions}
        categories={categoryOptions}
        sources={sourceOptions}
        cards={cards.map((c) => ({ last4: c.last4, name: c.name, declineFee: c.declineFee }))}
        aiEnabled={Boolean(ai)}
        currency={user.currency}
      />

    </div>
  );
}
