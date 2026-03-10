import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/profile';
import Navbar from '@/components/layout/navbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // ISSUE-#36: Redirect unauthenticated users to login
  if (error || !user) {
    redirect('/login');
  }

  // ISSUE-#36: Fetch the user's profile and check for a username.
  // If the user has no username set, they are soft-locked out of the dashboard
  // and must complete the onboarding flow first.
  const profile = await getProfile();

  if (!profile || !profile.username) {
    redirect('/onboarding');
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Navbar profile={profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
