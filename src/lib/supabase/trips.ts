import { createClient } from '@/lib/supabase/server';
import { Trip } from '@/types/database.types';

/**
 * Fetches all trips that the user has access to.
 * Thanks to RLS policies, this will only return trips where the user is a member
 * or the creator.
 */
export async function getUserTrips(
  supabase: any
): Promise<{ data: Trip[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('date_start', { ascending: true });

    if (error) {
      // 42P01 is PostgreSQL's error code for "undefined_table" (relation does not exist)
      // Since Issue #38 (Database Schema) may not be merged yet, we gracefully return [] to allow UI testing.
      if (error.code === '42P01') {
        console.warn('Trips table does not exist yet (Issue #38). Returning empty state.');
        return { data: [], error: null };
      }

      console.error('Supabase Query Error Details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    return { data: data as Trip[], error: null };
  } catch (error: any) {
    console.error('Error fetching trips:', error?.message || error);
    return { data: null, error: error as Error };
  }
}
