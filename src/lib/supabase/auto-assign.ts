import { SupabaseClient } from '@supabase/supabase-js';
import { getTripMembers } from './trip-members';
import { getTripItems } from './items';

export interface MemberClaimStats {
  userId: string;
  currentQuantity: number;
}

export interface UnassignedItem {
  id: string;
  name: string;
  requiredCount: number;
  currentlyClaimedCount: number;
}

export interface Assignment {
  itemId: string;
  userId: string;
  quantity: number;
}

/**
 * Greedy algorithm to distribute unassigned items among members fairly.
 * It prioritizes members with the lowest current quantity counts.
 */
export function calculateDistributions(
  members: MemberClaimStats[],
  items: UnassignedItem[]
): Assignment[] {
  if (members.length === 0 || items.length === 0) return [];

  const assignments: Assignment[] = [];

  // Create mutable copies for tracking
  const memberStats = members.map((m) => ({ ...m }));
  const itemPool = items.map((i) => ({ ...i }));

  // Flatten the item pool into individual units to make greedy assignment easier
  const unitsToAssign: { itemId: string }[] = [];
  for (const item of itemPool) {
    const remaining = item.requiredCount - item.currentlyClaimedCount;
    for (let k = 0; k < remaining; k++) {
      unitsToAssign.push({ itemId: item.id });
    }
  }

  // Assign each unit to the member with the lowest current count
  for (const unit of unitsToAssign) {
    // Sort members by current quantity to find the one with the least
    memberStats.sort((a, b) => a.currentQuantity - b.currentQuantity);

    const targetMember = memberStats[0];

    // Record assignment
    const existingAssignment = assignments.find(
      (a) => a.itemId === unit.itemId && a.userId === targetMember.userId
    );

    if (existingAssignment) {
      existingAssignment.quantity += 1;
    } else {
      assignments.push({
        itemId: unit.itemId,
        userId: targetMember.userId,
        quantity: 1,
      });
    }

    // Update member's transient count
    targetMember.currentQuantity += 1;
  }

  return assignments;
}

/**
 * Fetches all necessary data from Supabase and formats it for the algorithm.
 */
export async function getAutoAssignData(
  supabase: SupabaseClient,
  tripId: string
): Promise<{
  members: MemberClaimStats[] | null;
  items: UnassignedItem[] | null;
  error: unknown;
}> {
  // 1. Fetch trip members
  const { data: members, error: membersError } = await getTripMembers(supabase, tripId);
  if (membersError) return { members: null, items: null, error: membersError };

  // 2. Fetch trip items with claims
  const { data: items, error: itemsError } = await getTripItems(supabase, tripId);
  if (itemsError) return { members: null, items: null, error: itemsError };

  if (!members || !items) return { members: [], items: [], error: null };

  // 3. Format members for algorithm
  const memberStats: MemberClaimStats[] = members.map((member) => {
    const currentQuantity = items.reduce((sum, item) => {
      const userClaim = item.claims.find((c) => c.user_id === member.user_id);
      return sum + (userClaim ? userClaim.quantity : 0);
    }, 0);

    return {
      userId: member.user_id,
      currentQuantity,
    };
  });

  // 4. Format unassigned items for algorithm
  const unassignedItems: UnassignedItem[] = items
    .filter((item) => item.total_claimed < item.required_count)
    .map((item) => ({
      id: item.id,
      name: item.name,
      requiredCount: item.required_count,
      currentlyClaimedCount: item.total_claimed,
    }));

  return { members: memberStats, items: unassignedItems, error: null };
}

/**
 * Performs the actual database updates for the assignments.
 */
export async function performAutoAssignment(
  supabase: SupabaseClient,
  tripId: string,
  assignments: Assignment[]
): Promise<{ error: unknown }> {
  if (assignments.length === 0) return { error: null };

  try {
    for (const assignment of assignments) {
      // Check if claim exists
      const { data: existing } = await supabase
        .from('item_claims')
        .select('id, quantity')
        .eq('item_id', assignment.itemId)
        .eq('user_id', assignment.userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('item_claims')
          .update({ quantity: existing.quantity + assignment.quantity })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('item_claims').insert({
          trip_id: tripId,
          item_id: assignment.itemId,
          user_id: assignment.userId,
          quantity: assignment.quantity,
          is_packed: false,
        });
        if (error) throw error;
      }
    }

    return { error: null };
  } catch (err) {
    return { error: err };
  }
}
