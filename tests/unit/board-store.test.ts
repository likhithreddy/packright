import { useBoardStore } from '@/store/board-store';
import { ItemWithClaims } from '@/types/board.types';

// Mock the items module using relative path
jest.mock('../../src/lib/supabase/items', () => ({
  claimItem: jest.fn(),
  updateClaim: jest.fn(),
  removeClaim: jest.fn(),
}));

import { claimItem, updateClaim, removeClaim } from '@/lib/supabase/items';

// Get the mocked functions
const mockClaimItem = claimItem as jest.MockedFunction<typeof claimItem>;
const mockUpdateClaim = updateClaim as jest.MockedFunction<typeof updateClaim>;
const mockRemoveClaim = removeClaim as jest.MockedFunction<typeof removeClaim>;

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

  beforeEach(() => {
    // Reset the store state before each test
    useBoardStore.setState({
      tripId: null,
      items: [],
      columns: { needed: [], claimed: [], packed: [] },
      isLoading: false,
      error: null,
      currentUserId: null,
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

  describe('setItems', () => {
    it('distributes items across columns based on claim status', () => {
      const store = useBoardStore.getState();
      const items: ItemWithClaims[] = [
        createMockItem({
          id: 'item-1',
          required_count: 2,
          total_claimed: 0,
          total_packed: 0,
        }),
        createMockItem({
          id: 'item-2',
          required_count: 2,
          total_claimed: 2,
          total_packed: 0,
        }),
        createMockItem({
          id: 'item-3',
          required_count: 2,
          total_claimed: 2,
          total_packed: 2,
        }),
      ];

      store.setItems(items);

      const columns = useBoardStore.getState().columns;
      expect(columns.needed).toEqual(['item-1']);
      expect(columns.claimed).toEqual(['item-2']);
      expect(columns.packed).toEqual(['item-3']);
    });

    it('handles empty items array', () => {
      const store = useBoardStore.getState();
      store.setItems([]);

      const columns = useBoardStore.getState().columns;
      expect(columns.needed).toEqual([]);
      expect(columns.claimed).toEqual([]);
      expect(columns.packed).toEqual([]);
    });
  });

  describe('setCurrentUserId', () => {
    it('sets the current user ID', () => {
      const store = useBoardStore.getState();
      store.setCurrentUserId('user-123');

      expect(useBoardStore.getState().currentUserId).toBe('user-123');
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
          needed: ['item-1'],
          claimed: [],
          packed: [],
        },
        currentUserId: 'user-1',
      });

      const store = useBoardStore.getState();
      store.moveItem('item-1', 'needed', 'claimed');

      const columns = useBoardStore.getState().columns;
      expect(columns.needed).toEqual([]);
      expect(columns.claimed).toEqual(['item-1']);
    });

    it('reorders items within the same column', () => {
      useBoardStore.setState({
        columns: {
          needed: ['item-1', 'item-2', 'item-3'],
          claimed: [],
          packed: [],
        },
      });

      const store = useBoardStore.getState();
      store.reorderItem('item-1', 'needed', 2);

      const columns = useBoardStore.getState().columns;
      expect(columns.needed).toEqual(['item-2', 'item-3', 'item-1']);
    });
  });

  describe('claimItem', () => {
    it('calls claimItem with correct parameters', async () => {
      mockClaimItem.mockResolvedValue({ data: null, error: null });

      useBoardStore.setState({
        tripId: 'trip-1',
        currentUserId: 'user-1',
      });

      const store = useBoardStore.getState();
      await store.claimItem('item-1', 2);

      expect(mockClaimItem).toHaveBeenCalledWith('item-1', 'user-1', 2);
    });

    it('sets error on claim failure', async () => {
      const mockError = new Error('Failed to claim');
      mockClaimItem.mockRejectedValue(mockError);

      useBoardStore.setState({
        tripId: 'trip-1',
        currentUserId: 'user-1',
      });

      const store = useBoardStore.getState();
      await store.claimItem('item-1', 2);

      expect(useBoardStore.getState().error).toBe('Failed to claim');
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
    it('calls updateClaim with correct parameters', async () => {
      mockUpdateClaim.mockResolvedValue({ data: null, error: null });

      const store = useBoardStore.getState();
      await store.markAsPacked('claim-1');

      expect(mockUpdateClaim).toHaveBeenCalledWith('claim-1', { is_packed: true });
    });

    it('sets error on update failure', async () => {
      const mockError = new Error('Failed to update');
      mockUpdateClaim.mockRejectedValue(mockError);

      const store = useBoardStore.getState();
      await store.markAsPacked('claim-1');

      expect(useBoardStore.getState().error).toBe('Failed to update');
    });
  });

  describe('unclaimItem', () => {
    it('calls removeClaim with correct parameters', async () => {
      mockRemoveClaim.mockResolvedValue({ error: null });

      const store = useBoardStore.getState();
      await store.unclaimItem('claim-1');

      expect(mockRemoveClaim).toHaveBeenCalledWith('claim-1');
    });

    it('sets error on remove failure', async () => {
      const mockError = new Error('Failed to remove');
      mockRemoveClaim.mockRejectedValue(mockError);

      const store = useBoardStore.getState();
      await store.unclaimItem('claim-1');

      expect(useBoardStore.getState().error).toBe('Failed to remove');
    });
  });
});
