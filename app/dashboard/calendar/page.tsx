import { requireUser } from "@/lib/auth/dal";
import { getCalendarMonths } from "@/lib/queries/calendar";
import { MonthCalendarViewer } from "@/components/month-calendar-viewer";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const year = params.year ? Number(params.year) : new Date().getFullYear();
  const months = await getCalendarMonths(user.id, year);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Calendar</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Review daily cash activity, then compare the months that matter.</p>
        </div>
      </div>
      <MonthCalendarViewer year={year} currency={user.currency} months={months} />
    </div>
  );
}
