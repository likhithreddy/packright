import { createTrip, getUserTrips } from '@/lib/supabase/trips';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockSingle = jest.fn();
const mockOrder = jest.fn();

const mockSupabase = {
  from: jest.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  }),
} as unknown as SupabaseClient;

describe('Supabase Trips Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserTrips', () => {
    it('returns trips successfully', async () => {
      const mockTrips = [{ id: '1', title: 'Trip 1' }];
      mockSelect.mockReturnValue({
        order: mockOrder.mockResolvedValue({ data: mockTrips, error: null }),
      });

      const { data, error } = await getUserTrips(mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith('trips');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('date_start', { ascending: true });
      expect(error).toBeNull();
      expect(data).toEqual(mockTrips);
    });

    it('returns error if fetching fails', async () => {
      const dbError = new Error('Database Error');
      mockSelect.mockReturnValue({
        order: mockOrder.mockResolvedValue({ data: null, error: dbError }),
      });

      const { data, error } = await getUserTrips(mockSupabase);

      expect(error).toEqual(dbError);
      expect(data).toEqual([]);
    });
  });

  describe('createTrip', () => {
    const mockInput = {
      title: 'Summer Vacation',
      destination: 'Hawaii',
      dateRange: {
        from: new Date('2026-06-01T00:00:00.000Z'),
        to: new Date('2026-06-10T00:00:00.000Z'),
      },
    };
    const mockUserId = 'user-123';
    const mockTrip = { id: 'trip-123', title: 'Summer Vacation' };

    it('formats dates as YYYY-MM-DD (not ISO timestamps with time/timezone)', async () => {
      // IDEAL: dates must be stored as YYYY-MM-DD so Postgres DATE column accepts them
      let capturedInsertPayload: Record<string, unknown> = {};
      mockInsert.mockImplementationOnce((payload: Record<string, unknown>) => {
        capturedInsertPayload = payload;
        return {
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTrip, error: null }),
          }),
        };
      });
      mockInsert.mockResolvedValueOnce({ error: null }); // member

      await createTrip(mockSupabase, mockInput, mockUserId);

      expect(capturedInsertPayload.date_start).toBe('2026-06-01');
      expect(capturedInsertPayload.date_end).toBe('2026-06-10');
      // Must NOT contain time component
      expect(capturedInsertPayload.date_start).not.toContain('T');
      expect(capturedInsertPayload.date_end).not.toContain('T');
    });

    it('inserts is_archived as false by default', async () => {
      let capturedInsertPayload: Record<string, unknown> = {};
      mockInsert.mockImplementationOnce((payload: Record<string, unknown>) => {
        capturedInsertPayload = payload;
        return {
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockTrip, error: null }),
          }),
        };
      });
      mockInsert.mockResolvedValueOnce({ error: null }); // member

      await createTrip(mockSupabase, mockInput, mockUserId);

      expect(capturedInsertPayload.is_archived).toBe(false);
    });

    it('returns warning=null when items insert succeeds', async () => {
      const mockInputWithItems = { ...mockInput, items: ['Sunscreen'] };
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });
      mockInsert.mockResolvedValueOnce({ error: null }); // member
      mockInsert.mockResolvedValueOnce({ error: null }); // items

      const { warning } = await createTrip(mockSupabase, mockInputWithItems, mockUserId);
      expect(warning).toBeNull();
    });

    it('returns warning message when items insert fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockInputWithItems = { ...mockInput, items: ['Boots'] };
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });
      mockInsert.mockResolvedValueOnce({ error: null }); // member
      mockInsert.mockResolvedValueOnce({ error: new Error('Items DB error') }); // items fail

      const { data, error, warning } = await createTrip(
        mockSupabase,
        mockInputWithItems,
        mockUserId
      );

      expect(data).toEqual(mockTrip);
      expect(error).toBeNull();
      expect(warning).toContain("Trip created, but we couldn't fetch AI suggestions");
      consoleSpy.mockRestore();
    });

    it('does not call items table when items array is empty', async () => {
      const mockInputEmpty = { ...mockInput, items: [] };
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });
      mockInsert.mockResolvedValueOnce({ error: null }); // member

      await createTrip(mockSupabase, mockInputEmpty, mockUserId);

      // Only 2 calls: trips + trip_members, NOT items
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('does not call items table when items is undefined', async () => {
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });
      mockInsert.mockResolvedValueOnce({ error: null }); // member

      await createTrip(mockSupabase, mockInput, mockUserId); // no items field

      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('creates a trip and adds the user as an admin member successfully', async () => {
      // Setup insert mock for trips returning .select().single()
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });

      // Setup insert mock for trip_members
      mockInsert.mockResolvedValueOnce({ error: null });

      const { data, error } = await createTrip(mockSupabase, mockInput, mockUserId);

      expect(mockSupabase.from).toHaveBeenNthCalledWith(1, 'trips');
      expect(mockSupabase.from).toHaveBeenNthCalledWith(2, 'trip_members');
      expect(error).toBeNull();
      expect(data).toEqual(mockTrip);
    });

    it('returns an error if inserting trip fails', async () => {
      const insertError = new Error('Insert failed');
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: null, error: insertError }),
        }),
      });

      const { data, error } = await createTrip(mockSupabase, mockInput, mockUserId);

      expect(error).toEqual(insertError);
      expect(data).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledTimes(1); // Should not call trip_members
    });

    it('returns the trip but surfaces the error if inserting member fails', async () => {
      // Setup insert mock for trips returning .select().single()
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });

      // Setup insert mock for trip_members failing
      const memberError = new Error('Member insert failed');
      mockInsert.mockResolvedValueOnce({ error: memberError });

      const { data, error } = await createTrip(mockSupabase, mockInput, mockUserId);

      expect(error).toEqual(memberError);
      expect(data).toEqual(mockTrip); // still returns the trip
    });

    it('inserts items if provided', async () => {
      const mockInputWithItems = {
        ...mockInput,
        items: ['Item 1', 'Item 2'],
      };

      // Set up mock for trip insertion
      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });

      // Set up mock for member insertion
      mockInsert.mockResolvedValueOnce({ error: null });

      // Set up mock for items insertion
      mockInsert.mockResolvedValueOnce({ error: null });

      const { data, error } = await createTrip(mockSupabase, mockInputWithItems, mockUserId);

      expect(error).toBeNull();
      expect(data).toEqual(mockTrip);
      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
      expect(mockSupabase.from).toHaveBeenNthCalledWith(3, 'items');
      expect(mockInsert).toHaveBeenNthCalledWith(3, [
        {
          trip_id: 'trip-123',
          name: 'Item 1',
          required_count: 1,
          category: 'Essentials',
          status: 'needed',
        },
        {
          trip_id: 'trip-123',
          name: 'Item 2',
          required_count: 1,
          category: 'Essentials',
          status: 'needed',
        },
      ]);
    });

    it('logs error but returns trip if items insertion fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockInputWithItems = {
        ...mockInput,
        items: ['Error Item'],
      };

      mockInsert.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: mockTrip, error: null }),
        }),
      });
      mockInsert.mockResolvedValueOnce({ error: null }); // member success
      mockInsert.mockResolvedValueOnce({ error: new Error('Items DB error') }); // items failure

      const { data, error } = await createTrip(mockSupabase, mockInputWithItems, mockUserId);

      expect(error).toBeNull();
      expect(data).toEqual(mockTrip);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns error if createTrip catches an exception', async () => {
      mockInsert.mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });

      const { data, error } = await createTrip(mockSupabase, mockInput, mockUserId);

      expect(data).toBeNull();
      expect((error as Error).message).toBe('Unexpected crash');
    });
  });

  describe('getUserTrips catch block', () => {
    it('returns error if getUserTrips catches an exception', async () => {
      mockSupabase.from = jest.fn().mockImplementationOnce(() => {
        throw new Error('Select crash');
      });

      const { data, error } = await getUserTrips(mockSupabase);

      expect(data).toBeNull();
      expect((error as Error).message).toBe('Select crash');
    });
  });
});
