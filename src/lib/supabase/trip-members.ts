import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { TripMember } from '@/types/database.types';
import { Profile } from '@/types/profile.types';

/**
 * Result type for trip members with their profile data
 */
export type TripMemberWithProfile = TripMember & {
  profile: Profile;
};

/**
 * Searches for users by username or full name using the secure RPC function.
 * Requires minimum 3 characters and returns up to 10 results.
 *
 * @param supabase - Supabase client instance
 * @param searchQuery - The search term (username or full name)
 * @returns Array of matching profiles or error
 */
export async function searchUsersByUsername(
  supabase: SupabaseClient,
  searchQuery: string
): Promise<{ data: Profile[] | null; error: PostgrestError | null }> {
  const trimmedQuery = searchQuery.trim();

  // Enforce minimum 3 character requirement
  if (trimmedQuery.length < 3) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase.rpc('search_users_by_username', {
      search_query: trimmedQuery,
    });

    if (error) {
      return { data: null, error };
    }

    return { data: data as Profile[], error: null };
  } catch (err) {
    console.error('Error in searchUsersByUsername:', err);
    return { data: null, error: err as PostgrestError };
  }
}

/**
 * Fetches all members of a trip with their profile data.
 * Uses RLS to ensure user has access to the trip.
 *
 * @param supabase - Supabase client instance
 * @param tripId - The trip ID
 * @returns Array of trip members with profile data or error
 */
export async function getTripMembers(
  supabase: SupabaseClient,
  tripId: string
): Promise<{
  data: TripMemberWithProfile[] | null;
  error: PostgrestError | Error | null | unknown;
}> {
  try {
    const { data, error } = await supabase
      .from('trip_members')
      .select(
        `
        *,
        profile:profiles (*)
      `
      )
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error };
    }

    // Filter out members without profiles (shouldn't happen with valid RLS)
    const filteredData = data?.filter((m) => m.profile !== null) || null;
    return { data: filteredData as TripMemberWithProfile[] | null, error: null };
  } catch (err) {
    console.error('Error in getTripMembers:', err);
    return { data: null, error: err };
  }
}

/**
 * Checks if the current user is an admin of the specified trip.
 * Uses the existing RPC function `is_admin_of`.
 *
 * @param supabase - Supabase client instance
 * @param tripId - The trip ID
 * @returns True if user is admin, false otherwise
 */
export async function isTripAdmin(
  supabase: SupabaseClient,
  tripId: string
): Promise<{ isAdmin: boolean | null; error: PostgrestError | null }> {
  try {
    const { data, error } = await supabase.rpc('is_admin_of', {
      trip_uuid: tripId,
    });

    if (error) {
      return { isAdmin: null, error };
    }

    return { isAdmin: data as boolean, error: null };
  } catch (err) {
    console.error('Error in isTripAdmin:', err);
    return { isAdmin: null, error: err as PostgrestError };
  }
}

/**
 * Invites a user to a trip by adding them as a member with 'member' role.
 * Note: This is an immediate addition (no acceptance flow required).
 *
 * @param supabase - Supabase client instance
 * @param tripId - The trip ID
 * @param userId - The user ID to invite
 * @returns The created trip member record or error
 */
export async function inviteTripMember(
  supabase: SupabaseClient,
  tripId: string,
  userId: string
): Promise<{
  data: TripMember | null;
  error: PostgrestError | Error | null | unknown;
}> {
  try {
    const { data, error } = await supabase
      .from('trip_members')
      .insert({
        trip_id: tripId,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as TripMember, error: null };
  } catch (err) {
    console.error('Error in inviteTripMember:', err);
    return { data: null, error: err };
  }
}

/**
 * Removes a member from a trip.
 * Only admins should be able to call this function (enforced at action layer).
 *
 * @param supabase - Supabase client instance
 * @param tripId - The trip ID
 * @param userId - The user ID to remove
 * @returns Success or error
 */
export async function removeTripMember(
  supabase: SupabaseClient,
  tripId: string,
  userId: string
): Promise<{ error: PostgrestError | Error | null | unknown }> {
  try {
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);

    if (error) {
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Error in removeTripMember:', err);
    return { error: err };
  }
}
