import { create } from 'zustand';
import type { BoardStore, BoardViewMode } from '@/types/board.types';
import type { ItemClaim, ItemWithClaims, KanbanColumn } from '@/types/database.types';

// Helper function to calculate which column an item belongs to based on its claims
function calculateColumns(
  items: ItemWithClaims[],
  currentUserId: string | null,
  boardViewMode: BoardViewMode
): Record<KanbanColumn, string[]> {
  const columns: Record<KanbanColumn, string[]> = {
    unassigned: [],
    claimed: [],
    packed: [],
  };

  for (const item of items) {
    const userClaim = currentUserId ? item.claims.find((c) => c.user_id === currentUserId) : null;

    if (boardViewMode === 'all-items-view') {
      // In All Items View, show all items across all columns based on their global status
      if (item.total_packed >= item.required_count) {
        columns.packed.push(item.id);
      } else if (item.total_claimed >= item.required_count) {
        columns.claimed.push(item.id);
      } else {
        columns.unassigned.push(item.id);
      }
    } else {
      // My View: Personalized filtering
      if (userClaim) {
        // User has a claim for this item - show in their Claimed or Packed
        if (userClaim.is_packed) {
          columns.packed.push(item.id);
        } else {
          columns.claimed.push(item.id);
        }
      } else {
        // User doesn't have a claim - show in Unassigned if not fully claimed
        if (item.total_claimed < item.required_count) {
          columns.unassigned.push(item.id);
        }
        // If item is fully claimed by others, don't show it in user's My View
      }
    }
  }

  return columns;
}

// Helper function to find a user's claim for an item
function findUserClaim(
  item: ItemWithClaims,
  userId: string
): { id: string; quantity: number } | null {
  const claim = item.claims.find((c) => c.user_id === userId);
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
    createClient: client.createClient,
  };
};

