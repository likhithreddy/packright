'use client';

import * as React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ItemWithClaims, KanbanColumn } from '@/types/database.types';
import { KanbanColumn as KanbanColumnComponent } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { useBoardStore } from '@/store/board-store';

interface KanbanBoardProps {
  items: ItemWithClaims[];
  columns: Record<KanbanColumn, string[]>;
  currentUserId: string | null;
  isAdmin: boolean;
  onClaim: (itemId: string) => void;
  onMarkPacked: (claimId: string) => void;
  onUnclaim: (claimId: string, quantity: number) => void;
  onEditItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (itemId: string, fromColumn: KanbanColumn, toColumn: KanbanColumn) => void;
}

export function KanbanBoard({
  items,
  columns,
  currentUserId,
  isAdmin,
  onClaim,
  onMarkPacked,
  onUnclaim,
  onEditItem,
  onDeleteItem,
  onMoveItem,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeColumn, setActiveColumn] = React.useState<KanbanColumn | null>(null);
  const boardViewMode = useBoardStore((state) => state.boardViewMode);

  // Configure sensors with activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Find which column an item belongs to
  const findColumnOfItem = (itemId: string): KanbanColumn | null => {
    for (const [column, itemIds] of Object.entries(columns)) {
      if (itemIds.includes(itemId)) {
        return column as KanbanColumn;
      }
    }
    return null;
  };

  // Get items for a specific column
  const getItemsForColumn = (column: KanbanColumn): ItemWithClaims[] => {
    const itemIds = columns[column];
    return items.filter((item) => itemIds.includes(item.id));
  };

  // In "my-view", Unassigned column is not draggable (items are not draggable there)
  const isDragDisabledForColumn = (column: KanbanColumn): boolean => {
    return boardViewMode === 'my-view' && column === 'unassigned';
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveColumn(findColumnOfItem(active.id as string));
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveColumn(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceColumn = findColumnOfItem(activeId);
    const targetColumn = findColumnOfItem(overId);

    if (!sourceColumn || !targetColumn) return;

    // Don't allow dragging from Unassigned in "my-view"
    if (isDragDisabledForColumn(sourceColumn)) {
      return;
    }

    // Moving within the same column (reordering)
    if (sourceColumn === targetColumn) {
      // ISSUE-#46: Implement vertical reordering if needed
      return;
    }

    // Moving between columns
    onMoveItem(activeId, sourceColumn, targetColumn);
  };

  // Get the active item for the drag overlay
  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        data-testid="kanban-board"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2 sm:p-4 lg:p-6 h-full min-h-0"
      >
        <KanbanColumnComponent
          id="unassigned"
          title="Unassigned"
          items={getItemsForColumn('unassigned')}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isDragDisabled={isDragDisabledForColumn('unassigned')}
          boardViewMode={boardViewMode}
          onClaim={onClaim}
          onMarkPacked={onMarkPacked}
          onUnclaim={onUnclaim}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
        />
        <KanbanColumnComponent
          id="claimed"
          title="Claimed"
          items={getItemsForColumn('claimed')}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isDragDisabled={isDragDisabledForColumn('claimed')}
          boardViewMode={boardViewMode}
          onClaim={onClaim}
          onMarkPacked={onMarkPacked}
          onUnclaim={onUnclaim}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
        />
        <KanbanColumnComponent
          id="packed"
          title="Packed"
          items={getItemsForColumn('packed')}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isDragDisabled={isDragDisabledForColumn('packed')}
          boardViewMode={boardViewMode}
          onClaim={onClaim}
          onMarkPacked={onMarkPacked}
          onUnclaim={onUnclaim}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
        />
      </div>

      {/* Drag overlay shows a rotated version of the item being dragged */}
      <DragOverlay>
        {activeItem && activeColumn && (
          <div className="rotate-3 opacity-90">
            <KanbanCard
              item={activeItem}
              column={activeColumn}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              isDragDisabled={isDragDisabledForColumn(activeColumn)}
              boardViewMode={boardViewMode}
              onClaim={() => {}}
              onMarkPacked={() => {}}
              onUnclaim={() => {}}
              onEditItem={() => {}}
              onDeleteItem={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
