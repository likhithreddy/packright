import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/profile';
import ProfileView from '@/components/features/profile/profile-view';

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const profile = await getProfile();

  if (!profile) {
    redirect('/onboarding');
  }

  return (
    <ProfileView
      profile={profile}
      email={user.email || ''}
      providers={user.app_metadata?.providers || []}
    />
  );
}
