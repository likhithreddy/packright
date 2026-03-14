'use client';

import * as React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ItemWithClaims, type KanbanColumn as KanbanColumnType } from '@/types/database.types';
import { BoardViewMode } from '@/types/board.types';
import { KanbanCard } from './kanban-card';

interface KanbanColumnProps {
  id: KanbanColumnType;
  title: string;
  items: ItemWithClaims[];
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

const columnStyles: Record<KanbanColumnType, { bg: string; header: string; border: string }> = {
  unassigned: {
    bg: 'bg-[#f0ebe4]', // Warm beige
    header: 'bg-[#e8e3dc]',
    border: 'border-[#d4cfc4]',
  },
  claimed: {
    bg: 'bg-[#e8e8e8]', // Light neutral gray
    header: 'bg-[#e0e0e0]',
    border: 'border-[#d0d0d0]',
  },
  packed: {
    bg: 'bg-[#e8f0e8]', // Light green-gray
    header: 'bg-[#dce8dc]',
    border: 'border-[#c8d8cc]',
  },
};

export function KanbanColumn({
  id,
  title,
  items,
  currentUserId,
  isAdmin,
  isDragDisabled,
  boardViewMode,
  onClaim,
  onMarkPacked,
  onUnclaim,
  onEditItem,
  onDeleteItem,
}: KanbanColumnProps) {
  const styles = columnStyles[id];
  const itemIds = items.map((item) => item.id);

  // Render cards with or without SortableContext based on drag state
  const renderCards = () => {
    if (items.length === 0) {
      return (
        <div className="flex items-center justify-center h-full min-h-[150px] sm:min-h-[200px]">
          <p className="text-sm text-stone-400 italic">No items yet</p>
        </div>
      );
    }

    const cards = (
      <div className="flex flex-col gap-2 sm:gap-3">
        {items.map((item) => (
          <KanbanCard
            key={item.id}
            item={item}
            column={id}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            isDragDisabled={isDragDisabled}
            boardViewMode={boardViewMode}
            onClaim={onClaim}
            onMarkPacked={onMarkPacked}
            onUnclaim={onUnclaim}
            onEditItem={onEditItem}
            onDeleteItem={onDeleteItem}
          />
        ))}
      </div>
    );

    // Only wrap in SortableContext if dragging is enabled for this column
    if (isDragDisabled) {
      return cards;
    }

    return (
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {cards}
      </SortableContext>
    );
  };

  return (
    <div
      data-testid={`column-${id}`}
      className={`${styles.bg} ${styles.border} border rounded-2xl flex flex-col h-full min-h-[300px] sm:min-h-[400px]`}
    >
      {/* Column header */}
      <div
        className={`${styles.header} rounded-t-2xl px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between flex-shrink-0`}
      >
        <h2 className="font-serif text-base sm:text-lg text-[#2D3A30]">{title}</h2>
        <span className="bg-white/60 px-2 py-0.5 rounded-full text-xs font-medium text-[#2D3A30]">
          {items.length}
        </span>
      </div>

      {/* Cards container */}
      <div className="flex-1 p-2 sm:p-3 overflow-y-auto">{renderCards()}</div>
    </div>
  );
}
