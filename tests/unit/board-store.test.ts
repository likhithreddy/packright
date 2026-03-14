import { useBoardStore } from '@/store/board-store';
import { ItemWithClaims } from '@/types/board.types';
import { PostgrestError } from '@supabase/supabase-js';

// Mock the items module using relative path
jest.mock('../../src/lib/supabase/items', () => ({
  claimItem: jest.fn().mockResolvedValue({ data: null, error: null }),
  updateClaim: jest.fn().mockResolvedValue({ data: null, error: null }),
  updateClaimQuantity: jest.fn().mockResolvedValue({ data: null, error: null }),
  removeClaim: jest.fn().mockResolvedValue({ error: null }),
}));

// Mock the client module
jest.mock('../../src/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { quantity: 1 }, error: null }),
        })),
      })),
    })),
  })),
}));

describe('useBoardStore', () => {
  // Helper to create mock item
  const createMockItem = (overrides?: Partial<ItemWithClaims>): ItemWithClaims => ({
    id: 'item-1',
    trip_id: 'trip-1',
    name: 'Test Item',
    required_count: 2,
    category: 'Essentials',
    created_at: new Date().toISOString(),
    claims: [],
    total_claimed: 0,
    total_packed: 0,
    ...overrides,
  });

  // Helper to create mock claim
  const createMockClaim = (userId: string, quantity: number, isPacked: boolean) => ({
    id: `claim-${userId}`,
    item_id: 'item-1',
    user_id: userId,
    quantity,
    is_packed: isPacked,
    created_at: new Date().toISOString(),
    profiles: null,
  });

  beforeEach(() => {
    // Reset the store state before each test
    useBoardStore.setState({
      tripId: null,
      items: [],
      columns: { unassigned: [], claimed: [], packed: [] },
      columns: { unassigned: [], claimed: [], packed: [] },
      isLoading: false,
      error: null,
      currentUserId: null,
      boardViewMode: 'my-view',
      viewMode: 'list',
      isAdmin: false,
    });
    jest.clearAllMocks();
  });

  describe('setTripId', () => {
    it('sets the trip ID', () => {
      const store = useBoardStore.getState();
      store.setTripId('trip-123');

      expect(useBoardStore.getState().tripId).toBe('trip-123');
    });
  });

  describe('setItems - Column Calculation', () => {
    describe('all-items-view mode', () => {
      beforeEach(() => {
        useBoardStore.setState({
          boardViewMode: 'all-items-view',
          currentUserId: 'user-1',
        });
      });

      it('places unassigned items in unassigned column', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 2,
            total_claimed: 0,
            total_packed: 0,
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual(['item-1']);
        expect(columns.claimed).toEqual([]);
        expect(columns.packed).toEqual([]);
      });

      it('places partially claimed items in unassigned column', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-2', 2, false)],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual(['item-1']);
        expect(columns.claimed).toEqual([]);
        expect(columns.packed).toEqual([]);
      });

      it('places fully claimed items in claimed column', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 2,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-1', 1, false), createMockClaim('user-2', 1, false)],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual([]);
        expect(columns.claimed).toEqual(['item-1']);
        expect(columns.packed).toEqual([]);
      });

      it('places fully packed items in packed column', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 2,
            total_claimed: 2,
            total_packed: 2,
            claims: [createMockClaim('user-1', 1, true), createMockClaim('user-2', 1, true)],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual([]);
        expect(columns.claimed).toEqual([]);
        expect(columns.packed).toEqual(['item-1']);
      });

      it('handles items with no claims', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 2,
            total_claimed: 0,
            total_packed: 0,
            claims: [],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual(['item-1']);
      });
    });

    describe('my-view mode', () => {
      beforeEach(() => {
        useBoardStore.setState({
          boardViewMode: 'my-view',
          currentUserId: 'user-1',
        });
      });

      it('shows unclaimed items in unassigned column', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 2,
            total_claimed: 0,
            total_packed: 0,
            claims: [],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual(['item-1']);
      });

      it('shows items claimed by user in claimed column', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-1', 2, false)],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        expect(columns.claimed).toEqual(['item-1']);
      });

      it('shows items packed by user in packed column', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 2,
            total_packed: 2,
            claims: [createMockClaim('user-1', 2, true)],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        expect(columns.packed).toEqual(['item-1']);
      });

      it('hides items fully claimed by others', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 2,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-2', 2, false)],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        // Item is fully claimed by others, not shown in user's view
        expect(columns.unassigned).toEqual([]);
        expect(columns.claimed).toEqual([]);
        expect(columns.packed).toEqual([]);
      });

      it('shows item in unassigned if not fully claimed by others', () => {
        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-2', 2, false)],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        // Item is not fully claimed, show in unassigned
        expect(columns.unassigned).toEqual(['item-1']);
      });

      it('handles null currentUserId gracefully', () => {
        useBoardStore.setState({
          boardViewMode: 'my-view',
          currentUserId: null,
        });

        const store = useBoardStore.getState();
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 2,
            total_claimed: 0,
            total_packed: 0,
            claims: [],
          }),
        ];

        store.setItems(items);

        const columns = useBoardStore.getState().columns;
        // With no user, items should be in unassigned if not fully claimed
        expect(columns.unassigned).toEqual(['item-1']);
      });
    });

    describe('boardViewMode transition', () => {
      it('recalculates columns when switching from all-items-view to my-view', () => {
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 2,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-2', 2, false)],
          }),
        ];

        // Start in all-items-view
        useBoardStore.setState({
          boardViewMode: 'all-items-view',
          currentUserId: 'user-1',
        });
        let store = useBoardStore.getState();
        store.setItems(items);

        // Item should be in claimed column (fully claimed)
        let columns = useBoardStore.getState().columns;
        expect(columns.claimed).toEqual(['item-1']);

        // Switch to my-view
        store = useBoardStore.getState();
        store.setBoardViewMode('my-view');

        // Item should NOT appear in any column (fully claimed by others, not shown in my-view)
        columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual([]);
        expect(columns.claimed).toEqual([]);
        expect(columns.packed).toEqual([]);
      });

      it('recalculates columns when switching from my-view to all-items-view', () => {
        const items: ItemWithClaims[] = [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-1', 2, false)],
          }),
        ];

        // Start in my-view
        useBoardStore.setState({
          boardViewMode: 'my-view',
          currentUserId: 'user-1',
        });
        let store = useBoardStore.getState();
        store.setItems(items);

        // Item should be in claimed column (user's claim)
        let columns = useBoardStore.getState().columns;
        expect(columns.claimed).toEqual(['item-1']);

        // Switch to all-items-view
        store = useBoardStore.getState();
        store.setBoardViewMode('all-items-view');

        // Item should be in unassigned column (partially claimed overall)
        columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual(['item-1']);
      });
    });

    describe('handles empty items array', () => {
      it('returns empty columns for empty items array', () => {
        const store = useBoardStore.getState();
        store.setItems([]);

        const columns = useBoardStore.getState().columns;
        expect(columns.unassigned).toEqual([]);
        expect(columns.claimed).toEqual([]);
        expect(columns.packed).toEqual([]);
      });
    });
  });

  describe('setCurrentUserId', () => {
    it('sets the current user ID', () => {
      const store = useBoardStore.getState();
      store.setCurrentUserId('user-123');

      expect(useBoardStore.getState().currentUserId).toBe('user-123');
    });

    it('recalculates columns when currentUserId changes', () => {
      const items: ItemWithClaims[] = [
        createMockItem({
          id: 'item-1',
          required_count: 2,
          total_claimed: 2,
          total_packed: 0,
          claims: [createMockClaim('user-1', 2, false)],
        }),
      ];

      useBoardStore.setState({
        boardViewMode: 'my-view',
        currentUserId: 'user-1',
      });
      let store = useBoardStore.getState();
      store.setItems(items);

      // Item should be in claimed for user-1 (they claimed it)
      let columns = useBoardStore.getState().columns;
      expect(columns.claimed).toEqual(['item-1']);

      // Change to different user (user-2)
      store.setCurrentUserId('user-2');

      // Item should NOT appear in any column for user-2 (fully claimed by user-1)
      columns = useBoardStore.getState().columns;
      expect(columns.unassigned).toEqual([]);
      expect(columns.claimed).toEqual([]);
      expect(columns.packed).toEqual([]);
    });
  });

  describe('setLoading and setError', () => {
    it('sets loading state', () => {
      const store = useBoardStore.getState();
      store.setLoading(true);

      expect(useBoardStore.getState().isLoading).toBe(true);
    });

    it('sets error state', () => {
      const store = useBoardStore.getState();
      store.setError('Something went wrong');

      expect(useBoardStore.getState().error).toBe('Something went wrong');
    });
  });

  describe('moveItem', () => {
    it('moves item between columns and updates state', () => {
      useBoardStore.setState({
        columns: {
          unassigned: ['item-1'],
          unassigned: ['item-1'],
          claimed: [],
          packed: [],
        },
        currentUserId: 'user-1',
        items: [createMockItem({ id: 'item-1' })],
      });

      const store = useBoardStore.getState();
      store.moveItem('item-1', 'unassigned', 'claimed');
      store.moveItem('item-1', 'unassigned', 'claimed');

      const columns = useBoardStore.getState().columns;
      expect(columns.unassigned).toEqual([]);
      expect(columns.unassigned).toEqual([]);
      expect(columns.claimed).toEqual(['item-1']);
    });

    it('reorders items within the same column', () => {
      useBoardStore.setState({
        columns: {
          unassigned: ['item-1', 'item-2', 'item-3'],
          unassigned: ['item-1', 'item-2', 'item-3'],
          claimed: [],
          packed: [],
        },
      });

      const store = useBoardStore.getState();
      store.reorderItem('item-1', 'unassigned', 2);
      store.reorderItem('item-1', 'unassigned', 2);

      const columns = useBoardStore.getState().columns;
      expect(columns.unassigned).toEqual(['item-2', 'item-3', 'item-1']);
      expect(columns.unassigned).toEqual(['item-2', 'item-3', 'item-1']);
    });
  });

  describe('claimItem', () => {
    it('optimistically updates state when claiming item', async () => {
      useBoardStore.setState({
        tripId: 'trip-1',
        currentUserId: 'user-1',
        items: [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 0,
            total_packed: 0,
            claims: [],
          }),
        ],
        columns: { unassigned: ['item-1'], claimed: [], packed: [] },
      });

      const store = useBoardStore.getState();
      await store.claimItem('item-1', 2);

      // After claiming, the item should have updated claims and be in claimed column
      const state = useBoardStore.getState();
      expect(state.items[0].total_claimed).toBe(2);
      expect(state.columns.claimed).toContain('item-1');
    });

    it('sets error when tripId or currentUserId is missing', async () => {
      useBoardStore.setState({
        tripId: null,
        currentUserId: null,
      });

      const store = useBoardStore.getState();
      await store.claimItem('item-1', 2);

      expect(useBoardStore.getState().error).toBe('User not authenticated or no trip selected');
    });
  });

  describe('markAsPacked', () => {
    it('optimistically updates state when marking as packed', async () => {
      useBoardStore.setState({
        currentUserId: 'user-1',
        items: [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-1', 2, false)],
          }),
        ],
        columns: { unassigned: [], claimed: ['item-1'], packed: [] },
        boardViewMode: 'my-view',
      });

      const store = useBoardStore.getState();
      await store.markAsPacked('claim-user-1');

      // After marking as packed, the item should be in packed column
      const state = useBoardStore.getState();
      expect(state.items[0].total_packed).toBe(2);
      expect(state.columns.packed).toContain('item-1');
    });
  });

  describe('unclaimItem', () => {
    it('optimistically updates state when unclaiming item', async () => {
      useBoardStore.setState({
        currentUserId: 'user-1',
        items: [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 2,
            total_packed: 0,
            claims: [createMockClaim('user-1', 2, false)],
          }),
        ],
        columns: { unassigned: [], claimed: ['item-1'], packed: [] },
        boardViewMode: 'my-view',
      });

      const store = useBoardStore.getState();
      await store.unclaimItem('claim-user-1', 2);

      // After unclaiming, the item should be in unassigned column
      const state = useBoardStore.getState();
      expect(state.items[0].total_claimed).toBe(0);
      expect(state.columns.unassigned).toContain('item-1');
    });
  });

  describe('markAsNotPacked', () => {
    it('optimistically updates state when marking as not packed', async () => {
      useBoardStore.setState({
        currentUserId: 'user-1',
        items: [
          createMockItem({
            id: 'item-1',
            required_count: 5,
            total_claimed: 2,
            total_packed: 2,
            claims: [createMockClaim('user-1', 2, true)],
          }),
        ],
        columns: { unassigned: [], claimed: [], packed: ['item-1'] },
        boardViewMode: 'my-view',
      });

      const store = useBoardStore.getState();
      await store.markAsNotPacked('claim-user-1');

      // After marking as not packed, the item should be back in claimed column
      const state = useBoardStore.getState();
      expect(state.items[0].total_packed).toBe(0);
      expect(state.columns.claimed).toContain('item-1');
    });
  });

  describe('setBoardViewMode', () => {
    it('changes board view mode', () => {
      const store = useBoardStore.getState();
      store.setBoardViewMode('all-items-view');

      expect(useBoardStore.getState().boardViewMode).toBe('all-items-view');
    });

    it('recalculates columns when board view mode changes', () => {
      const items: ItemWithClaims[] = [
        createMockItem({
          id: 'item-1',
          required_count: 5,
          total_claimed: 2,
          total_packed: 0,
          claims: [createMockClaim('user-1', 2, false)],
        }),
      ];

      useBoardStore.setState({
        currentUserId: 'user-1',
        boardViewMode: 'my-view',
      });
      let store = useBoardStore.getState();
      store.setItems(items);

      // In my-view, user's item is in claimed
      let columns = useBoardStore.getState().columns;
      expect(columns.claimed).toEqual(['item-1']);

      // Switch to all-items-view
      store = useBoardStore.getState();
      store.setBoardViewMode('all-items-view');

      // In all-items-view, item is in unassigned (partially claimed overall)
      columns = useBoardStore.getState().columns;
      expect(columns.unassigned).toEqual(['item-1']);
    });
  });

  describe('setViewMode', () => {
    it('changes view mode', () => {
      const store = useBoardStore.getState();
      store.setViewMode('kanban');

      expect(useBoardStore.getState().viewMode).toBe('kanban');
    });
  });

  describe('setIsAdmin', () => {
    it('sets admin status', () => {
      const store = useBoardStore.getState();
      store.setIsAdmin(true);

      expect(useBoardStore.getState().isAdmin).toBe(true);
    });
  });
});
