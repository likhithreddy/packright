import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { getTripItems, claimItem, updateClaim, removeClaim } from '@/lib/supabase/items';

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
  const mockSelectForUpdate = jest.fn();
  const mockEqForUpdate = jest.fn();
  const mockChannel = jest.fn();
  const mockOn = jest.fn();
  const mockSubscribe = jest.fn();

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

    // Setup update().eq().select().single() - use dedicated mocks
    mockEqForUpdate.mockReturnValue({
      select: mockSelectForUpdate,
    });
    mockSelectForUpdate.mockReturnValue({
      single: mockSingle,
    });
    mockUpdate.mockReturnValue({
      eq: mockEqForUpdate,
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
      expect(mockEqForUpdate).toHaveBeenCalledWith('id', 'claim-1');
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
});
