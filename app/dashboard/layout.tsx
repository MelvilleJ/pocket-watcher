import { requireUser } from "@/lib/auth/dal";
import { logout } from "@/lib/actions/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { MotionButton, PageTransition } from "@/components/motion-ui";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="dashboard-shell relative min-h-screen flex-1 overflow-x-hidden">
      <div className="dashboard-glow dashboard-glow-one" aria-hidden="true" />
      <div className="dashboard-glow dashboard-glow-two" aria-hidden="true" />
      <DashboardNav
        userName={user.name}
        logoutControl={
          <form action={logout}>
            <MotionButton type="submit" className="logout-button" aria-label="Log out" title="Log out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </MotionButton>
          </form>
        }
      />
      <PageTransition>{children}</PageTransition>
    </div>
  );
}
