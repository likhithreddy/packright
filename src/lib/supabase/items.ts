import { SupabaseClient, PostgrestError, RealtimeChannel } from '@supabase/supabase-js';
import { ItemWithClaims, ItemClaim } from '@/types/database.types';

/**
 * Fetches all items for a trip with their associated claims aggregated.
 * Returns items with calculated total_claimed and total_packed counts.
 */
export async function getTripItems(
  supabase: SupabaseClient,
  tripId: string
): Promise<{ data: ItemWithClaims[] | null; error: PostgrestError | Error | null }> {
  try {
    // Fetch all items for the trip
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      return { data: null, error: itemsError };
    }

    if (!items || items.length === 0) {
      return { data: [], error: null };
    }

    // Fetch all claims for these items
    const itemIds = items.map((item) => item.id);
    const { data: claims, error: claimsError } = await supabase
      .from('item_claims')
      .select('*')
      .in('item_id', itemIds);

    if (claimsError) {
      return { data: null, error: claimsError };
    }

    // Fetch profiles for all claim users
    if (claims && claims.length > 0) {
      const userIds = [...new Set(claims.map((c) => c.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_theme')
        .in('id', userIds);

      if (profilesError) {
        return { data: null, error: profilesError };
      }

      // Create a map of user_id -> profile for quick lookup
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Attach profiles to claims
      for (const claim of claims) {
        const profile = profileMap.get(claim.user_id);
        if (profile) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (claim as any).profiles = [
            {
              full_name: profile.full_name,
              username: profile.username,
              avatar_theme: profile.avatar_theme,
            },
          ];
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (claim as any).profiles = null;
        }
      }
    }

    // Aggregate claims per item
    const claimsByItemId: Record<string, ItemClaim[]> = {};
    for (const claim of claims || []) {
      if (!claimsByItemId[claim.item_id]) {
        claimsByItemId[claim.item_id] = [];
      }
      claimsByItemId[claim.item_id].push(claim);
    }

    // Build ItemWithClaims array with aggregated totals
    const itemsWithClaims: ItemWithClaims[] = items.map((item) => {
      const itemClaims = claimsByItemId[item.id] || [];
      const total_claimed = itemClaims.reduce((sum, claim) => sum + claim.quantity, 0);
      const total_packed = itemClaims
        .filter((claim) => claim.is_packed)
        .reduce((sum, claim) => sum + claim.quantity, 0);

      return {
        ...item,
        claims: itemClaims,
        total_claimed,
        total_packed,
      };
    });

    return { data: itemsWithClaims, error: null };
  } catch (err) {
    const error = err as Error & { message?: string };
    return {
      data: null,
      error: error.message ? new Error(error.message) : error,
    };
  }
}

/**
 * Creates a new item claim for a user.
 */
export async function claimItem(
  supabase: SupabaseClient,
  itemId: string,
  userId: string,
  quantity: number
): Promise<{ data: ItemClaim | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('item_claims')
    .insert({
      item_id: itemId,
      user_id: userId,
      quantity,
      is_packed: false,
    })
    .select()
    .single();

  return { data: data as ItemClaim, error };
}

/**
 * Updates an existing claim (e.g., marking as packed or changing quantity).
 */
export async function updateClaim(
  supabase: SupabaseClient,
  claimId: string,
  updates: Partial<Pick<ItemClaim, 'quantity' | 'is_packed'>>
): Promise<{ data: ItemClaim | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('item_claims')
    .update(updates)
    .eq('id', claimId)
    .select()
    .single();

  return { data: data as ItemClaim, error };
}

/**
 * Removes a claim entirely.
 */
export async function removeClaim(
  supabase: SupabaseClient,
  claimId: string
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from('item_claims').delete().eq('id', claimId);

  return { error };
}

/**
 * Updates the quantity of an existing claim.
 */
export async function updateClaimQuantity(
  supabase: SupabaseClient,
  claimId: string,
  newQuantity: number
): Promise<{ data: ItemClaim | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('item_claims')
    .update({ quantity: newQuantity })
    .eq('id', claimId)
    .select()
    .single();

  return { data: data as ItemClaim, error };
}

/**
 * Deletes an item (cascade deletes associated claims).
 */
export async function deleteItem(
  supabase: SupabaseClient,
  itemId: string
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);

  return { error };
}

/**
 * Updates an item's name, required count, and/or claim type.
 */
export async function updateItem(
  supabase: SupabaseClient,
  itemId: string,
  updates: Partial<Pick<ItemWithClaims, 'name' | 'required_count' | 'claim_type'>>
): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from('items').update(updates).eq('id', itemId);

  return { error };
}

/**
 * Sets up a realtime subscription for item_claims changes on a trip.
 * Returns a RealtimeChannel that can be used to unsubscribe later.
 */
export function subscribeToItemClaims(
  supabase: SupabaseClient,
  tripId: string,
  callback: () => void | Promise<void>
): RealtimeChannel {
  return supabase
    .channel(`item_claims:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'item_claims',
        filter: `item_id=in.(select id from items where trip_id='${tripId}')`,
      },
      callback
    )
    .subscribe();
}

/**
 * Sets up a realtime subscription for items changes on a trip.
 * Returns a RealtimeChannel that can be used to unsubscribe later.
 */
export function subscribeToTripItems(
  supabase: SupabaseClient,
  tripId: string,
  callback: () => void | Promise<void>
): RealtimeChannel {
  return supabase
    .channel(`trip_items:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'items',
        filter: `trip_id=eq.${tripId}`,
      },
      callback
    )
    .subscribe();
}
