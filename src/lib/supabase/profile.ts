import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/profile.types';

/**
 * Fetch the profile for the currently authenticated user (server-side).
 * Returns null if the user is not authenticated or the profile doesn't exist.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

/**
 * Fetch a profile by user ID (server-side).
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}
