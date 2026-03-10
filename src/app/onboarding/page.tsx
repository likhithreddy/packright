import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/profile';
import OnboardingForm from '@/components/features/profile/onboarding-form';

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // ISSUE-#36: Redirect unauthenticated users to login
  if (error || !user) {
    redirect('/login');
  }

  // ISSUE-#36: If the user already has a username, they don't need onboarding
  const profile = await getProfile();
  if (profile?.username) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold text-foreground">
            Welcome to <span className="text-primary italic">PackRight</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Set up your profile to start packing with friends. Your handle is how others will find
            and invite you to trips.
          </p>
        </div>

        {/* Onboarding Form Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <OnboardingForm
            userId={user.id}
            existingFullName={user.user_metadata?.full_name || null}
          />
        </div>
      </div>
    </div>
  );
}
