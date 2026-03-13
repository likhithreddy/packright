'use server';

import { createClient } from '@/lib/supabase/server';
import {
  searchUsersByUsername,
  getTripMembers,
  isTripAdmin,
  inviteTripMember,
  removeTripMember,
} from '@/lib/supabase/trip-members';
import { Profile } from '@/types/profile.types';
import { TripMemberWithProfile } from '@/lib/supabase/trip-members';

/**
 * Standard action response type for all trip member actions
 */
export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Search for users by username or full name.
 * Requires minimum 3 characters.
 *
 * @param query - Search term (username or full name)
 * @returns Matching profiles or error message
 */
export async function searchUsersAction(query: string): Promise<ActionResponse<Profile[]>> {
  try {
    const trimmedQuery = query.trim();

    // Enforce 3 character minimum
    if (trimmedQuery.length < 3) {
      return {
        success: false,
        error: 'Search must be at least 3 characters',
      };
    }

    const supabase = await createClient();
    const { data, error } = await searchUsersByUsername(supabase, trimmedQuery);

    if (error) {
      console.error('RPC error in searchUsersAction:', error);
      return {
        success: false,
        error: 'Failed to search for users. Please try again.',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error('Unexpected error in searchUsersAction:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while searching.',
    };
  }
}

/**
 * Fetch all members of a trip with their profile data.
 *
 * @param tripId - The trip ID
 * @returns Trip members with profile data or error
 */
export async function getTripMembersAction(
  tripId: string
): Promise<ActionResponse<TripMemberWithProfile[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await getTripMembers(supabase, tripId);

    if (error) {
      // Log detailed error information for debugging
      type PostgrestErrorLike = {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      const errorLike = error as PostgrestErrorLike;
      const errorDetails = {
        message: errorLike.message,
        details: errorLike.details,
        hint: errorLike.hint,
        code: errorLike.code,
        keys: Object.keys(error || {}),
        stringified: JSON.stringify(error),
        isError: error instanceof Error,
      };
      console.error('Database error in getTripMembersAction:', errorDetails);
      return {
        success: false,
        error: 'Failed to load trip members. Please try again.',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err) {
    console.error('Unexpected error in getTripMembersAction:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while loading members.',
    };
  }
}

/**
 * Invite a user to a trip as a member.
 * Only trip admins can perform this action.
 *
 * @param tripId - The trip ID
 * @param userId - The user ID to invite
 * @param userFullName - Full name for toast notification
 * @returns Success with new member data or error message
 */
export async function inviteTripMemberAction(
  tripId: string,
  userId: string,
  userFullName: string
): Promise<ActionResponse<{ fullName: string }>> {
  try {
    const supabase = await createClient();

    // 1. Verify user is authenticated
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: 'You must be logged in to invite members.',
      };
    }

    // 2. Check if user is a trip admin
    const { isAdmin, error: adminCheckError } = await isTripAdmin(supabase, tripId);
    if (adminCheckError || !isAdmin) {
      return {
        success: false,
        error: 'Only trip admins can invite new members.',
      };
    }

    // 3. Attempt to add the user as a member
    const { error } = await inviteTripMember(supabase, tripId, userId);

    if (error) {
      // Check for unique constraint violation (user already a member)
      const pgError = error as { code?: string };
      if (pgError.code === '23505') {
        return {
          success: false,
          error: `${userFullName} is already a trip member.`,
        };
      }

      console.error('Database error in inviteTripMemberAction:', error);
      return {
        success: false,
        error: 'Failed to invite member. Please try again.',
      };
    }

    return {
      success: true,
      data: { fullName: userFullName },
    };
  } catch (err) {
    console.error('Unexpected error in inviteTripMemberAction:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while inviting.',
    };
  }
}

/**
 * Remove a member from a trip.
 * Only trip admins can perform this action.
 *
 * @param tripId - The trip ID
 * @param userId - The user ID to remove
 * @returns Success or error message
 */
export async function removeTripMemberAction(
  tripId: string,
  userId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = await createClient();

    // 1. Verify user is authenticated
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      return {
        success: false,
        error: 'You must be logged in to remove members.',
      };
    }

    // 2. Check if user is a trip admin
    const { isAdmin, error: adminCheckError } = await isTripAdmin(supabase, tripId);
    if (adminCheckError || !isAdmin) {
      return {
        success: false,
        error: 'Only trip admins can remove members.',
      };
    }

    // 3. Remove the member
    const { error } = await removeTripMember(supabase, tripId, userId);

    if (error) {
      console.error('Database error in removeTripMemberAction:', error);
      return {
        success: false,
        error: 'Failed to remove member. Please try again.',
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error('Unexpected error in removeTripMemberAction:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while removing member.',
    };
  }
}
