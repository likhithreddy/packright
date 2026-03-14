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
  onReorderItem: (itemId: string, column: KanbanColumn, newIndex: number) => void;
  onPersistReorder: (column: KanbanColumn) => Promise<void>;
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
  onReorderItem,
  onPersistReorder,
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

  // Find which column an item belongs to (used for sortable helper)
  const parseCompositeId = (compositeId: string): { column: KanbanColumn; itemId: string } | null => {
    if (!compositeId.includes(':')) return null;
    const [column, itemId] = compositeId.split(':');
    return { column: column as KanbanColumn, itemId };
  };

  // Find column of an item by searching all columns (legacy fallback or for overId items)
  const findColumnOfItem = (itemId: string): KanbanColumn | null => {
    // If it's a composite ID, parse it directly
    if (itemId.includes(':')) {
      return itemId.split(':')[0] as KanbanColumn;
    }
    // Otherwise search
    for (const [column, itemIds] of Object.entries(columns)) {
      if (itemIds.includes(itemId)) {
        return column as KanbanColumn;
      }
    }
    return null;
  };

  // Get items for a specific column
  const getItemsForColumn = (column: KanbanColumn): ItemWithClaims[] => {
    const itemIdsInColumn = columns[column];
    if (!itemIdsInColumn) {
      return []; // Safety check
    }
    return itemIdsInColumn
      .map((itemId) => items.find((item) => item.id === itemId))
      .filter((item): item is ItemWithClaims => item !== undefined);
  };

  // In "my-view", Unassigned column is not draggable (items are not draggable there)
  const isDragDisabledForColumn = (column: KanbanColumn): boolean => {
    return boardViewMode === 'my-view' && column === 'unassigned';
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    setActiveId(activeId);
    setActiveColumn(findColumnOfItem(activeId));
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveColumn(null);

    if (!over) return;

    const activeCompositeId = active.id as string;
    const overId = over.id as string;

    const activeInfo = parseCompositeId(activeCompositeId);
    if (!activeInfo) return;

    const { itemId: activeId, column: sourceColumn } = activeInfo;

    // If overId is a column ID, use it directly. Otherwise, find the column of the item.
    const targetColumn = (overId in columns) 
      ? overId as KanbanColumn 
      : findColumnOfItem(overId);

    if (!sourceColumn || !targetColumn) return;

    // Don't allow dragging from Unassigned in "my-view"
    if (isDragDisabledForColumn(sourceColumn)) {
      return;
    }

    // Moving within the same column (reordering)
    if (sourceColumn === targetColumn) {
      // Only reorder if we dropped over an item, not the column itself
      if (!(overId in columns)) {
        const columnItems = columns[sourceColumn];
        const oldIndex = columnItems.indexOf(activeId);
        
        // Parse overItemId if it's composite
        const overInfo = parseCompositeId(overId);
        const targetItemId = overInfo ? overInfo.itemId : overId;
        const newIndex = columnItems.indexOf(targetItemId);

        if (oldIndex !== newIndex && newIndex !== -1) {
          onReorderItem(activeId, sourceColumn, newIndex);
          onPersistReorder(sourceColumn);
        }
      }
      return;
    }

    // Moving between columns
    if (sourceColumn === 'unassigned' && targetColumn === 'claimed') {
      // Intercept: trigger claim dialog instead of direct move
      onClaim(activeId);
      return;
    }

    onMoveItem(activeId, sourceColumn, targetColumn);
  };

  // Get the active item for the drag overlay
  const activeItemInfo = activeId ? parseCompositeId(activeId) : null;
  const activeItem = activeItemInfo ? items.find((item) => item.id === activeItemInfo.itemId) : null;

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
