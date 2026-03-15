import { act, waitFor } from '@testing-library/react';
import { useBoardStore } from '@/store/board-store';
import { ItemWithClaims } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { updateItemsSortOrder, updateClaimsSortOrder } from '@/lib/supabase/items';
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

// Import the mocked functions
import { updateClaim } from '@/lib/supabase/items';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockUpdateItemsSortOrder = updateItemsSortOrder as jest.MockedFunction<
  typeof updateItemsSortOrder
>;
const mockUpdateClaimsSortOrder = updateClaimsSortOrder as jest.MockedFunction<
  typeof updateClaimsSortOrder
>;
const mockUpdateClaim = updateClaim as jest.MockedFunction<typeof updateClaim>;

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

  // Setup default mock responses
  mockUpdateItemsSortOrder.mockResolvedValue({ error: null });
  mockUpdateClaimsSortOrder.mockResolvedValue({ error: null });
  mockUpdateClaim.mockResolvedValue({ data: null, error: null });
});

describe('Board Store Integration - Drag & Drop Workflow', () => {
  it('should handle drag from unassigned to claimed', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('my-view');
      store.setItems([createMockItem({ id: itemId, required_count: 3 })]);
    });

    const initialColumns = useBoardStore.getState().columns;
    expect(initialColumns.unassigned).toContain(itemId);
    expect(initialColumns.claimed).not.toContain(itemId);

    // Simulate drag from unassigned to claimed
    await act(async () => {
      await store.moveItem(itemId, 'unassigned', 'claimed');
    });

    // Verify column changed
    await waitFor(() => {
      const columns = useBoardStore.getState().columns;
      expect(columns.claimed).toContain(itemId);
      expect(columns.unassigned).not.toContain(itemId);
    });
  });

  it('should handle drag from claimed to packed', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';
    const claimId = 'claim-user-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('my-view');
      store.setItems([
        createMockItem({
          id: itemId,
          claims: [createMockClaim(currentUserId, 2, false, claimId)],
        }),
      ]);
    });

    // Verify item is in claimed column
    const initialColumns = useBoardStore.getState().columns;
    expect(initialColumns.claimed).toContain(itemId);

    // Simulate drag from claimed to packed
    await act(async () => {
      await store.moveItem(itemId, 'claimed', 'packed');
    });

    // Verify column changed to packed
    await waitFor(() => {
      const columns = useBoardStore.getState().columns;
      expect(columns.packed).toContain(itemId);
      expect(columns.claimed).not.toContain(itemId);
    });
  });

  it('should handle same-column reordering', async () => {
    const currentUserId = 'user-1';
    const items = [
      createMockItem({ id: 'item-1', sort_order: 0 }),
      createMockItem({ id: 'item-2', sort_order: 1 }),
      createMockItem({ id: 'item-3', sort_order: 2 }),
    ];

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('all-items-view');
      store.setItems(items);
    });

    const initialColumns = useBoardStore.getState().columns;
    expect(initialColumns.unassigned).toEqual(['item-1', 'item-2', 'item-3']);

    // Reorder item-1 from position 0 to position 2
    act(() => {
      store.reorderItem('item-1', 'unassigned', 2);
    });

    // Verify local column state changed
    const columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toEqual(['item-2', 'item-3', 'item-1']);
  });

  it('should persist reorder to database for unassigned column', async () => {
    const currentUserId = 'user-1';
    const items = [
      createMockItem({ id: 'item-1', sort_order: 0 }),
      createMockItem({ id: 'item-2', sort_order: 1 }),
    ];

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('all-items-view');
      store.setItems(items);
    });

    // Reorder items
    act(() => {
      store.reorderItem('item-2', 'unassigned', 0);
    });

    // Persist reorder
    await act(async () => {
      await store.persistReorder('unassigned');
    });

    // Verify API was called with correct sort orders
    await waitFor(() => {
      expect(mockUpdateItemsSortOrder).toHaveBeenCalledWith(mockSupabaseClient, [
        { id: 'item-2', sort_order: 0 },
        { id: 'item-1', sort_order: 1 },
      ]);
    });
  });

  it('should persist reorder of claims in My-View for claimed column', async () => {
    const currentUserId = 'user-1';
    const claim1Id = 'claim-1';
    const claim2Id = 'claim-2';

    const items = [
      createMockItem({
        id: 'item-1',
        claims: [
          createMockClaim(currentUserId, 1, false, claim1Id),
          createMockClaim(currentUserId, 1, false, claim2Id),
        ],
      }),
      createMockItem({
        id: 'item-2',
        claims: [createMockClaim(currentUserId, 1, false, 'claim-3')],
      }),
    ];

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('my-view');
      store.setItems(items);
    });

    // Get initial state - items should be in claimed column
    let columns = useBoardStore.getState().columns;
    expect(columns.claimed).toEqual(['item-1', 'item-2']);

    // Reorder items
    act(() => {
      store.reorderItem('item-2', 'claimed', 0);
    });

    columns = useBoardStore.getState().columns;
    expect(columns.claimed).toEqual(['item-2', 'item-1']);

    // Persist reorder - in My-View, this should update claim sort orders
    await act(async () => {
      await store.persistReorder('claimed');
    });

    // In My-View, claimed column reordering should update claim sort orders
    await waitFor(() => {
      expect(mockUpdateClaimsSortOrder).toHaveBeenCalled();
    });
  });

  it('should persist reorder of claims in My-View for packed column', async () => {
    const currentUserId = 'user-1';
    const claim1Id = 'claim-1';
    const claim2Id = 'claim-2';

    const items = [
      createMockItem({
        id: 'item-1',
        claims: [
          createMockClaim(currentUserId, 1, true, claim1Id),
          createMockClaim(currentUserId, 1, true, claim2Id),
        ],
      }),
      createMockItem({
        id: 'item-2',
        claims: [createMockClaim(currentUserId, 1, true, 'claim-3')],
      }),
    ];

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('my-view');
      store.setItems(items);
    });

    // Get initial state
    let columns = useBoardStore.getState().columns;
    expect(columns.packed).toEqual(['item-1', 'item-2']);

    // Reorder items
    act(() => {
      store.reorderItem('item-2', 'packed', 0);
    });

    columns = useBoardStore.getState().columns;
    expect(columns.packed).toEqual(['item-2', 'item-1']);

    // Persist reorder
    await act(async () => {
      await store.persistReorder('packed');
    });

    // In My-View, packed column reordering should update claim sort orders
    await waitFor(() => {
      expect(mockUpdateClaimsSortOrder).toHaveBeenCalled();
    });
  });

  it('should handle reordering errors gracefully', async () => {
    const currentUserId = 'user-1';
    const items = [
      createMockItem({ id: 'item-1', sort_order: 0 }),
      createMockItem({ id: 'item-2', sort_order: 1 }),
    ];

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('all-items-view');
      store.setItems(items);
    });

    // Reorder items
    act(() => {
      store.reorderItem('item-2', 'unassigned', 0);
    });

    // Mock error response - throw error to trigger catch block
    mockUpdateItemsSortOrder.mockRejectedValue(new Error('Database error'));

    // Persist reorder
    await act(async () => {
      await store.persistReorder('unassigned');
    });

    // Verify error was set
    await waitFor(() => {
      const state = useBoardStore.getState();
      expect(state.error).toBe('Database error');
    });
  });

  it('should handle drag from packed to claimed (mark as not packed)', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';
    const claimId = 'claim-user-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('my-view');
      store.setItems([
        createMockItem({
          id: itemId,
          claims: [createMockClaim(currentUserId, 2, true, claimId)],
        }),
      ]);
    });

    const initialColumns = useBoardStore.getState().columns;
    expect(initialColumns.packed).toContain(itemId);

    // Simulate drag from packed to claimed
    await act(async () => {
      await store.moveItem(itemId, 'packed', 'claimed');
    });

    // Verify column changed
    await waitFor(() => {
      const columns = useBoardStore.getState().columns;
      expect(columns.claimed).toContain(itemId);
      expect(columns.packed).not.toContain(itemId);
    });
  });

  it('should handle multiple items reorder in unassigned column', async () => {
    const currentUserId = 'user-1';
    const items = [
      createMockItem({ id: 'item-1', sort_order: 0 }),
      createMockItem({ id: 'item-2', sort_order: 1 }),
      createMockItem({ id: 'item-3', sort_order: 2 }),
      createMockItem({ id: 'item-4', sort_order: 3 }),
    ];

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setBoardViewMode('all-items-view');
      store.setItems(items);
    });

    // Multiple reorders
    act(() => {
      store.reorderItem('item-4', 'unassigned', 0);
      store.reorderItem('item-2', 'unassigned', 3);
    });

    const columns = useBoardStore.getState().columns;
    expect(columns.unassigned).toEqual(['item-4', 'item-1', 'item-3', 'item-2']);

    // Persist all changes
    await act(async () => {
      await store.persistReorder('unassigned');
    });

    await waitFor(() => {
      expect(mockUpdateItemsSortOrder).toHaveBeenCalledWith(mockSupabaseClient, [
        { id: 'item-4', sort_order: 0 },
        { id: 'item-1', sort_order: 1 },
        { id: 'item-3', sort_order: 2 },
        { id: 'item-2', sort_order: 3 },
      ]);
    });
  });
});
