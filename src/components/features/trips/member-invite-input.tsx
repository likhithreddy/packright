'use client';

import * as React from 'react';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { getInitials } from '@/lib/profile-utils';
import { Profile } from '@/types/profile.types';
import { searchUsersAction, inviteTripMemberAction } from '@/app/actions/trip-members';

interface MemberInviteInputProps {
  tripId: string;
  currentUserId: string;
  existingMemberIds: Set<string>;
  onInviteSuccess?: () => void;
}

/**
 * ISSUE-#45: Member invite input component with search and invitation functionality
 *
 * Features:
 * - Debounced search (300ms) with 3-character minimum
 * - Popover dropdown with search results
 * - Avatar + full name + username display
 * - "You" badge for current user (unselectable)
 * - "Already member" badge for existing members (unselectable)
 * - Loading states for search and invite operations
 * - Toast notifications for success/error
 */
export function MemberInviteInput({
  tripId,
  currentUserId,
  existingMemberIds,
  onInviteSuccess,
}: MemberInviteInputProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);
  const [results, setResults] = React.useState<Profile[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [invitingUserId, setInvitingUserId] = React.useState<string | null>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Automatically open popover when user types
  React.useEffect(() => {
    if (searchQuery.length > 0) {
      setIsOpen(true);
    }
  }, [searchQuery]);

  // Search for users when debounced query changes
  React.useEffect(() => {
    const performSearch = async () => {
      const trimmedQuery = debouncedQuery.trim();

      // Don't search if query is too short
      if (trimmedQuery.length < 3) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await searchUsersAction(trimmedQuery);
        if (response.success && response.data) {
          // Limit to 5 results for UI
          setResults(response.data.slice(0, 5));
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  // Reset search when popover closes
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) {
      setSearchQuery('');
      setResults([]);
    }
  };

  // Handle user selection and invitation
  const handleInviteUser = async (user: Profile) => {
    // Prevent inviting self
    if (user.id === currentUserId) {
      return;
    }

    // Prevent inviting existing members
    if (existingMemberIds.has(user.id)) {
      toast.error(`${user.full_name || user.username || 'User'} is already a trip member.`);
      return;
    }

    setInvitingUserId(user.id);

    try {
      const result = await inviteTripMemberAction(
        tripId,
        user.id,
        user.full_name || user.username || 'User'
      );

      if (result.success) {
        const fullName = user.full_name || user.username || 'User';
        toast.success(`${fullName} joined!`);

        // Clear search and close popover
        setSearchQuery('');
        setResults([]);
        setIsOpen(false);

        // Notify parent component
        onInviteSuccess?.();
      } else {
        toast.error(result.error || 'Failed to invite member. Please try again.');
      }
    } catch (error) {
      console.error('Invite error:', error);
      toast.error('Failed to invite member. Please try again.');
    } finally {
      setInvitingUserId(null);
    }
  };

  // Check if a user can be selected
  const canSelectUser = (user: Profile): boolean => {
    return user.id !== currentUserId && !existingMemberIds.has(user.id);
  };

  // Get badge for user
  const getUserBadge = (user: Profile): { text: string; variant: 'you' | 'member' } | null => {
    if (user.id === currentUserId) {
      return { text: 'You', variant: 'you' };
    }
    if (existingMemberIds.has(user.id)) {
      return { text: 'Already member', variant: 'member' };
    }
    return null;
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-stone-200 focus-visible:ring-0 focus:border-[#4A5D4E] bg-white transition-colors text-sm"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 animate-spin" />
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[320px] p-2"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 flex items-center justify-center"
            >
              <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
            </motion.div>
          ) : debouncedQuery.length < 3 ? (
            <motion.div
              key="too-short"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 text-center text-stone-500 text-sm"
            >
              Enter at least 3 characters to search
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 text-center text-stone-500 text-sm"
            >
              No users found
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-1"
            >
              {results.map((user) => {
                const badge = getUserBadge(user);
                const canSelect = canSelectUser(user);
                const isInviting = invitingUserId === user.id;

                return (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => canSelect && handleInviteUser(user)}
                    disabled={!canSelect || isInviting}
                    className={`
                      w-full flex items-center gap-3 p-2 rounded-lg
                      transition-all duration-150 text-left
                      ${
                        canSelect && !isInviting
                          ? 'hover:bg-stone-100 active:bg-stone-200 cursor-pointer'
                          : 'opacity-60 cursor-not-allowed'
                      }
                    `}
                  >
                    <Avatar size="sm">
                      <AvatarFallback
                        avatarTheme={user.avatar_theme}
                        className="text-xs font-semibold"
                      >
                        {getInitials(user.full_name || user.username)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2D3A30] truncate">
                        {user.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-stone-500 truncate">
                        @{user.username || 'no-username'}
                      </p>
                    </div>

                    {badge ? (
                      <span
                        className={`
                          text-[10px] font-semibold px-2 py-0.5 rounded-full
                          ${
                            badge.variant === 'you'
                              ? 'bg-[#4A5D4E] text-white'
                              : 'bg-stone-200 text-stone-600'
                          }
                        `}
                      >
                        {badge.text}
                      </span>
                    ) : isInviting ? (
                      <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 text-stone-400 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
