'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';
import { MemberInviteInput } from '@/components/features/trips/member-invite-input';
import { MembersModal } from '@/components/features/trips/members-modal';
import { PackingBoard } from '@/components/features/packing-board';
import { ViewToggle } from '@/components/features/view-toggle';
import { BoardViewToggle } from '@/components/features/board-view-toggle';
import { ReadinessVisualizer } from '@/components/features/readiness-visualizer';
import { getInitials } from '@/lib/profile-utils';
import { TripMemberWithProfile } from '@/lib/supabase/trip-members';
import { Trip } from '@/types/database.types';

/**
 * Trip Dashboard Client Component
 *
 * ISSUE-#46: Client-side interactive component for trip dashboard.
 * Receives data from server component and handles user interactions.
 *
 * Features:
 * - View trip details (title, dates, destination)
 * - View trip statistics (items, % claimed, % packed, unassigned)
 * - View and toggle between Kanban/List views
 * - View and toggle between My View/All Items View
 * - View trip members
 * - Invite new members (admin only)
 * - View all members in modal
 * - Remove members (admin only)
 */
export interface TripDashboardClientProps {
  tripId: string;
  currentUserId: string;
  members: TripMemberWithProfile[];
  currentUserIsAdmin: boolean;
  trip: Trip | null;
}

export function TripDashboardClient({
  tripId,
  currentUserId,
  members,
  currentUserIsAdmin,
  trip,
}: TripDashboardClientProps) {
  const router = useRouter();
  const [isMembersModalOpen, setIsMembersModalOpen] = React.useState(false);

  // Stats state (updated by PackingBoard via custom event)
  const [stats, setStats] = React.useState({
    totalItems: 0,
    percentClaimed: 0,
    percentPacked: 0,
    unassignedItems: 0,
  });

  // Listen for stats updates from PackingBoard
  React.useEffect(() => {
    const handleStatsUpdate = (event: CustomEvent) => {
      setStats(event.detail);
    };

    window.addEventListener('tripStatsUpdate', handleStatsUpdate as EventListener);
    return () => {
      window.removeEventListener('tripStatsUpdate', handleStatsUpdate as EventListener);
    };
  }, []);

  // Handle successful invitation
  const handleInviteSuccess = React.useCallback(() => {
    // Trigger a page refresh or re-fetch on the server side
    router.refresh();
  }, [router]);

  // Handle members change (after removal)
  const handleMembersChange = React.useCallback(() => {
    // Trigger a page refresh or re-fetch on the server side
    router.refresh();
  }, [router]);

  // Get visible members for avatar group (max 5)
  const visibleMembers = members.slice(0, 5);
  const remainingCount = Math.max(0, members.length - 5);

  // Create a Set of existing member IDs for quick lookup
  const existingMemberIds = React.useMemo(() => new Set(members.map((m) => m.user_id)), [members]);

  // Format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div data-testid="trip-dashboard-page" className="flex flex-col h-full bg-[#FAFAF8] font-sans">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white flex-shrink-0">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          {/* Top row: Back button, Trip info, View toggles, Members */}
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard')}
                className="text-stone-500 hover:text-stone-800 hover:bg-stone-100/50 h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 w-3.5 sm:w-4 sm:h-4" />
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-xl sm:text-2xl truncate text-[#2D3A30]">
                    {trip?.title || 'Loading...'}
                  </h1>
                  {trip?.destination && (
                    <>
                      <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-sm text-stone-600 truncate">{trip.destination}</span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-stone-500">
                  {trip && formatDate(trip.date_start) + ' - ' + formatDate(trip.date_end)}
                </p>
              </div>
            </div>

            {/* Members section + Invite (admin-only) */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Invite input - admin only, visible on md+ screens */}
              {currentUserIsAdmin && (
                <div className="hidden md:flex items-center gap-2">
                  <label className="text-sm font-medium text-stone-700 whitespace-nowrap">
                    Invite members:
                  </label>
                  <div className="w-full max-w-[200px] sm:max-w-[250px] lg:max-w-[300px]">
                    <MemberInviteInput
                      tripId={tripId}
                      currentUserId={currentUserId}
                      existingMemberIds={existingMemberIds}
                      onInviteSuccess={handleInviteSuccess}
                      compactPlaceholder
                    />
                  </div>
                </div>
              )}
              {/* Avatar group - hide on very small screens */}
              <div className="hidden sm:flex -space-x-2">
                {visibleMembers.length > 0 && (
                  <AvatarGroup>
                    {visibleMembers.map((member) => (
                      <Avatar
                        key={member.id}
                        size="sm"
                        title={member.profile.full_name || undefined}
                      >
                        <AvatarFallback
                          avatarTheme={member.profile.avatar_theme}
                          className="text-xs font-semibold"
                        >
                          {getInitials(member.profile.full_name || member.profile.username)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                )}
                {remainingCount > 0 && (
                  <span className="text-xs sm:text-sm text-stone-500">+{remainingCount}</span>
                )}
              </div>

              {/* View all members button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMembersModalOpen(true)}
                className="border-stone-200 text-stone-600 hover:bg-stone-50 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">View all</span>
              </Button>
            </div>
          </div>

          {/* Stats + Toggles + Readiness Bar - Visible to all */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between gap-3 sm:gap-4 mb-2">
              {/* Stats (left) */}
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm flex-wrap text-stone-500">
                <span className="font-semibold text-sm sm:text-base uppercase tracking-wide text-[#2D3A30]">
                  {stats.totalItems} ITEMS
                </span>
                <span>{stats.percentClaimed}% claimed</span>
                <span>{stats.percentPacked}% packed</span>
                <span>{stats.unassignedItems} unassigned</span>
              </div>

              {/* Toggles (right) */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <BoardViewToggle />
                <ViewToggle />
              </div>
            </div>

            {/* Readiness bar */}
            <ReadinessVisualizer
              percentage={stats.percentPacked}
              showLabel={false}
              className="mt-1"
            />
          </div>
        </div>
      </header>

      {/* Main content area - Packing Board */}
      <main className="flex-1 overflow-hidden">
        <PackingBoard />
      </main>

      {/* Members Modal */}
      <MembersModal
        open={isMembersModalOpen}
        onOpenChange={setIsMembersModalOpen}
        tripId={tripId}
        members={members}
        currentUserId={currentUserId}
        currentUserIsAdmin={currentUserIsAdmin}
        onMembersChange={handleMembersChange}
        existingMemberIds={existingMemberIds}
      />
    </div>
  );
}
