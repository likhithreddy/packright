import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/profile';
import Navbar from '@/components/layout/navbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Auth gating (unauthenticated users → /login) is handled by middleware.ts.
  // This component only fetches application-level data needed to render the layout.

  // ISSUE-#36: Fetch the user's profile and check for a username.
  // If the user has no username set, they must complete the onboarding flow first.
  const profile = await getProfile();

  if (!profile || !profile.username) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Navbar profile={profile} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  );
}
