import { act } from '@testing-library/react';
import { useBoardStore } from '@/store/board-store';
import { ItemWithClaims } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

// Mock items module but NOT board-store (we want real board-store)
jest.mock('@/lib/supabase/items', () => ({
  claimItem: jest.fn(),
  updateClaim: jest.fn(),
  updateClaimQuantity: jest.fn(),
  removeClaim: jest.fn(),
  updateItemsSortOrder: jest.fn(),
  updateClaimsSortOrder: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

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
const createMockClaim = (
  userId: string,
  quantity: number,
  isPacked: boolean,
  id: string = `claim-${userId}`
) => ({
  id,
  item_id: 'item-1',
  trip_id: 'trip-1',
  user_id: userId,
  quantity,
  is_packed: isPacked,
  sort_order: 0,
  created_at: new Date().toISOString(),
  profiles: null,
});

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  channel: jest.fn(),
} as unknown as SupabaseClient;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateClient.mockReturnValue(mockSupabaseClient);

  // Reset store state
  useBoardStore.setState({
    tripId: null,
    items: [],
    columns: { unassigned: [], claimed: [], packed: [] },
    readinessPercentage: null,
    isLoading: false,
    error: null,
    currentUserId: null,
    boardViewMode: 'my-view',
    viewMode: 'kanban',
    isAdmin: false,
    currentUserProfile: null,
  });
});

