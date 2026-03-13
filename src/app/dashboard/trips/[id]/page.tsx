import { getProfile } from '@/lib/supabase/profile';
import { getTripMembersAction } from '@/app/actions/trip-members';
import { TripDashboardClient } from '@/components/features/trips/TripDashboardClient';

/**
 * Trip Dashboard Page
 *
 * ISSUE-#45: Server component that fetches trip data and renders client component.
 *
 * This server component:
 * 1. Fetches the current user profile
 * 2. Fetches trip members
 * 3. Determines admin status
 * 4. Passes all data to the client component for interactivity
 */
export default async function TripDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  // Fetch current user profile
  const currentUser = await getProfile();
  const currentUserId = currentUser?.id || '';

  // Fetch trip members - await params
  const { id: tripId } = await params;
  const membersResult = await getTripMembersAction(tripId);
  const members = membersResult.success && membersResult.data ? membersResult.data : [];

  // Determine admin status with better fallback
  // If members array is empty (data not loaded yet), don't assume non-admin
  // This prevents a race condition where the UI renders before data is available
  const currentUserIsAdmin =
    members.length > 0 && members.some((m) => m.user_id === currentUserId && m.role === 'admin');

  // Pass data to client component
  return (
    <TripDashboardClient
      tripId={tripId}
      currentUserId={currentUserId}
      members={members}
      currentUserIsAdmin={currentUserIsAdmin}
    />
  );
}
