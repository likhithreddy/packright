import { create } from 'zustand';
import { BoardStore, BoardState, BoardViewMode, ViewMode } from '@/types/board.types';
import { ItemWithClaims, KanbanColumn, ItemClaim } from '@/types/database.types';

// Helper function to calculate which column an item belongs to based on its claims
function calculateColumns(
  items: ItemWithClaims[],
  currentUserId: string | null,
  boardViewMode: BoardViewMode
): { columns: Record<KanbanColumn, string[]>; readinessPercentage: number | null } {
  const columns: Record<KanbanColumn, string[]> = {
    unassigned: [],
    claimed: [],
    packed: [],
  };

  for (const item of items) {
    if (boardViewMode === 'all-items-view') {
      // In All Items View, show items based on their global status across columns
      // If there are still needed items, show in Unassigned
      if (item.total_claimed < item.required_count) {
        columns.unassigned.push(item.id);
      }
      
      // If there are claimed but not packed items, show in Claimed
      if (item.total_claimed > item.total_packed) {
        columns.claimed.push(item.id);
      }
      
      // If there are packed items, show in Packed
      if (item.total_packed > 0) {
        columns.packed.push(item.id);
      }
    } else {
      // My View: Personalized filtering
      const userClaim = currentUserId
        ? item.claims.find((c: ItemClaim) => c.user_id === currentUserId)
        : null;

      // User has a claim for this item - show in their Claimed or Packed
      if (userClaim) {
        if (userClaim.is_packed) {
          columns.packed.push(item.id);
        } else {
          columns.claimed.push(item.id);
        }
      }

      // If there's still quantity to be claimed (even if this user already claimed some),
      // show in Unassigned for the user to see what's left
      if (item.total_claimed < item.required_count) {
        columns.unassigned.push(item.id);
      }
    }
  }

  // Sort result arrays by the item's sort_order from the original items array
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const sortByOrder = (aId: string, bId: string) => {
    return (itemMap.get(aId)?.sort_order ?? 0) - (itemMap.get(bId)?.sort_order ?? 0);
  };

  columns.unassigned.sort(sortByOrder);
  columns.claimed.sort(sortByOrder);
  columns.packed.sort(sortByOrder);

  // Calculate readiness percentage: (total_packed / total_required) * 100
  let totalRequired = 0;
  let totalPacked = 0;

  for (const item of items) {
    totalRequired += item.required_count;
    totalPacked += item.total_packed;
  }

  const readinessPercentage = totalRequired === 0 
    ? null 
    : Math.min(100, Math.round((totalPacked / totalRequired) * 100));

  return { columns, readinessPercentage };
}

// Helper function to find a user's claim for an item
function findUserClaim(
  item: ItemWithClaims,
  userId: string
): { id: string; quantity: number } | null {
  const claim = item.claims.find((c: ItemClaim) => c.user_id === userId);
  return claim ? { id: claim.id, quantity: claim.quantity } : null;
}

// Import Supabase functions dynamically to avoid Turbopack issues
const getSupabaseFunctions = async () => {
  const items = await import('@/lib/supabase/items');
  const client = await import('@/lib/supabase/client');
  return {
    claimItem: items.claimItem,
    updateClaim: items.updateClaim,
    updateClaimQuantity: items.updateClaimQuantity,
    removeClaim: items.removeClaim,
    updateItemsSortOrder: items.updateItemsSortOrder,
    updateClaimsSortOrder: items.updateClaimsSortOrder,
    createClient: client.createClient,
  };
};

