'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarGroup } from '@/components/ui/avatar';
import { MemberInviteInput } from '@/components/features/trips/member-invite-input';
import { MembersModal } from '@/components/features/trips/members-modal';
import { getInitials } from '@/lib/profile-utils';
import { TripMemberWithProfile } from '@/lib/supabase/trip-members';

/**
 * Trip Dashboard Client Component
 *
 * ISSUE-#45: Client-side interactive component for trip dashboard.
 * Receives data from server component and handles user interactions.
 *
 * Features:
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
}

export function TripDashboardClient({
  tripId,
  currentUserId,
  members,
  currentUserIsAdmin,
}: TripDashboardClientProps) {
  const router = useRouter();
  const [isMembersModalOpen, setIsMembersModalOpen] = React.useState(false);

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

  return (
    <div className="flex flex-col h-full bg-[#FAFAF8] font-sans">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-stone-500 hover:text-stone-800 hover:bg-stone-100/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-stone-200" />
              <h1 className="font-serif text-xl text-[#2D3A30]">Trip Dashboard</h1>
            </div>

            {/* Members section */}
            <div className="flex items-center gap-4">
              {/* Avatar group */}
              <div className="flex items-center gap-3">
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
                  <span className="text-sm text-stone-500">+{remainingCount}</span>
                )}
                <span className="text-sm text-stone-600">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* View all members button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMembersModalOpen(true)}
                className="border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                <Users className="w-4 h-4 mr-2" />
                View all
              </Button>
            </div>
          </div>

          {/* Invite input row */}
          {currentUserIsAdmin && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-4 border-t border-stone-100"
            >
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-stone-700 whitespace-nowrap">
                  Invite members:
                </label>
                <div className="flex-1 max-w-md">
                  <MemberInviteInput
                    tripId={tripId}
                    currentUserId={currentUserId}
                    existingMemberIds={existingMemberIds}
                    onInviteSuccess={handleInviteSuccess}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Main content area - placeholder for future packing board */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Placeholder for packing board */}
          <div className="bg-white border border-stone-200 rounded-3xl p-12 shadow-sm text-center space-y-6">
            <h2 className="font-serif text-2xl text-[#2D3A30]">Packing Board Coming Soon</h2>
            <p className="text-stone-500 max-w-md mx-auto">
              The collaborative packing board will appear here. Trip members can claim and pack
              items together.
            </p>
          </div>
        </div>
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
