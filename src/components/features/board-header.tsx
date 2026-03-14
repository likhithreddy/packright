'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ItemWithClaims } from '@/types/database.types';
import { getUserInitials, getUserDisplayName } from '@/lib/utils';

interface BoardHeaderProps {
  tripId: string;
  tripTitle: string;
  dateStart: string;
  dateEnd: string;
  items: ItemWithClaims[];
  members: Array<{
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_theme: string | null;
  }>;
  currentUserId: string;
}

const avatarColors = [
  'bg-[#a8d5a8]',
  'bg-[#a8c5d8]',
  'bg-[#d5a8a8]',
  'bg-[#d5c5a8]',
  'bg-[#c5a8d5]',
];

export function BoardHeader({
  tripId: _tripId,
  tripTitle,
  dateStart,
  dateEnd,
  items,
  members,
  currentUserId: _currentUserId,
}: BoardHeaderProps) {
  // Calculate stats
  const totalItems = items.length;
  const totalRequiredCount = items.reduce((sum, item) => sum + item.required_count, 0);
  const totalClaimedCount = items.reduce((sum, item) => sum + item.total_claimed, 0);
  const totalPackedCount = items.reduce((sum, item) => sum + item.total_packed, 0);
  const unassignedItems = items.filter((item) => item.total_claimed < item.required_count).length;

  const percentClaimed =
    totalRequiredCount > 0 ? Math.round((totalClaimedCount / totalRequiredCount) * 100) : 0;
  const percentPacked =
    totalRequiredCount > 0 ? Math.round((totalPackedCount / totalRequiredCount) * 100) : 0;

  // Format dates
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-6">
      {/* Trip title and date range */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="font-serif text-xl sm:text-2xl text-[#2D3A30] mb-2 sm:mb-0">{tripTitle}</h1>
        <div className="text-sm text-stone-600">
          {formatDate(dateStart)} – {formatDate(dateEnd)}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        {/* Stats badges */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="text-center">
            <div className="text-lg font-semibold text-[#2D3A30]">{totalItems} ITEMS</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-[#a8c5d8]">{percentClaimed}% CLAIMED</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-[#a8d5a8]">{percentPacked}% PACKED</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-[#d5a8a8]">{unassignedItems} UNCLAIMED</div>
          </div>
        </div>

        {/* Member avatars */}
        <div className="flex -space-x-1">
          {members.slice(0, 5).map((member) => {
            const initials = getUserInitials(member);
            return (
              <div
                key={member.id}
                className={`${avatarColors[members.indexOf(member) % avatarColors.length]} h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border border-white`}
                title={getUserDisplayName(member)}
              >
                {initials}
              </div>
            );
          })}
          {members.length > 5 && (
            <div className="bg-stone-200 h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border border-white">
              +{members.length - 5}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