export const useBoardStore = create<BoardStore>((set, get) => ({
  // State
  tripId: null,
  items: [],
  columns: { unassigned: [], claimed: [], packed: [] },
  readinessPercentage: null,
  isLoading: false,
  error: null,
  currentUserId: null,
  viewMode: 'kanban', // Default to kanban view (requested by user)
  boardViewMode: 'my-view',
  isAdmin: false,

  // Actions
  setTripId: (tripId: string) => set({ tripId }),

  setItems: (items: ItemWithClaims[]) =>
    set((state: BoardState) => {
      const { columns, readinessPercentage } = calculateColumns(items, state.currentUserId, state.boardViewMode);
      return {
        items,
        columns,
        readinessPercentage,
      };
    }),

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

  setBoardViewMode: (mode: BoardViewMode) =>
    set((state: BoardState) => {
      const { columns, readinessPercentage } = calculateColumns(state.items, state.currentUserId, mode);
      return {
        boardViewMode: mode,
        columns,
        readinessPercentage,
      };
    }),

  setIsAdmin: (isAdmin: boolean) => set({ isAdmin }),

  moveItem: async (itemId: string, fromColumn: KanbanColumn, toColumn: KanbanColumn) => {
    const { columns, items, currentUserId } = get();
    const newColumns = { ...columns };

    // Remove from source column
    newColumns[fromColumn] = newColumns[fromColumn].filter((id: string) => id !== itemId);

    // Add to target column
    newColumns[toColumn] = [...newColumns[toColumn], itemId];

    set({ columns: newColumns });

    // Handle drag-and-drop semantics based on column change
    const item = items.find((i: ItemWithClaims) => i.id === itemId);
    if (!item || !currentUserId) return;

    try {
      // Handle different column transitions
      if (fromColumn === 'unassigned' && toColumn === 'claimed') {
        // Claim the item for the current user
        const remainingNeeded = item.required_count - item.total_claimed;
        if (remainingNeeded > 0) {
          await get().claimItem(itemId, remainingNeeded);
        }
      } else if (fromColumn === 'claimed' && toColumn === 'packed') {
        // Mark user's claim as packed
        const claim = findUserClaim(item, currentUserId);
        if (claim) {
          await get().markAsPacked(claim.id);
        } else if (get().isAdmin) {
          // If admin doesn't have a claim, but is dragging in all-items-view,
          // mark ALL claims for this item as packed
          for (const c of item.claims) {
            if (!c.is_packed) {
              await get().markAsPacked(c.id);
            }
          }
        }
      } else if (fromColumn === 'claimed' && toColumn === 'unassigned') {
        // Remove user's claim
        const claim = findUserClaim(item, currentUserId);
        if (claim) {
          await get().unclaimItem(claim.id, claim.quantity);
        }
      } else if (fromColumn === 'packed' && toColumn === 'claimed') {
        // Mark user's claim as not packed
        const claim = findUserClaim(item, currentUserId);
        if (claim) {
          await get().markAsNotPacked(claim.id);
        } else if (get().isAdmin) {
          // Admin marking all as not packed
          for (const c of item.claims) {
            if (c.is_packed) {
              await get().markAsNotPacked(c.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to persist move:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to persist move' });
      throw error; // Re-throw so component can handle it
    }
  },

  reorderItem: (itemId: string, column: KanbanColumn, newIndex: number) => {
    const { columns } = get();
    const newColumns = { ...columns };
    const columnItems = [...newColumns[column]];

    // Remove item from current position
    columnItems.splice(columnItems.indexOf(itemId), 1);

    // Insert at new position
    columnItems.splice(newIndex, 0, itemId);

    newColumns[column] = columnItems;
    set({ columns: newColumns });
  },

  persistReorder: async (column: KanbanColumn) => {
    const { columns, items, tripId, boardViewMode, currentUserId } = get();
    if (!tripId) return;

    try {
      const {
        updateItemsSortOrder: updateItemsFn,
        updateClaimsSortOrder: updateClaimsFn,
        createClient: createClientFn,
      } = await getSupabaseFunctions();
      const supabase = createClientFn();

      const columnIds = columns[column];

      if (
        boardViewMode === 'my-view' &&
        (column === 'claimed' || column === 'packed') &&
        currentUserId
      ) {
        // In My View, reordering Claimed/Packed means reordering the USER'S claims
        const claimUpdates = columnIds
          .map((itemId: string, index: number) => {
            const item = items.find((i: ItemWithClaims) => i.id === itemId);
            const claim = item?.claims.find((c: ItemClaim) => c.user_id === currentUserId);
            return claim ? { id: claim.id, sort_order: index } : null;
          })
          .filter(Boolean) as { id: string; sort_order: number }[];

        if (claimUpdates.length > 0) {
          await updateClaimsFn(supabase, claimUpdates);
        }
      } else {
        // Reordering Unassigned (or anything in All Items mode) means reordering the ITEMS themselves
        const itemUpdates = columnIds.map((id: string, index: number) => ({
          id,
          sort_order: index,
        }));
        await updateItemsFn(supabase, itemUpdates);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to persist order' });
    }
  },

  claimItem: async (itemId: string, quantity: number) => {
    const { currentUserId, tripId } = get();
    if (!currentUserId || !tripId) {
      set({ error: 'User not authenticated or no trip selected' });
      return;
    }

    try {
      const { claimItem: claimItemFn, createClient: createClientFn } = await getSupabaseFunctions();
      const supabase = createClientFn();
      const { error } = await claimItemFn(supabase, itemId, tripId, currentUserId, quantity);
      if (error) throw error;
      // Board will be updated via realtime subscription
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to claim item';
      set({ error: message });
      throw error;
    }
  },

  markAsPacked: async (claimId: string) => {
    try {
      const { updateClaim: updateClaimFn, createClient: createClientFn } =
        await getSupabaseFunctions();
      const supabase = createClientFn();
      const { error } = await updateClaimFn(supabase, claimId, { is_packed: true });
      if (error) throw error;
      // Board will be updated via realtime subscription
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark as packed';
      set({ error: message });
      throw error;
    }
  },

  unclaimItem: async (claimId: string, quantity: number) => {
    try {
      const {
        updateClaimQuantity: updateClaimQuantityFn,
        removeClaim: removeClaimFn,
        createClient: createClientFn,
      } = await getSupabaseFunctions();
      const supabase = createClientFn();

      // Get the current claim to check quantity
      const { data: claim, error: fetchError } = await supabase
        .from('item_claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (fetchError) throw fetchError;
      if (!claim) {
        throw new Error('Claim not found');
      }

      // If unclaiming all quantity, remove the claim
      // Otherwise, update the claim with new quantity
      if (quantity >= claim.quantity) {
        const { error } = await removeClaimFn(supabase, claimId);
        if (error) throw error;
      } else {
        const newQuantity = claim.quantity - quantity;
        const { error } = await updateClaimQuantityFn(supabase, claimId, newQuantity);
        if (error) throw error;
      }
      // Board will be updated via realtime subscription
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unclaim item';
      set({ error: message });
      throw error;
    }
  },

  markAsNotPacked: async (claimId: string) => {
    try {
      const { updateClaim: updateClaimFn, createClient: createClientFn } =
        await getSupabaseFunctions();
      const supabase = createClientFn();
      const { error } = await updateClaimFn(supabase, claimId, { is_packed: false });
      if (error) throw error;
      // Board will be updated via realtime subscription
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark as not packed';
      set({ error: message });
      throw error;
    }
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  setCurrentUserId: (userId: string) =>
    set((state: BoardState) => {
      const { columns, readinessPercentage } = calculateColumns(state.items, userId, state.boardViewMode);
      return {
        currentUserId: userId,
        columns,
        readinessPercentage,
      };
    }),
}));
