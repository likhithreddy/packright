import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  getTripItems,
  claimItem,
  updateClaim,
  removeClaim,
  updateClaimQuantity,
  deleteItem,
  updateItem,
  createItem,
} from '@/lib/supabase/items';

describe('items lib functions', () => {
  const mockEq = jest.fn();
  const mockSelect = jest.fn();
  const mockFrom = jest.fn();
  const mockIn = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockSingle = jest.fn();
  const mockMaybeSingle = jest.fn();
  const mockOrder = jest.fn();
  const mockChannel = jest.fn();
  const mockOn = jest.fn();
  const mockSubscribe = jest.fn();
  const mockUpdateEq = jest.fn();

  const mockSupabase = {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: jest.fn(),
  } as unknown as SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup chain: from().select().eq().order() and from().select().in()
    // First call: .from('items').select().eq().order() - items query
    // Second call: .from('item_claims').select().in() - claims query

    // mockEq returns object that supports chaining and maybeSingle
    mockEq.mockReturnValue({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
      order: mockOrder,
    });

    // mockIn returns promise with data (for claims query)
    mockIn.mockResolvedValue({ data: [], error: null });

    // mockSelect returns object with eq, in, order, maybeSingle
    mockSelect.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      order: mockOrder,
      maybeSingle: mockMaybeSingle,
      single: mockSingle,
    });

    // Setup from() chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    // Setup insert().select().single()
    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: mockSingle,
      }),
    });

    // Setup update().eq() for updateItem (returns promise with { error })
    // Setup update().eq().select().single() for updateClaim (returns data)
    // Create a thenable object that can be awaited and has select() method
    const mockUpdateEqResult = {
      select: jest.fn().mockReturnValue({
        single: mockSingle,
      }),
      then: (resolve: (value: { error: null }) => unknown) =>
        Promise.resolve({ error: null }).then(resolve),
    };
    mockUpdateEq.mockReturnValue(mockUpdateEqResult);
    mockUpdate.mockReturnValue({
      eq: mockUpdateEq,
    });

    // Setup delete().eq()
    mockDelete.mockReturnValue({
      eq: mockEq,
    });

    // Setup channel subscription chain
    mockChannel.mockReturnValue({
      on: mockOn.mockReturnThis(),
      subscribe: mockSubscribe,
    });
  });

  describe('getTripItems', () => {
    it('successfully fetches items with aggregated claims', async () => {
      const mockItems = [
        {
          id: 'item-1',
          trip_id: 'trip-1',
          name: 'Test Item',
          required_count: 2,
          category: 'Essentials',
          created_at: new Date().toISOString(),
        },
      ];

      const mockClaims = [
        {
          id: 'claim-1',
          item_id: 'item-1',
          user_id: 'user-1',
          quantity: 1,
          is_packed: false,
          created_at: new Date().toISOString(),
        },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockItems, error: null });
      mockIn.mockResolvedValueOnce({ data: mockClaims, error: null });

      const result = await getTripItems(mockSupabase, 'trip-1');

      expect(result.error).toBeNull();
      expect(mockOrder).toHaveBeenCalledWith('sort_order', { ascending: true });
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]).toMatchObject({
        id: 'item-1',
        total_claimed: 1,
        total_packed: 0,
        claims: mockClaims,
      });
    });

    it('calculates totals correctly across multiple claims', async () => {
      const mockItems = [
        {
          id: 'item-1',
          trip_id: 'trip-1',
          name: 'Test Item',
          required_count: 5,
          category: 'Essentials',
          created_at: new Date().toISOString(),
        },
      ];

      const mockClaims = [
        {
          id: 'claim-1',
          item_id: 'item-1',
          user_id: 'user-1',
          quantity: 2,
          is_packed: true,
          created_at: new Date().toISOString(),
        },
        {
          id: 'claim-2',
          item_id: 'item-1',
          user_id: 'user-2',
          quantity: 1,
          is_packed: false,
          created_at: new Date().toISOString(),
        },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockItems, error: null });
      mockIn.mockResolvedValueOnce({ data: mockClaims, error: null });

      const result = await getTripItems(mockSupabase, 'trip-1');

      expect(result.data?.[0].total_claimed).toBe(3);
      expect(result.data?.[0].total_packed).toBe(2);
    });

    it('returns empty array when no items found', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null });

      const result = await getTripItems(mockSupabase, 'trip-1');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('handles items with no claims', async () => {
      const mockItems = [
        {
          id: 'item-1',
          trip_id: 'trip-1',
          name: 'Test Item',
          required_count: 2,
          category: 'Essentials',
          created_at: new Date().toISOString(),
        },
      ];

      mockOrder.mockResolvedValueOnce({ data: mockItems, error: null });
      mockIn.mockResolvedValueOnce({ data: [], error: null });

      const result = await getTripItems(mockSupabase, 'trip-1');

      expect(result.data?.[0].total_claimed).toBe(0);
      expect(result.data?.[0].total_packed).toBe(0);
      expect(result.data?.[0].claims).toEqual([]);
    });

    it('handles database errors gracefully', async () => {
      const mockError = { code: 'P0001', message: 'Database error' } as PostgrestError;
      mockOrder.mockResolvedValueOnce({ data: null, error: mockError });

      const result = await getTripItems(mockSupabase, 'trip-1');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('catches and returns exceptions', async () => {
      const error = new Error('Connection failed');
      mockOrder.mockRejectedValue(error);

      const result = await getTripItems(mockSupabase, 'trip-1');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(error);
    });

    it('should handle claims query error', async () => {
      const mockItems = [
        {
          id: 'item-1',
          trip_id: 'trip-1',
          name: 'Test Item',
          required_count: 2,
          category: 'Essentials',
          created_at: new Date().toISOString(),
        },
      ];
      const mockError = { code: 'P0002', message: 'Claims query failed' } as PostgrestError;

      mockOrder.mockResolvedValueOnce({ data: mockItems, error: null });
      mockIn.mockResolvedValueOnce({ data: null, error: mockError });

      const result = await getTripItems(mockSupabase, 'trip-1');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should fetch and attach profiles to claims', async () => {
      const mockItems = [
        {
          id: 'item-1',
          trip_id: 'trip-1',
          name: 'Test Item',
          required_count: 2,
          category: 'Essentials',
          created_at: new Date().toISOString(),
        },
      ];

      const mockClaims = [
        {
          id: 'claim-1',
          item_id: 'item-1',
          user_id: 'user-1',
          quantity: 1,
          is_packed: false,
          created_at: new Date().toISOString(),
        },
      ];

      const mockProfiles = [
        {
          id: 'user-1',
          full_name: 'Test User',
          username: 'testuser',
          avatar_theme: 'blue',
        },
      ];

      const mockInForProfiles = jest.fn().mockResolvedValue({
        data: mockProfiles,
        error: null,
      });

      // Reset the mock select to include profiles query
      const mockSelectWithProfiles = jest.fn((selector: string) => {
        if (selector === '*') {
          return {
            eq: mockEq,
            in: mockIn,
            order: mockOrder,
            maybeSingle: mockMaybeSingle,
            single: mockSingle,
          };
        }
        // For profiles query
        return {
          in: mockInForProfiles,
        };
      });

      mockFrom.mockReturnValue({
        select: mockSelectWithProfiles,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      });

      mockOrder.mockResolvedValueOnce({ data: mockItems, error: null });
      mockIn.mockResolvedValueOnce({ data: mockClaims, error: null });

      const result = await getTripItems(mockSupabase, 'trip-1');

      expect(result.error).toBeNull();
      expect(result.data?.[0].claims[0].profiles).toEqual([
        {
          full_name: 'Test User',
          username: 'testuser',
          avatar_theme: 'blue',
        },
      ]);
    });

    it('should handle missing profile gracefully', async () => {
      const mockItems = [
        {
          id: 'item-1',
          trip_id: 'trip-1',
          name: 'Test Item',
          required_count: 2,
          category: 'Essentials',
          created_at: new Date().toISOString(),
        },
      ];

      const mockClaims = [
        {
          id: 'claim-1',
          item_id: 'item-1',
          user_id: 'user-1',
          quantity: 1,
          is_packed: false,
          created_at: new Date().toISOString(),
        },
      ];

      // Return empty profiles for the user (missing profile)
      const mockInForProfiles = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
        maybeSingle: mockMaybeSingle,
        single: mockSingle,
        // @ts-ignore - adding mock for profiles query
        select: jest.fn().mockReturnValue({ in: mockInForProfiles }),
      });

      mockOrder.mockResolvedValueOnce({ data: mockItems, error: null });
      mockIn.mockResolvedValueOnce({ data: mockClaims, error: null });

      const result = await getTripItems(mockSupabase, 'trip-1');

      // Should handle missing profile by setting profiles to null
      expect(result.data?.[0].claims[0].profiles).toBeNull();
    });
  });

  describe('claimItem', () => {
    beforeEach(() => {
      // Finalize the chain for claimItem
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });
      mockInsert.mockReturnValue({
        select: mockSelect.mockReturnThis(),
      });
      mockSelect.mockReturnValue({
        eq: mockEq.mockReturnThis(),
        maybeSingle: mockMaybeSingle,
        single: mockSingle,
        select: mockSelect.mockReturnThis(),
      });
    });

    it('successfully creates a claim', async () => {
      const mockClaim = {
        id: 'claim-1',
        item_id: 'item-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        quantity: 2,
        is_packed: false,
        created_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValue({ data: mockClaim, error: null });

      const result = await claimItem(mockSupabase, 'item-1', 'trip-1', 'user-1', 2);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockClaim);
      expect(mockInsert).toHaveBeenCalledWith({
        item_id: 'item-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        quantity: 2,
        is_packed: false,
      });
    });

    it('handles claim creation errors', async () => {
      const mockError = { code: 'P0001', message: 'Claim already exists' } as PostgrestError;
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await claimItem(mockSupabase, 'item-1', 'trip-1', 'user-1', 2);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle fetch error when checking existing claim', async () => {
      const mockError = { code: 'P0002', message: 'Fetch failed' } as PostgrestError;
      mockMaybeSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await claimItem(mockSupabase, 'item-1', 'trip-1', 'user-1', 2);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should update existing claim quantity instead of inserting new', async () => {
      const mockExistingClaim = { id: 'claim-1', quantity: 2 };
      const mockUpdatedClaim = {
        id: 'claim-1',
        item_id: 'item-1',
        trip_id: 'trip-1',
        user_id: 'user-1',
        quantity: 5,
        is_packed: false,
        created_at: new Date().toISOString(),
      };

      mockMaybeSingle.mockResolvedValue({ data: mockExistingClaim, error: null });
      mockSingle.mockResolvedValue({ data: mockUpdatedClaim, error: null });

      const result = await claimItem(mockSupabase, 'item-1', 'trip-1', 'user-1', 3);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockUpdatedClaim);
      expect(mockUpdate).toHaveBeenCalledWith({ quantity: 5 }); // 2 + 3
    });
  });

  describe('updateClaim', () => {
    it('successfully updates a claim', async () => {
      const mockClaim = {
        id: 'claim-1',
        item_id: 'item-1',
        user_id: 'user-1',
        quantity: 2,
        is_packed: true,
        created_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValue({ data: mockClaim, error: null });

      const result = await updateClaim(mockSupabase, 'claim-1', { is_packed: true });

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockClaim);
      expect(mockUpdate).toHaveBeenCalledWith({ is_packed: true });
      // The eq mock should have been called with 'id' and 'claim-1'
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'claim-1');
    });

    it('handles update errors', async () => {
      const mockError = { code: 'P0001', message: 'Claim not found' };

      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await updateClaim(mockSupabase, 'claim-1', { is_packed: true });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('removeClaim', () => {
    it('successfully removes a claim', async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await removeClaim(mockSupabase, 'claim-1');

      expect(result.error).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'claim-1');
    });

    it('handles removal errors', async () => {
      const mockError = { code: 'P0001', message: 'Claim not found' };
      mockEq.mockResolvedValue({ error: mockError });

      const result = await removeClaim(mockSupabase, 'claim-1');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('updateClaimQuantity', () => {
    it('should update claim quantity successfully', async () => {
      const mockClaim = {
        id: 'claim-1',
        item_id: 'item-1',
        user_id: 'user-1',
        quantity: 5,
        is_packed: false,
        created_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValue({ data: mockClaim, error: null });

      const result = await updateClaimQuantity(mockSupabase, 'claim-1', 5);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockClaim);
      expect(mockUpdate).toHaveBeenCalledWith({ quantity: 5 });
      // The eq mock should have been called with 'id' and 'claim-1'
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'claim-1');
    });

    it('should handle update quantity errors', async () => {
      const mockError = { code: 'P0001', message: 'Update failed' } as PostgrestError;

      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await updateClaimQuantity(mockSupabase, 'claim-1', 3);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await deleteItem(mockSupabase, 'item-1');

      expect(result.error).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'item-1');
    });

    it('should handle delete errors', async () => {
      const mockError = { code: 'P0001', message: 'Delete failed' } as PostgrestError;
      mockEq.mockResolvedValue({ error: mockError });

      const result = await deleteItem(mockSupabase, 'item-1');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('updateItem', () => {
    it('should update item fields successfully', async () => {
      const result = await updateItem(mockSupabase, 'item-1', {
        name: 'Updated Item',
        required_count: 5,
        claim_type: 'individual',
      });

      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'Updated Item',
        required_count: 5,
        claim_type: 'individual',
      });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'item-1');
    });

    it('should handle partial updates', async () => {
      const result = await updateItem(mockSupabase, 'item-1', { name: 'New Name' });

      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({ name: 'New Name' });
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'item-1');
    });
  });

  describe('createItem', () => {
    beforeEach(() => {
      // Setup mocks for createItem
      mockFrom.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
        in: mockIn,
        order: mockOrder,
        maybeSingle: mockMaybeSingle,
        single: mockSingle,
      });

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      });
    });

    it('should create an item successfully', async () => {
      const mockNewItem = {
        id: 'new-item-1',
        trip_id: 'trip-1',
        name: 'New Item',
        required_count: 2,
        category: 'Essentials',
        claim_type: 'single' as const,
        sort_order: 0,
        created_at: new Date().toISOString(),
        claims: [],
      };

      // Mock the order query to return empty list (no existing items)
      mockOrder.mockResolvedValueOnce({ data: null, error: null });
      // Mock the insert to return the new item
      mockSingle.mockResolvedValueOnce({ data: mockNewItem, error: null });

      const result = await createItem(mockSupabase, 'trip-1', {
        name: 'New Item',
        required_count: 2,
        category: 'Essentials',
        claim_type: 'single',
      });

      expect(result.error).toBeNull();
      expect(result.data).toMatchObject({
        id: 'new-item-1',
        name: 'New Item',
        required_count: 2,
        category: 'Essentials',
        claim_type: 'single',
        sort_order: 0,
        total_claimed: 0,
        total_packed: 0,
        claims: [],
      });
    });

    it('should set sort_order correctly based on existing items', async () => {
      const mockExistingItem = {
        id: 'existing-item',
        sort_order: 5,
      };
      const mockNewItem = {
        id: 'new-item-1',
        trip_id: 'trip-1',
        name: 'New Item',
        required_count: 1,
        category: 'Clothing',
        claim_type: 'multiple' as const,
        sort_order: 6, // Should be existing sort_order + 1
        created_at: new Date().toISOString(),
        claims: [],
      };

      // Mock the order query to return an existing item with sort_order 5
      mockOrder.mockResolvedValueOnce({ data: mockExistingItem, error: null });
      // Mock the insert to return the new item
      mockSingle.mockResolvedValueOnce({ data: mockNewItem, error: null });

      const result = await createItem(mockSupabase, 'trip-1', {
        name: 'New Item',
        required_count: 1,
        category: 'Clothing',
        claim_type: 'multiple',
      });

      expect(result.error).toBeNull();
      expect(result.data?.sort_order).toBe(6);
    });

    it('should handle database errors during item creation', async () => {
      const mockError = { code: 'P0001', message: 'Insert failed' } as PostgrestError;

      // Mock the order query to return empty list
      mockOrder.mockResolvedValueOnce({ data: null, error: null });
      // Mock the insert to return an error
      mockSingle.mockResolvedValueOnce({ data: null, error: mockError });

      const result = await createItem(mockSupabase, 'trip-1', {
        name: 'New Item',
        required_count: 1,
        category: 'Essentials',
        claim_type: 'single',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle errors when fetching existing items', async () => {
      const mockError = { code: 'P0002', message: 'Query failed' } as PostgrestError;

      // Mock the order query to return an error
      mockOrder.mockResolvedValueOnce({ data: null, error: mockError });

      const result = await createItem(mockSupabase, 'trip-1', {
        name: 'New Item',
        required_count: 1,
        category: 'Essentials',
        claim_type: 'single',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should catch and return exceptions', async () => {
      const error = new Error('Connection failed');
      mockOrder.mockRejectedValue(error);

      const result = await createItem(mockSupabase, 'trip-1', {
        name: 'New Item',
        required_count: 1,
        category: 'Essentials',
        claim_type: 'single',
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });
});