describe('Board Store Integration - View Mode Workflow', () => {
  it('should recalculate columns when switching to my-view', () => {
    const currentUserId = 'user-1';
    const otherUserId = 'user-2';

    const store = useBoardStore.getState();

    // Setup: Create items with mixed claims
    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('all-items-view');
      store.setItems([
        createMockItem({
          id: 'item-1',
          required_count: 7,
          claims: [
            createMockClaim(currentUserId, 3, false, 'claim-1'),
            createMockClaim(otherUserId, 2, false, 'claim-2'),
          ],
          total_claimed: 5,
          total_packed: 0,
        }),
        createMockItem({
          id: 'item-2',
          required_count: 3,
          claims: [createMockClaim(currentUserId, 2, true, 'claim-3')],
          total_claimed: 2,
          total_packed: 2,
        }),
      ]);
    });

    // In all-items-view:
    // item-1: fully claimed -> claimed column
    // item-2: partially claimed but packed -> claimed and packed columns
    let columns = useBoardStore.getState().columns;
    expect(columns.claimed).toContain('item-1');
    expect(columns.packed).toContain('item-2');

    // Switch to my-view
    act(() => {
      store.setBoardViewMode('my-view');
    });

    // In my-view (for user-1):
    // item-1: claimed by user-1 (3) + still needs (2) -> claimed + unassigned
    // item-2: packed by user-1 -> packed
    columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toContain('item-1'); // Still needs 2 more
    expect(columns.claimed).toContain('item-1'); // User has 3
    expect(columns.packed).toContain('item-2');
  });

  it('should recalculate columns when switching to all-items-view', () => {
    const currentUserId = 'user-1';
    const otherUserId = 'user-2';

    const store = useBoardStore.getState();

    // Setup: Create items with mixed claims
    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('my-view');
      store.setItems([
        createMockItem({
          id: 'item-1',
          required_count: 5,
          claims: [
            createMockClaim(currentUserId, 3, false, 'claim-1'),
            createMockClaim(otherUserId, 1, false, 'claim-2'),
          ],
          total_claimed: 4,
        }),
      ]);
    });

    // Start in my-view
    let columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toContain('item-1'); // Still needs 1
    expect(columns.claimed).toContain('item-1'); // User has 3

    // Switch to all-items-view
    act(() => {
      store.setBoardViewMode('all-items-view');
    });

    // In all-items-view: still needs 1, claimed but not packed
    columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toContain('item-1');
    expect(columns.claimed).toContain('item-1');
  });

  it('should update all components on view mode change', () => {
    const currentUserId = 'user-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: 'item-1',
          required_count: 3,
          claims: [createMockClaim(currentUserId, 2, false, 'claim-1')],
          total_claimed: 2,
        }),
      ]);
    });

    // Get initial state in my-view
    const myViewColumns = useBoardStore.getState().columns;
    expect(myViewColumns.claimed).toContain('item-1');

    // Switch to all-items-view
    act(() => {
      store.setBoardViewMode('all-items-view');
    });

    // Verify columns were recalculated
    const allItemsViewColumns = useBoardStore.getState().columns;
    expect(allItemsViewColumns.claimed).toContain('item-1');

    // Switch back to my-view
    act(() => {
      store.setBoardViewMode('my-view');
    });

    // Verify columns were recalculated back
    const backToMyViewColumns = useBoardStore.getState().columns;
    expect(backToMyViewColumns.claimed).toContain('item-1');
  });

  it('should handle items with no claims in different view modes', () => {
    const currentUserId = 'user-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: 'item-1',
          required_count: 3,
          claims: [],
        }),
      ]);
    });

    // In my-view: unassigned
    act(() => {
      store.setBoardViewMode('my-view');
    });
    let columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toContain('item-1');
    expect(columns.claimed).not.toContain('item-1');
    expect(columns.packed).not.toContain('item-1');

    // In all-items-view: still unassigned
    act(() => {
      store.setBoardViewMode('all-items-view');
    });
    columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toContain('item-1');
    expect(columns.claimed).not.toContain('item-1');
    expect(columns.packed).not.toContain('item-1');
  });

  it('should handle fully packed items in different view modes', () => {
    const currentUserId = 'user-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: 'item-1',
          required_count: 3,
          claims: [createMockClaim(currentUserId, 3, true, 'claim-1')],
          total_claimed: 3,
          total_packed: 3,
        }),
      ]);
    });

    // In my-view: packed
    act(() => {
      store.setBoardViewMode('my-view');
    });
    let columns = useBoardStore.getState().columns;
    expect(columns.packed).toContain('item-1');
    expect(columns.unassigned).not.toContain('item-1');
    expect(columns.claimed).not.toContain('item-1');

    // In all-items-view: still packed
    act(() => {
      store.setBoardViewMode('all-items-view');
    });
    columns = useBoardStore.getState().columns;
    expect(columns.packed).toContain('item-1');
  });

  it('should handle items claimed by other users in my-view', () => {
    const currentUserId = 'user-1';
    const otherUserId = 'user-2';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('my-view');
      store.setItems([
        createMockItem({
          id: 'item-1',
          required_count: 3,
          claims: [createMockClaim(otherUserId, 3, false, 'claim-1')],
          total_claimed: 3,
        }),
      ]);
    });

    // In my-view: item not in any column for current user
    const columns = useBoardStore.getState().columns;
    expect(columns.unassigned).not.toContain('item-1');
    expect(columns.claimed).not.toContain('item-1');
    expect(columns.packed).not.toContain('item-1');
  });

  it('should maintain readiness percentage across view mode changes', () => {
    const currentUserId = 'user-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: 'item-1',
          required_count: 5,
          claims: [createMockClaim(currentUserId, 2, true, 'claim-1')],
          total_claimed: 2,
          total_packed: 2,
        }),
        createMockItem({
          id: 'item-2',
          required_count: 5,
          claims: [createMockClaim(currentUserId, 5, true, 'claim-2')],
          total_claimed: 5,
          total_packed: 5,
        }),
      ]);
    });

    // Readiness should be (2 + 5) / (5 + 5) = 7/10 = 70%
    let readiness = useBoardStore.getState().readinessPercentage;
    expect(readiness).toBe(70);

    // Switch view mode
    act(() => {
      store.setBoardViewMode('all-items-view');
    });

    // Readiness should stay the same
    readiness = useBoardStore.getState().readinessPercentage;
    expect(readiness).toBe(70);
  });

  it('should handle switching view modes with no current user', () => {
    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(null);
      store.setBoardViewMode('my-view');
      store.setItems([
        createMockItem({
          id: 'item-1',
          required_count: 3,
          claims: [],
        }),
      ]);
    });

    // With no current user in my-view, items should still appear in unassigned
    let columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toContain('item-1');

    // Switch to all-items-view
    act(() => {
      store.setBoardViewMode('all-items-view');
    });

    // Items should still be in unassigned
    columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toContain('item-1');
  });

  it('should handle complex scenario with mixed item states', () => {
    const currentUserId = 'user-1';
    const otherUserId = 'user-2';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        // Item 1: Fully claimed by current user (not packed)
        createMockItem({
          id: 'item-1',
          required_count: 3,
          claims: [createMockClaim(currentUserId, 3, false, 'claim-1')],
          total_claimed: 3,
          total_packed: 0,
        }),
        // Item 2: Partially claimed by current user (still needs)
        createMockItem({
          id: 'item-2',
          required_count: 5,
          claims: [createMockClaim(currentUserId, 2, false, 'claim-2')],
          total_claimed: 2,
          total_packed: 0,
        }),
        // Item 3: Claimed and packed by current user
        createMockItem({
          id: 'item-3',
          required_count: 2,
          claims: [createMockClaim(currentUserId, 2, true, 'claim-3')],
          total_claimed: 2,
          total_packed: 2,
        }),
        // Item 4: Claimed by other user
        createMockItem({
          id: 'item-4',
          required_count: 3,
          claims: [createMockClaim(otherUserId, 3, false, 'claim-4')],
          total_claimed: 3,
          total_packed: 0,
        }),
      ]);
    });

    // Test my-view
    act(() => {
      store.setBoardViewMode('my-view');
    });
    let columns = useBoardStore.getState().columns;
    expect(columns.claimed).toContain('item-1');
    expect(columns.unassigned).toContain('item-2'); // Still needs 3
    expect(columns.claimed).toContain('item-2'); // User has 2
    expect(columns.packed).toContain('item-3');
    expect(columns.unassigned).not.toContain('item-4'); // Not visible to current user
    expect(columns.claimed).not.toContain('item-4');

    // Test all-items-view
    act(() => {
      store.setBoardViewMode('all-items-view');
    });
    columns = useBoardStore.getState().columns;
    expect(columns.claimed).toContain('item-1');
    expect(columns.unassigned).toContain('item-2');
    expect(columns.packed).toContain('item-3');
    expect(columns.claimed).toContain('item-4');
  });
});
