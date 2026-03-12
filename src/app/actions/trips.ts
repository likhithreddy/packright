'use server';

import { createClient } from '@/lib/supabase/server';
import { createTrip } from '@/lib/supabase/trips';
import { NewTripInput, newTripSchema } from '@/types/new-trip.schema';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
};

export async function createTripAction(
  data: NewTripInput
): Promise<ActionResponse<{ tripId: string }>> {
  try {
    // 1. Validate the input using Zod
    const validationResult = newTripSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Invalid trip data provided. Please check the fields.',
      };
    }

    // 2. Initialize Supabase Server Client and verify authentication
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return {
        success: false,
        error: 'You must be logged in to create a trip.',
      };
    }

    // 3. Perform database operations via library
    const {
      data: newTrip,
      error: dbError,
      warning: dbWarning,
    } = await createTrip(supabase, validationResult.data, authData.user.id);

    if (dbError || !newTrip) {
      console.error('Database error in createTripAction:', dbError);
      return {
        success: false,
        error: 'Failed to create the trip. Please try again later.',
      };
    }

    // 4. Return success with the new trip ID and any warnings
    return {
      success: true,
      data: { tripId: newTrip.id },
      warning: dbWarning || undefined,
    };
  } catch (err) {
    console.error('Unexpected error in createTripAction:', err);
    return {
      success: false,
      error: 'An unexpected error occurred.',
    };
  }
}
