import { requireUser } from "@/lib/auth/dal";
import { getCalendarMonths, getEarliestActivityYear } from "@/lib/queries/calendar";
import { MonthCalendarViewer } from "@/components/month-calendar-viewer";
import { PageHero } from "@/components/page-hero";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const earliestYear = Math.min(await getEarliestActivityYear(user.id), currentYear);
  const years = Array.from({ length: currentYear - earliestYear + 1 }, (_, i) => currentYear - i);

  const requestedYear = Number(params.year);
  const year = years.includes(requestedYear) ? requestedYear : currentYear;
  const months = await getCalendarMonths(user.id, year);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Calendar"
        description="Review daily cash activity, then compare the months that matter."
      />
      <MonthCalendarViewer key={year} year={year} years={years} currency={user.currency} months={months} />
    </div>
  );
}
