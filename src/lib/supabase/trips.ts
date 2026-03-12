import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { Trip } from '@/types/database.types';
import { NewTripInput } from '@/types/new-trip.schema';
import { Trip, Item } from '@/types/database.types';

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
 * Batch inserts packing items for a specific trip.
 */
export async function createTripItems(
  supabase: SupabaseClient,
  items: Omit<Item, 'id' | 'created_at'>[]
): Promise<{ data: Item[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase.from('items').insert(items).select();

  return { data: data as Item[], error };
}