export const useBoardStore = create<BoardStore>((set, get) => ({
  // State
  tripId: null,
  items: [],
  columns: { unassigned: [], claimed: [], packed: [] },
  isLoading: false,
  error: null,
  currentUserId: null,
  viewMode: 'list', // Default to list view (better for mobile/tablet)
  boardViewMode: 'my-view',
  isAdmin: false,

  // Actions
  setTripId: (tripId: string) => set({ tripId }),

  setItems: (items: ItemWithClaims[]) =>
    set((state) => ({
      items,
      columns: calculateColumns(items, state.currentUserId, state.boardViewMode),
    })),

  setViewMode: (mode) => set({ viewMode: mode }),

  setBoardViewMode: (mode) =>
    set((state) => ({
      boardViewMode: mode,
      columns: calculateColumns(state.items, state.currentUserId, mode),
    })),

  setIsAdmin: (isAdmin: boolean) => set({ isAdmin }),

  moveItem: (itemId: string, fromColumn: KanbanColumn, toColumn: KanbanColumn) => {
    const { columns, items, currentUserId } = get();
    const newColumns = { ...columns };

    // Remove from source column
    newColumns[fromColumn] = newColumns[fromColumn].filter((id) => id !== itemId);

    // Add to target column
    newColumns[toColumn] = [...newColumns[toColumn], itemId];

    set({ columns: newColumns });

    // Handle drag-and-drop semantics based on column change
    const item = items.find((i) => i.id === itemId);
    if (!item || !currentUserId) return;

    // Handle different column transitions
    if (fromColumn === 'unassigned' && toColumn === 'claimed') {
      // Claim the item for the current user
      const remainingNeeded = item.required_count - item.total_claimed;
      if (remainingNeeded > 0) {
        get().claimItem(itemId, remainingNeeded);
      }
    } else if (fromColumn === 'claimed' && toColumn === 'packed') {
      // Mark user's claim as packed
      const claim = findUserClaim(item, currentUserId);
      if (claim) {
        get().markAsPacked(claim.id);
      }
    } else if (fromColumn === 'claimed' && toColumn === 'unassigned') {
      // Remove user's claim
      const claim = findUserClaim(item, currentUserId);
      if (claim) {
        get().unclaimItem(claim.id, claim.quantity);
      }
    } else if (fromColumn === 'packed' && toColumn === 'claimed') {
      // Mark user's claim as not packed
      const claim = findUserClaim(item, currentUserId);
      if (claim) {
        get().markAsNotPacked(claim.id);
      }
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

  claimItem: async (itemId: string, quantity: number) => {
    const { currentUserId, tripId, items, boardViewMode } = get();
    if (!currentUserId || !tripId) {
      set({ error: 'User not authenticated or no trip selected' });
      return;
    }

    // Save previous state for rollback
    const prevItems = [...items];

    // Optimistically update
    const newItems = items.map((item) => {
      if (item.id === itemId) {
        const newClaim: ItemClaim = {
          id: `temp-${Date.now()}`,
          item_id: itemId,
          user_id: currentUserId,
          quantity,
          is_packed: false,
          created_at: new Date().toISOString(),
          profiles: null,
        };
        const updatedClaims = [...item.claims, newClaim];
        const total_claimed = updatedClaims.reduce((sum, c) => sum + c.quantity, 0);
        return {
          ...item,
          claims: updatedClaims,
          total_claimed,
        };
      }
      return item;
    });

    set({
      items: newItems,
      columns: calculateColumns(newItems, currentUserId, boardViewMode),
    });

    try {
      const { claimItem: claimItemFn, createClient: createClientFn } = await getSupabaseFunctions();
      const supabase = createClientFn();
      await claimItemFn(supabase, itemId, currentUserId, quantity);
      // Board will be updated via realtime subscription for the final truth
    } catch (error) {
      // Rollback on error
      set({
        items: prevItems,
        columns: calculateColumns(prevItems, currentUserId, boardViewMode),
        error: error instanceof Error ? error.message : 'Failed to claim item',
      });
    }
  },

  markAsPacked: async (claimId: string) => {
    const { currentUserId, items, boardViewMode } = get();
    if (!currentUserId) return;

    const prevItems = [...items];

    // Optimistically update
    const newItems = items.map((item) => {
      const claimIndex = item.claims.findIndex((c) => c.id === claimId);
      if (claimIndex !== -1) {
        const updatedClaims = [...item.claims];
        updatedClaims[claimIndex] = { ...updatedClaims[claimIndex], is_packed: true };
        const total_packed = updatedClaims
          .filter((c) => c.is_packed)
          .reduce((sum, c) => sum + c.quantity, 0);
        return {
          ...item,
          claims: updatedClaims,
          total_packed,
        };
      }
      return item;
    });

    set({
      items: newItems,
      columns: calculateColumns(newItems, currentUserId, boardViewMode),
    });

    try {
      const { updateClaim: updateClaimFn, createClient: createClientFn } =
        await getSupabaseFunctions();
      const supabase = createClientFn();
      await updateClaimFn(supabase, claimId, { is_packed: true });
    } catch (error) {
      set({
        items: prevItems,
        columns: calculateColumns(prevItems, currentUserId, boardViewMode),
        error: error instanceof Error ? error.message : 'Failed to mark as packed',
      });
    }
  },

  unclaimItem: async (claimId: string, quantity: number) => {
    const { currentUserId, items, boardViewMode } = get();
    if (!currentUserId) return;

    const prevItems = [...items];

    // Optimistically update
    const newItems = items.map((item) => {
      const claimIndex = item.claims.findIndex((c) => c.id === claimId);
      if (claimIndex !== -1) {
        const claim = item.claims[claimIndex];
        let updatedClaims = [...item.claims];

        if (quantity >= claim.quantity) {
          // Remove claim
          updatedClaims = updatedClaims.filter((c) => c.id !== claimId);
        } else {
          // Update quantity
          updatedClaims[claimIndex] = { ...claim, quantity: claim.quantity - quantity };
        }

        const total_claimed = updatedClaims.reduce((sum, c) => sum + c.quantity, 0);
        const total_packed = updatedClaims
          .filter((c) => c.is_packed)
          .reduce((sum, c) => sum + c.quantity, 0);

        return {
          ...item,
          claims: updatedClaims,
          total_claimed,
          total_packed,
        };
      }
      return item;
    });

    set({
      items: newItems,
      columns: calculateColumns(newItems, currentUserId, boardViewMode),
    });

    try {
      const {
        updateClaimQuantity: updateClaimQuantityFn,
        removeClaim: removeClaimFn,
        createClient: createClientFn,
      } = await getSupabaseFunctions();
      const supabase = createClientFn();

      const { data: claim } = await supabase
        .from('item_claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (!claim) throw new Error('Claim not found');

      if (quantity >= claim.quantity) {
        await removeClaimFn(supabase, claimId);
      } else {
        await updateClaimQuantityFn(supabase, claimId, claim.quantity - quantity);
      }
    } catch (error) {
      set({
        items: prevItems,
        columns: calculateColumns(prevItems, currentUserId, boardViewMode),
        error: error instanceof Error ? error.message : 'Failed to unclaim item',
      });
    }
  },

  markAsNotPacked: async (claimId: string) => {
    const { currentUserId, items, boardViewMode } = get();
    if (!currentUserId) return;

    const prevItems = [...items];

    // Optimistically update
    const newItems = items.map((item) => {
      const claimIndex = item.claims.findIndex((c) => c.id === claimId);
      if (claimIndex !== -1) {
        const updatedClaims = [...item.claims];
        updatedClaims[claimIndex] = { ...updatedClaims[claimIndex], is_packed: false };
        const total_packed = updatedClaims
          .filter((c) => c.is_packed)
          .reduce((sum, c) => sum + c.quantity, 0);
        return {
          ...item,
          claims: updatedClaims,
          total_packed,
        };
      }
      return item;
    });

    set({
      items: newItems,
      columns: calculateColumns(newItems, currentUserId, boardViewMode),
    });

    try {
      const { updateClaim: updateClaimFn, createClient: createClientFn } =
        await getSupabaseFunctions();
      const supabase = createClientFn();
      await updateClaimFn(supabase, claimId, { is_packed: false });
    } catch (error) {
      set({
        items: prevItems,
        columns: calculateColumns(prevItems, currentUserId, boardViewMode),
        error: error instanceof Error ? error.message : 'Failed to mark as not packed',
      });
    }
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  setCurrentUserId: (userId: string) =>
    set((state) => ({
      currentUserId: userId,
      columns: calculateColumns(state.items, userId, state.boardViewMode),
    })),
}));
