import { PageHero } from "@/components/page-hero";
import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHero title="Settings" description="Account, email import, AI and data." />
      <SettingsNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
