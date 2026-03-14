'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { ItemWithClaims, KanbanColumn } from '@/types/database.types';
import { BoardViewMode } from '@/types/board.types';
import { getUserInitials } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/utils/category-icons';

interface KanbanCardProps {
  item: ItemWithClaims;
  column: KanbanColumn;
  currentUserId: string | null;
  isAdmin: boolean;
  isDragDisabled: boolean;
  boardViewMode?: BoardViewMode;
  onClaim: (itemId: string) => void;
  onMarkPacked: (claimId: string) => void;
  onUnclaim: (claimId: string, quantity: number) => void;
  onEditItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

export function KanbanCard({
  item,
  column,
  currentUserId,
  isAdmin,
  isDragDisabled,
  boardViewMode,
  onClaim,
  onMarkPacked,
  onUnclaim,
  onEditItem,
  onDeleteItem,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${column}:${item.id}`,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Find user's claim for this item
  const userClaim = currentUserId ? item.claims.find((c) => c.user_id === currentUserId) : null;

  // Get count to display based on column and boardViewMode
  const getCountForCard = (): number => {
    if (boardViewMode === 'my-view') {
      // My View: Personalized counts
      if (column === 'unassigned') {
        // Show remaining portion that ANYONE can claim
        return Math.max(0, item.required_count - item.total_claimed);
      }
      if (column === 'claimed' || column === 'packed') {
        // Show exactly what the current user has claimed/packed
        return userClaim?.quantity || 0;
      }
    } else {
      // All Items View: Aggregate counts
      if (column === 'unassigned') {
        return Math.max(0, item.required_count - item.total_claimed);
      }
      if (column === 'claimed') {
        // Show total claimed but not yet packed
        return Math.max(0, item.total_claimed - item.total_packed);
      }
      if (column === 'packed') {
        return item.total_packed;
      }
    }
    return 0;
  };

  // Get dynamic category icon
  const CategoryIcon = getCategoryIcon(item.category);

  // Render action buttons based on column
  const renderActionButtons = () => {
    if (column === 'unassigned') {
      return (
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditItem(item.id)}
                className="h-7 w-7 p-0 rounded-full hover:bg-stone-100"
                title="Edit item"
              >
                <Pencil className="h-3 w-3 text-stone-500" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteItem(item.id)}
                className="h-7 w-7 p-0 rounded-full hover:bg-red-50"
                title="Delete item"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            className="bg-[#a8d5a8] hover:bg-[#8bc48b] text-[#2D3A30] rounded-full text-xs font-medium h-7"
            onClick={() => onClaim(item.id)}
          >
            Claim
          </Button>
        </div>
      );
    }

    if (column === 'claimed') {
      if (userClaim && !userClaim.is_packed) {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUnclaim(userClaim.id, userClaim.quantity)}
              className="rounded-full text-xs h-7 px-3"
            >
              Unclaim
            </Button>
            <Button
              size="sm"
              onClick={() => onMarkPacked(userClaim.id)}
              className="bg-[#a8c5d8] hover:bg-[#8ba8c4] text-[#2D3A30] rounded-full text-xs font-medium h-7 px-3"
            >
              Mark Packed
            </Button>
          </div>
        );
      }
    }

    if (column === 'packed') {
      if (userClaim && userClaim.is_packed) {
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUnclaim(userClaim.id, userClaim.quantity)}
              className="rounded-full text-xs h-7 px-3"
            >
              Unclaim
            </Button>
            <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
              <Check className="h-3 w-3" />
              Packed
            </div>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
          <Check className="h-3 w-3" />
          Packed
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white border border-stone-200 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow ${
        isDragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* First row: Icon, Name (left) | Avatars (right) */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Dynamic category icon - reduced size */}
          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-[#F5F3ED] flex items-center justify-center flex-shrink-0">
            <CategoryIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#2D3A30]" />
          </div>
          <h3 className="font-medium text-[#2D3A30] text-sm truncate">{item.name}</h3>
        </div>

        {/* User avatars (conditional) - right side */}
        {item.claims.length > 0 && !(boardViewMode === 'my-view' && column === 'claimed') && (
          <AvatarGroup>
            {item.claims.slice(0, 3).map((claim) => {
              const profile = claim.profiles?.[0] || null;
              const memberInitials = getUserInitials(profile, claim.user_id);
              const avatarTheme = profile?.avatar_theme;

              return (
                <Avatar key={claim.id} size="sm" className="ring-2 ring-white">
                  <AvatarFallback avatarTheme={avatarTheme} className="text-[10px]">
                    {memberInitials}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {item.claims.length > 3 && (
              <AvatarGroupCount className="h-6 w-6 text-[10px] ring-2 ring-white">
                +{item.claims.length - 3}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
        )}
      </div>

      {/* Second row: Qty (left) | Action buttons (right) */}
      <div className="flex items-center justify-between">
        {/* Qty - horizontal layout, left aligned */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wide">
            Qty
          </span>
          <span className="text-sm font-semibold text-[#2D3A30]">{getCountForCard()}</span>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">{renderActionButtons()}</div>
      </div>
    </div>
  );
}
