import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/profile';
import OnboardingForm from '@/components/features/profile/onboarding-form';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  // Auth gating (unauthenticated users → /login) is handled by middleware.ts.

  // We need the user ID to pass to the OnboardingForm, so fetch the user here.
  // The middleware guarantees only authenticated users reach this point,
  // so the user object will always be present.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ISSUE-#36: If the user already has a username, they don't need onboarding
  const profile = await getProfile();
  if (profile?.username) {
    redirect('/dashboard');
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background overflow-hidden p-4 sm:p-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
            Almost <span className="text-primary italic">there!</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Set up your profile to start packing with friends. Your handle is how others will find
            and invite you to trips.
          </p>
        </div>

        {/* Onboarding Form Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl p-8 md:p-10">
          <OnboardingForm
            userId={user!.id}
            existingFullName={user!.user_metadata?.full_name || null}
          />
        </div>
      </div>
    </div>
  );
}
