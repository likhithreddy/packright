import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { Trip, Item } from '@/types/database.types';
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
 * Fetches a single trip by ID.
 */
export async function getTrip(
  supabase: SupabaseClient,
  tripId: string
): Promise<{ data: Trip | null; error: PostgrestError | Error | null }> {
  try {
    const { data, error } = await supabase.from('trips').select('*').eq('id', tripId).single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as Trip, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Creates a new trip and securely adds the creator as an admin member.
 */
export async function createTrip(
  supabase: SupabaseClient,
  input: NewTripInput,
  userId: string
): Promise<{
  data: Trip | null;
  error: PostgrestError | Error | null | unknown;
  warning?: string | null;
}> {
  try {
    // 1. Insert the trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        title: input.title,
        destination: input.destination,
        date_start: input.dateRange.from.toISOString().split('T')[0],
        date_end: input.dateRange.to.toISOString().split('T')[0],
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

    let itemsWarning = null;
    // 3. Bulk insert AI items if provided
    if (input.items && input.items.length > 0) {
      const itemsToInsert = input.items.map((item) => {
        if (typeof item === 'string') {
          return {
            trip_id: trip.id,
            name: item,
            required_count: 1,
            category: 'Essentials',
          };
        }
        return {
          trip_id: trip.id,
          name: item.name,
          required_count: item.quantity || 1,
          category: item.category || 'Essentials',
        };
      });

      const { error: itemsError } = await supabase.from('items').insert(itemsToInsert);
      if (itemsError) {
        console.error('Failed to auto-insert trip items:', itemsError);
        itemsWarning =
          "Trip created, but we couldn't fetch AI suggestions. You can add items manually later.";
      }
    }

    return { data: trip as Trip, error: null, warning: itemsWarning };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Batch inserts packing items for a specific trip.
 */
export async function createTripItems(
  supabase: SupabaseClient,
  items: Omit<Item, 'id' | 'created_at'>[]
): Promise<{ data: Item[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase.from('items').insert(items).select();

  return { data: data as Item[], error };
}
