'use client';

import * as React from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItemWithClaims, KanbanColumn } from '@/types/database.types';
import { BoardViewMode } from '@/types/board.types';
import { getUserInitials, getUserDisplayName } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/utils/category-icons';

interface ListViewProps {
  items: ItemWithClaims[];
  columns: Record<KanbanColumn, string[]>;
  currentUserId: string | null;
  isAdmin: boolean;
  boardViewMode?: BoardViewMode;
  onClaim: (itemId: string) => void;
  onUnclaim: (claimId: string, quantity: number) => void;
  onMarkPacked: (claimId: string) => void;
  onEditItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

interface AccordionSectionProps {
  title: string;
  itemCount: number;
  items: ItemWithClaims[];
  column: KanbanColumn;
  currentUserId: string | null;
  isAdmin: boolean;
  boardViewMode?: BoardViewMode;
  onClaim: (itemId: string) => void;
  onUnclaim: (claimId: string, quantity: number) => void;
  onMarkPacked: (claimId: string) => void;
  onEditItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

function AccordionSection({
  title,
  itemCount,
  items,
  column,
  currentUserId,
  isAdmin,
  boardViewMode,
  onClaim,
  onUnclaim,
  onMarkPacked,
  onEditItem,
  onDeleteItem,
}: AccordionSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const avatarColors = [
    'bg-[#a8d5a8]',
    'bg-[#a8c5d8]',
    'bg-[#d5a8a8]',
    'bg-[#d5c5a8]',
    'bg-[#c5a8d5]',
  ];

  const renderActionButtons = (item: ItemWithClaims) => {
    const userClaim = currentUserId ? item.claims.find((c) => c.user_id === currentUserId) : null;

    if (column === 'unassigned') {
      return (
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditItem(item.id)}
                className="rounded-full text-xs h-7 px-3"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeleteItem(item.id)}
                className="rounded-full text-xs h-7 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              >
                Delete
              </Button>
            </div>
          )}
          <Button
            size="sm"
            onClick={() => onClaim(item.id)}
            className="bg-[#a8d5a8] hover:bg-[#8bc48b] text-[#2D3A30] rounded-full text-xs font-medium h-7 px-3"
          >
            Claim
          </Button>
        </div>
      );
    }

    if (column === 'claimed' && userClaim && !userClaim.is_packed) {
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

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-base sm:text-lg text-[#2D3A30]">{title}</h2>
          <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs font-medium text-[#2D3A30]">
            {itemCount}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-stone-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-stone-400" />
        )}
      </button>

      {isExpanded && (
        <div className="divide-y divide-stone-100">
          {items.map((item) => {
            // Get count to display based on column and boardViewMode
            const getCountForCard = (): number => {
              if (boardViewMode === 'my-view') {
                // My View: Personalized counts
                if (column === 'unassigned') {
                  // Show remaining portion that ANYONE can claim
                  return Math.max(0, item.required_count - item.total_claimed);
                }
                if (column === 'claimed' || column === 'packed') {
                  const userClaim = currentUserId
                    ? item.claims.find((c) => c.user_id === currentUserId)
                    : null;
                  return userClaim?.quantity || 0;
                }
              } else {
                // All Items View: Aggregate counts
                if (column === 'unassigned') {
                  // Show remaining portion that ANYONE can claim
                  return Math.max(0, item.required_count - item.total_claimed);
                }
                if (column === 'claimed') {
                  return item.total_claimed;
                }
                if (column === 'packed') {
                  return item.total_packed;
                }
              }
              return 0;
            };

            // Get dynamic category icon
            const CategoryIcon = getCategoryIcon(item.category);

            return (
              <div
                key={item.id}
                className="px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-stone-50 transition-colors"
              >
                {/* Single compact row */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {/* Icon */}
                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-[#F5F3ED] flex items-center justify-center flex-shrink-0">
                    <CategoryIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#2D3A30]" />
                  </div>

                  {/* Name */}
                  <h3 className="font-medium text-[#2D3A30] text-sm truncate flex-1 min-w-[80px] sm:min-w-[100px]">
                    {item.name}
                  </h3>

                  {/* Separator */}
                  <span className="text-stone-300 flex-shrink-0">|</span>

                  {/* Category badge */}
                  <span className="text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    {item.category}
                  </span>

                  {/* Separator */}
                  <span className="text-stone-300 flex-shrink-0">|</span>

                  {/* Qty */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wide">
                      Qty
                    </span>
                    <span className="text-sm font-semibold text-[#2D3A30]">
                      {getCountForCard()}
                    </span>
                  </div>

                  {/* Avatars (if any claims) */}
                  {item.claims.length > 0 &&
                    !(boardViewMode === 'my-view' && column === 'claimed') && (
                      <>
                        <span className="text-stone-300 flex-shrink-0">|</span>
                        <div className="flex -space-x-1 flex-shrink-0">
                          {item.claims.slice(0, 3).map((claim, index) => {
                            const profile = claim.profiles?.[0] || null;
                            const memberInitials = getUserInitials(profile, claim.user_id);
                            return (
                              <div
                                key={claim.id}
                                className={`${avatarColors[index % avatarColors.length]} h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-medium border border-white`}
                                title={getUserDisplayName(profile, claim.user_id)}
                              >
                                {memberInitials}
                              </div>
                            );
                          })}
                          {item.claims.length > 3 && (
                            <div className="bg-stone-200 h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-medium border border-white">
                              +{item.claims.length - 3}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                  {/* Buttons (rightmost) */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    {renderActionButtons(item)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ListView({
  items,
  columns,
  currentUserId,
  isAdmin,
  boardViewMode,
  onClaim,
  onUnclaim,
  onMarkPacked,
  onEditItem,
  onDeleteItem,
}: ListViewProps) {
  const getItemsForColumn = (column: KanbanColumn): ItemWithClaims[] => {
    const itemIds = columns[column];
    return items.filter((item) => itemIds.includes(item.id));
  };

  const unassignedItems = getItemsForColumn('unassigned');
  const claimedItems = getItemsForColumn('claimed');
  const packedItems = getItemsForColumn('packed');

  return (
    <div className="flex flex-col gap-4 p-2 sm:p-4 lg:p-6 h-full overflow-y-auto">
      <AccordionSection
        title="Unassigned"
        itemCount={unassignedItems.length}
        items={unassignedItems}
        column="unassigned"
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        boardViewMode={boardViewMode}
        onClaim={onClaim}
        onUnclaim={onUnclaim}
        onMarkPacked={onMarkPacked}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
      />

      <AccordionSection
        title="Claimed"
        itemCount={claimedItems.length}
        items={claimedItems}
        column="claimed"
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        boardViewMode={boardViewMode}
        onClaim={onClaim}
        onUnclaim={onUnclaim}
        onMarkPacked={onMarkPacked}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
      />

      <AccordionSection
        title="Packed"
        itemCount={packedItems.length}
        items={packedItems}
        column="packed"
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        boardViewMode={boardViewMode}
        onClaim={onClaim}
        onUnclaim={onUnclaim}
        onMarkPacked={onMarkPacked}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
      />
    </div>
  );
}
