import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { Trip } from '@/types/database.types';
import { NewTripInput } from '@/types/new-trip.schema';

/**
 * Fetches all trips that the user has access to.
 * Thanks to RLS policies, this will only return trips where the user is a member
 * or the creator.
 */
export async function getUserTrips(
  supabase: SupabaseClient
): Promise<{ data: Trip[] | null; error: PostgrestError | Error | null | unknown }> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('date_start', { ascending: true });

    if (error) {
      return { data: [], error };
    }

    return { data: data as Trip[], error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Creates a new trip and securely adds the creator as an admin member.
 */
export async function createTrip(
  supabase: SupabaseClient,
  input: NewTripInput,
  userId: string
): Promise<{ data: Trip | null; error: PostgrestError | Error | null | unknown }> {
  try {
    // 1. Insert the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        title: input.title,
        destination: input.destination,
        date_start: input.dateRange.from.toISOString(),
        date_end: input.dateRange.to.toISOString(),
        created_by: userId,
        is_archived: false,
      })
      .select()
      .single();

    if (tripError) {
      return { data: null, error: tripError };
    }

    // 2. Insert the creator as an admin member
    const { error: memberError } = await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: userId,
      role: 'admin',
    });

    if (memberError) {
      // Note: In a production heavily reliant on strict consistency,
      // you might delete the trip if the member insertion failed to prevent orphans.
      // But typically, the creator retains RLS control and can delete it or retry joining.
      return { data: trip as Trip, error: memberError };
    }

    // 3. Bulk insert mocked AI items if provided
    if (input.items && input.items.length > 0) {
      const itemsToInsert = input.items.map((itemName) => ({
        trip_id: trip.id,
        name: itemName,
        required_count: 1,
        category: 'Essentials',
        status: 'needed',
      }));

      const { error: itemsError } = await supabase.from('items').insert(itemsToInsert);
      if (itemsError) {
        console.error('Failed to auto-insert trip items:', itemsError);
        // We don't fail the whole trip creation if item suggestions fail
      }
    }

    return { data: trip as Trip, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}
