import { act, waitFor } from '@testing-library/react';
import { useBoardStore } from '@/store/board-store';
import { ItemWithClaims } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { claimItem, updateClaim, removeClaim, updateClaimQuantity } from '@/lib/supabase/items';
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
const mockClaimItem = claimItem as jest.MockedFunction<typeof claimItem>;
const mockUpdateClaim = updateClaim as jest.MockedFunction<typeof updateClaim>;
const mockUpdateClaimQuantity = updateClaimQuantity as jest.MockedFunction<
  typeof updateClaimQuantity
>;
const mockRemoveClaim = removeClaim as jest.MockedFunction<typeof removeClaim>;

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
  mockClaimItem.mockResolvedValue({ data: null, error: null });
  mockUpdateClaim.mockResolvedValue({ data: null, error: null });
  mockUpdateClaimQuantity.mockResolvedValue({ data: null, error: null });
  mockRemoveClaim.mockResolvedValue({ error: null });
});

describe('Board Store Integration - Claiming Workflow', () => {
  it('should complete claim → pack → unclaim cycle', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';

    const store = useBoardStore.getState();

    // Setup: Set trip and user
    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: itemId,
          required_count: 5,
          claims: [],
        }),
      ]);
    });

    // Step 1: Claim the item
    await act(async () => {
      await store.claimItem(itemId, 3);
    });

    let claimId: string;
    await waitFor(() => {
      const state = useBoardStore.getState();
      expect(state.items[0].claims).toHaveLength(1);
      expect(state.items[0].claims[0].quantity).toBe(3);
      expect(state.items[0].total_claimed).toBe(3);
      expect(mockClaimItem).toHaveBeenCalledWith(
        mockSupabaseClient,
        itemId,
        'trip-1',
        currentUserId,
        3
      );
      // Get the actual claim ID created by the optimistic update
      claimId = state.items[0].claims[0].id;
    });

    // Step 2: Mark as packed
    await act(async () => {
      await store.markAsPacked(claimId);
    });

    await waitFor(() => {
      const state = useBoardStore.getState();
      expect(state.items[0].claims[0].is_packed).toBe(true);
      expect(state.items[0].total_packed).toBe(3);
      expect(mockUpdateClaim).toHaveBeenCalledWith(mockSupabaseClient, claimId, {
        is_packed: true,
      });
    });

    // Step 3: Unclaim the item
    await act(async () => {
      await store.unclaimItem(claimId, 3);
    });

    await waitFor(() => {
      const state = useBoardStore.getState();
      expect(state.items[0].claims).toHaveLength(0);
      expect(state.items[0].total_claimed).toBe(0);
      expect(state.items[0].total_packed).toBe(0);
    });
  });

  it('should handle partial claim → pack → partial unclaim cycle', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';
    const claimId = 'claim-user-1';

    const store = useBoardStore.getState();

    // Setup: Set trip and user with item that has some claims
    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: itemId,
          required_count: 10,
          claims: [createMockClaim(currentUserId, 5, false, claimId)],
          total_claimed: 5,
        }),
      ]);
    });

    // Step 1: Mark partial quantity as packed
    await act(async () => {
      await store.markAsPacked(claimId);
    });

    await waitFor(() => {
      const state = useBoardStore.getState();
      expect(state.items[0].claims[0].is_packed).toBe(true);
      expect(state.items[0].total_packed).toBe(5);
    });

    // Step 2: Partially unclaim (remove 2 out of 5)
    await act(async () => {
      await store.unclaimItem(claimId, 2);
    });

    await waitFor(() => {
      const state = useBoardStore.getState();
      expect(state.items[0].claims[0].quantity).toBe(3); // 5 - 2 = 3
      expect(state.items[0].total_claimed).toBe(3);
      expect(state.items[0].total_packed).toBe(3); // Packed amount also reduces
    });
  });

  it('should handle multi-user partial claims correctly', async () => {
    const user1Id = 'user-1';
    const user2Id = 'user-2';
    const itemId = 'item-1';
    const claim1Id = 'claim-user-1';
    const claim2Id = 'claim-user-2';

    const store = useBoardStore.getState();

    // Setup: Item with multiple user claims
    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(user1Id);
      store.setBoardViewMode('all-items-view');
      store.setItems([
        createMockItem({
          id: itemId,
          required_count: 10,
          claims: [
            createMockClaim(user1Id, 5, false, claim1Id),
            createMockClaim(user2Id, 3, false, claim2Id),
          ],
          total_claimed: 8,
        }),
      ]);
    });

    // Verify both claims are visible in all-items-view
    const state = useBoardStore.getState();
    expect(state.items[0].claims).toHaveLength(2);
    expect(state.items[0].total_claimed).toBe(8);
  });

  it('should update all components when store changes', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';

    const store = useBoardStore.getState();

    // Setup initial state
    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: itemId,
          required_count: 5,
          claims: [],
        }),
      ]);
    });

    // Get the initial columns
    const initialColumns = useBoardStore.getState().columns;
    expect(initialColumns.unassigned).toContain(itemId);

    // Claim the item
    await act(async () => {
      await store.claimItem(itemId, 2);
    });

    // Verify columns were recalculated
    await waitFor(() => {
      const updatedColumns = useBoardStore.getState().columns;
      expect(updatedColumns.claimed).toContain(itemId);
    });
  });
});

