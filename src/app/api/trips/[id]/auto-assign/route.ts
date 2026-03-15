import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  getAutoAssignData,
  calculateDistributions,
  performAutoAssignment,
} from '@/lib/supabase/auto-assign';
import { isTripAdmin } from '@/lib/supabase/trip-members';

/**
 * API Route: POST /api/trips/[id]/auto-assign
 *
 * Admin-only endpoint to automatically and fairly distribute unassigned items
 * among trip members.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await params;

  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[API] Starting auto-assignment for trip ${tripId} by user ${user.id}`);

    // 2. Verify admin permissions
    const { isAdmin, error: adminError } = await isTripAdmin(supabase, tripId);

    if (adminError || !isAdmin) {
      console.error(`[API] Admin check failed for user ${user.id} on trip ${tripId}:`, adminError);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 3. Fetch data for assignment
    const { members, items, error: dataError } = await getAutoAssignData(supabase, tripId);

    if (dataError) {
      console.error('[API] Error fetching auto-assign data:', dataError);
      return NextResponse.json({ error: 'Failed to fetch trip data' }, { status: 500 });
    }

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'No members found to assign items to' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        message: 'Items assigned successfully (already complete)',
        success: true,
        count: 0,
      });
    }

    // 4. Run distribution algorithm
    const assignments = calculateDistributions(members, items);

    if (assignments.length === 0) {
      return NextResponse.json({
        message: 'Items assigned successfully (no changes needed)',
        success: true,
        count: 0,
      });
    }

    // 5. Perform the assignment in the database
    const { error: assignError } = await performAutoAssignment(supabase, tripId, assignments);

    if (assignError) {
      console.error('[API] Error performing auto-assignment:', assignError);
      return NextResponse.json({ error: 'Failed to save assignments' }, { status: 500 });
    }

    console.log(`[API] Successfully assigned ${assignments.length} items for trip ${tripId}`);

    return NextResponse.json({
      success: true,
      message: `Items assigned successfully (${assignments.length} items)`,
      count: assignments.length,
    });
  } catch (error) {
    console.error('Auto-assign API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
