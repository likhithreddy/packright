'use client';

import * as React from 'react';
import { Users, Crown, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/profile-utils';
import { TripMemberWithProfile } from '@/lib/supabase/trip-members';
import { removeTripMemberAction } from '@/app/actions/trip-members';
import { MemberInviteInput } from '@/components/features/trips/member-invite-input';

interface MembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  members: TripMemberWithProfile[];
  currentUserId: string;
  currentUserIsAdmin: boolean;
  onMembersChange?: () => void;
  existingMemberIds?: Set<string>;
}

/**
 * ISSUE-#45: Members modal for viewing and managing trip members
 *
 * Features:
 * - Display all members with avatar, name, username, and role
 * - Admin badge shown for admin members
 * - Remove member functionality (admin only)
 * - Cannot remove self (must leave trip through separate flow)
 * - Loading states for remove operation
 * - Toast notifications for success/error
 */
export function MembersModal({
  open,
  onOpenChange,
  tripId,
  members,
  currentUserId,
  currentUserIsAdmin,
  onMembersChange,
  existingMemberIds,
}: MembersModalProps) {
  const [removingUserId, setRemovingUserId] = React.useState<string | null>(null);

  const handleRemoveMember = async (userId: string, userName: string) => {
    // Cannot remove self
    if (userId === currentUserId) {
      toast.error('You cannot remove yourself from the trip.');
      return;
    }

    // Double confirmation for remove action
    const confirmed = window.confirm(`Are you sure you want to remove ${userName} from this trip?`);
    if (!confirmed) return;

    setRemovingUserId(userId);

    try {
      const result = await removeTripMemberAction(tripId, userId);

      if (result.success) {
        toast.success(`${userName} removed from trip.`);
        onMembersChange?.();
      } else {
        toast.error(result.error || 'Failed to remove member. Please try again.');
      }
    } catch (error) {
      console.error('Remove error:', error);
      toast.error('Failed to remove member. Please try again.');
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#FAFAF8] border-stone-200 rounded-2xl shadow-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F5F3ED] rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-[#2D3A30]" />
            </div>
            <div>
              <DialogTitle className="font-serif text-xl text-[#2D3A30]">Trip Members</DialogTitle>
              <p className="text-sm text-stone-500 mt-0.5">
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {members.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 text-center text-stone-500"
              >
                <p className="mb-4">No members yet. Invite someone to get started!</p>
                {currentUserIsAdmin && (
                  <div className="px-4">
                    <MemberInviteInput
                      tripId={tripId}
                      currentUserId={currentUserId}
                      existingMemberIds={
                        existingMemberIds || new Set(members.map((m) => m.user_id))
                      }
                      onInviteSuccess={onMembersChange}
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="space-y-2">
                {members.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15, delay: index * 0.03 }}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl
                      ${
                        member.user_id === currentUserId
                          ? 'bg-[#F5F3ED]/50 border border-[#F5F3ED]'
                          : 'bg-white border border-stone-100'
                      }
                      transition-colors
                    `}
                  >
                    <Avatar>
                      <AvatarFallback
                        avatarTheme={member.profile.avatar_theme}
                        className="font-semibold"
                      >
                        {getInitials(member.profile.full_name || member.profile.username)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#2D3A30] truncate">
                          {member.profile.full_name || 'Unknown'}
                        </p>
                        {member.role === 'admin' && (
                          <Crown className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-stone-500 truncate">
                        @{member.profile.username || 'no-username'}
                        {member.user_id === currentUserId && (
                          <span className="ml-2 text-[#4A5D4E] font-medium">(You)</span>
                        )}
                      </p>
                    </div>

                    {/* Remove button - only show for admins removing other members */}
                    {currentUserIsAdmin &&
                      member.role !== 'admin' &&
                      member.user_id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            handleRemoveMember(
                              member.user_id,
                              member.profile.full_name || member.profile.username || 'User'
                            )
                          }
                          disabled={removingUserId === member.user_id}
                          className="text-stone-400 hover:text-red-600 hover:bg-red-50"
                        >
                          {removingUserId === member.user_id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Invite section for admins - shown when there are members */}
          {currentUserIsAdmin && members.length > 0 && (
            <div className="px-6 py-3 border-t border-stone-100">
              <p className="text-xs text-stone-500 mb-2">Invite a new member:</p>
              <MemberInviteInput
                tripId={tripId}
                currentUserId={currentUserId}
                existingMemberIds={existingMemberIds || new Set(members.map((m) => m.user_id))}
                onInviteSuccess={onMembersChange}
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 rounded-b-2xl">
          <p className="text-xs text-stone-500 text-center">
            {!currentUserIsAdmin ? 'Only trip admins can manage members.' : ''}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