describe('Board Store Integration - Error Handling', () => {
  it('should handle claim errors gracefully', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';

    mockClaimItem.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'Claim failed' },
    });

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([createMockItem({ id: itemId })]);
    });

    await act(async () => {
      await store.claimItem(itemId, 2);
    });

    // Optimistic update should have applied, but error should be set
    await waitFor(() => {
      const state = useBoardStore.getState();
      // The error message fallback is 'Failed to claim item' because PostgrestError is not an instance of Error
      expect(state.error).toBe('Failed to claim item');
    });
  });

  it('should handle markAsPacked errors gracefully', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';
    const claimId = 'claim-user-1';

    mockUpdateClaim.mockResolvedValue({
      data: null,
      error: { code: 'P0002', message: 'Update failed' },
    });

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: itemId,
          claims: [createMockClaim(currentUserId, 2, false, claimId)],
        }),
      ]);
    });

    await act(async () => {
      await store.markAsPacked(claimId);
    });

    await waitFor(() => {
      const state = useBoardStore.getState();
      expect(state.error).toBe('Failed to mark as packed');
    });
  });
});

describe('Board Store Integration - Move Item', () => {
  it('should handle drag from unassigned to claimed', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([createMockItem({ id: itemId, required_count: 3 })]);
    });

    const initialColumns = useBoardStore.getState().columns;
    expect(initialColumns.unassigned).toContain(itemId);

    // Simulate drag from unassigned to claimed
    await act(async () => {
      await store.moveItem(itemId, 'unassigned', 'claimed');
    });

    // Verify column change
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
      store.setItems([
        createMockItem({
          id: itemId,
          claims: [createMockClaim(currentUserId, 2, false, claimId)],
        }),
      ]);
    });

    act(() => {
      // Ensure item starts in claimed column
      store.setItems([
        createMockItem({
          id: itemId,
          claims: [createMockClaim(currentUserId, 2, false, claimId)],
        }),
      ]);
    });

    // Simulate drag from claimed to packed
    await act(async () => {
      await store.moveItem(itemId, 'claimed', 'packed');
    });

    // Verify column change
    await waitFor(() => {
      const columns = useBoardStore.getState().columns;
      expect(columns.packed).toContain(itemId);
    });
  });

  it('should handle drag from claimed to unassigned (unclaim)', async () => {
    const currentUserId = 'user-1';
    const itemId = 'item-1';
    const claimId = 'claim-user-1';

    const store = useBoardStore.getState();

    act(() => {
      store.setTripId('trip-1');
      store.setCurrentUserId(currentUserId);
      store.setItems([
        createMockItem({
          id: itemId,
          claims: [createMockClaim(currentUserId, 2, false, claimId)],
        }),
      ]);
    });

    // Simulate drag from claimed to unassigned
    await act(async () => {
      await store.moveItem(itemId, 'claimed', 'unassigned');
    });

    // Verify column change and claim removal
    await waitFor(() => {
      const columns = useBoardStore.getState().columns;
      expect(columns.unassigned).toContain(itemId);
    });
  });
});
