/**
 * Unit tests for src/lib/supabase/trips.ts
 *
 * Tests all CRUD operations for trips including:
 * - getUserTrips: Fetching all user trips
 * - getTrip: Fetching a single trip
 * - createTrip: Creating a trip with items
 * - createTripItems: Batch inserting items
 */

import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { getUserTrips, getTrip, createTrip, createTripItems } from '@/lib/supabase/trips';
import type { Trip } from '@/types/database.types';
import { NewTripInput } from '@/types/new-trip.schema';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockSelect = jest.fn().mockReturnThis();
  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
    insert: jest.fn().mockReturnValue({
      select: mockSelect,
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
    eq: jest.fn().mockReturnValue({
      select: mockSelect,
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: null,
      error: null,
    }),
  });

  return {
    from: mockFrom,
  } as unknown as SupabaseClient;
};

describe('Supabase Trips Library', () => {
  let mockSupabase: SupabaseClient;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const client = createMockSupabaseClient();
    mockSupabase = client;
    mockFrom = client.from as jest.Mock;
  });

  describe('getUserTrips', () => {
    it('should return user trips ordered by date_start ascending', async () => {
      const mockTrips: Trip[] = [
        {
          id: 'trip-1',
          title: 'Paris Trip',
          destination: 'Paris',
          date_start: '2026-06-01',
          date_end: '2026-06-10',
          created_by: 'user-1',
          is_archived: false,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        {
          id: 'trip-2',
          title: 'London Trip',
          destination: 'London',
          date_start: '2026-07-01',
          date_end: '2026-07-10',
          created_by: 'user-1',
          is_archived: false,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockTrips,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      const result = await getUserTrips(mockSupabase);

      expect(result.data).toEqual(mockTrips);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('trips');
      expect(mockOrder).toHaveBeenCalledWith('date_start', { ascending: true });
    });

    it('should return empty array on error', async () => {
      const mockError: PostgrestError = {
        message: 'RLS policy violation',
        code: '42501',
        details: '',
        hint: '',
      };

      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      const result = await getUserTrips(mockSupabase);

      expect(result.data).toEqual([]);
      expect(result.error).toEqual(mockError);
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Network error');

      mockFrom.mockImplementation(() => {
        throw unexpectedError;
      });

      const result = await getUserTrips(mockSupabase);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(unexpectedError);
    });

    it('should handle empty result set', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      const result = await getUserTrips(mockSupabase);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getTrip', () => {
    const tripId = 'trip-123';

    it('should return a single trip by ID', async () => {
      const mockTrip: Trip = {
        id: tripId,
        title: 'Paris Trip',
        destination: 'Paris',
        date_start: '2026-06-01',
        date_end: '2026-06-10',
        created_by: 'user-1',
        is_archived: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockTrip,
        error: null,
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getTrip(mockSupabase, tripId);

      expect(result.data).toEqual(mockTrip);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('trips');
      expect(mockEq).toHaveBeenCalledWith('id', tripId);
    });

    it('should return null on error', async () => {
      const mockError: PostgrestError = {
        message: 'Trip not found',
        code: 'PGRST116',
        details: 'Results contain 0 rows',
        hint: '',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockEq = jest.fn().mockReturnValue({
        single: mockSingle,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      const result = await getTrip(mockSupabase, tripId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');

      mockFrom.mockImplementation(() => {
        throw unexpectedError;
      });

      const result = await getTrip(mockSupabase, tripId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(unexpectedError);
    });
  });

  describe('createTrip', () => {
    const userId = 'user-123';
    const validInput: NewTripInput = {
      title: 'European Adventure',
      destination: 'Paris',
      dateRange: {
        from: new Date('2026-06-01'),
        to: new Date('2026-06-15'),
      },
    };

    it('should create a trip with admin membership', async () => {
      const mockTrip: Trip = {
        id: 'new-trip-123',
        title: validInput.title,
        destination: validInput.destination,
        date_start: '2026-06-01',
        date_end: '2026-06-15',
        created_by: userId,
        is_archived: false,
        created_at: '2026-03-14',
        updated_at: '2026-03-14',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockTrip,
        error: null,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      const mockMemberInsert = jest.fn().mockReturnValue(
        Promise.resolve({
          error: null,
        })
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'trips') {
          return {
            insert: mockInsert,
          };
        }
        if (table === 'trip_members') {
          return {
            insert: mockMemberInsert,
          };
        }
        return {};
      });

      const result = await createTrip(mockSupabase, validInput, userId);

      expect(result.data).toEqual(mockTrip);
      expect(result.error).toBeNull();
      expect(result.warning).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validInput.title,
          destination: validInput.destination,
          created_by: userId,
        })
      );
      expect(mockMemberInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          trip_id: mockTrip.id,
          user_id: userId,
          role: 'admin',
        })
      );
    });

    it('should create trip with AI items', async () => {
      const mockTrip: Trip = {
        id: 'new-trip-456',
        title: validInput.title,
        destination: validInput.destination,
        date_start: '2026-06-01',
        date_end: '2026-06-15',
        created_by: userId,
        is_archived: false,
        created_at: '2026-03-14',
        updated_at: '2026-03-14',
      };

      const inputWithItems: NewTripInput = {
        ...validInput,
        items: ['Passport', 'Walking shoes', 'Camera'],
      };

      const mockTripInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTrip,
            error: null,
          }),
        }),
      });

      const mockMemberInsert = jest.fn().mockReturnValue(
        Promise.resolve({
          error: null,
        })
      );

      const mockItemsInsert = jest.fn().mockReturnValue(
        Promise.resolve({
          error: null,
        })
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'trips') {
          return {
            insert: mockTripInsert,
          };
        }
        if (table === 'trip_members') {
          return {
            insert: mockMemberInsert,
          };
        }
        if (table === 'items') {
          return {
            insert: mockItemsInsert,
          };
        }
        return {};
      });

      const result = await createTrip(mockSupabase, inputWithItems, userId);

      expect(result.data).toEqual(mockTrip);
      expect(result.error).toBeNull();
      expect(result.warning).toBeNull();
      expect(mockItemsInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            trip_id: mockTrip.id,
            name: 'Passport',
            category: 'Essentials',
          }),
        ])
      );
    });

    it('should handle items with quantity and category', async () => {
      const mockTrip: Trip = {
        id: 'new-trip-789',
        title: validInput.title,
        destination: validInput.destination,
        date_start: '2026-06-01',
        date_end: '2026-06-15',
        created_by: userId,
        is_archived: false,
        created_at: '2026-03-14',
        updated_at: '2026-03-14',
      };

      const inputWithStructuredItems: NewTripInput = {
        ...validInput,
        items: [
          { name: 'T-shirts', quantity: 5, category: 'Clothing' },
          { name: 'Sunscreen', quantity: 1, category: 'Toiletries' },
        ],
      };

      const mockTripInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTrip,
            error: null,
          }),
        }),
      });

      const mockMemberInsert = jest.fn().mockReturnValue(
        Promise.resolve({
          error: null,
        })
      );

      const mockItemsInsert = jest.fn().mockReturnValue(
        Promise.resolve({
          error: null,
        })
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'trips') {
          return {
            insert: mockTripInsert,
          };
        }
        if (table === 'trip_members') {
          return {
            insert: mockMemberInsert,
          };
        }
        if (table === 'items') {
          return {
            insert: mockItemsInsert,
          };
        }
        return {};
      });

      const result = await createTrip(mockSupabase, inputWithStructuredItems, userId);

      expect(result.data).toEqual(mockTrip);
      expect(mockItemsInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            trip_id: mockTrip.id,
            name: 'T-shirts',
            required_count: 5,
            category: 'Clothing',
          }),
        ])
      );
    });

    it('should return warning when item insertion fails', async () => {
      const mockTrip: Trip = {
        id: 'new-trip-warning',
        title: validInput.title,
        destination: validInput.destination,
        date_start: '2026-06-01',
        date_end: '2026-06-15',
        created_by: userId,
        is_archived: false,
        created_at: '2026-03-14',
        updated_at: '2026-03-14',
      };

      const inputWithItems: NewTripInput = {
        ...validInput,
        items: ['Item 1', 'Item 2'],
      };

      const mockTripInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTrip,
            error: null,
          }),
        }),
      });

      const mockMemberInsert = jest.fn().mockResolvedValue({
        error: null,
      });

      const mockItemsInsert = jest.fn().mockReturnValue(
        Promise.resolve({
          error: { message: 'Items table error' } as PostgrestError,
        })
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'trips') {
          return {
            insert: mockTripInsert,
          };
        }
        if (table === 'trip_members') {
          return {
            insert: mockMemberInsert,
          };
        }
        if (table === 'items') {
          return {
            insert: mockItemsInsert,
          };
        }
        return {};
      });

      const result = await createTrip(mockSupabase, inputWithItems, userId);

      expect(result.data).toEqual(mockTrip);
      expect(result.error).toBeNull();
      expect(result.warning).toContain("couldn't fetch AI suggestions");
    });

    it('should return error when trip insertion fails', async () => {
      const mockError: PostgrestError = {
        message: 'Invalid trip data',
        code: '23502',
        details: 'Null violation',
        hint: '',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createTrip(mockSupabase, validInput, userId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should return error when member insertion fails (but trip is created)', async () => {
      const mockTrip: Trip = {
        id: 'trip-without-member',
        title: validInput.title,
        destination: validInput.destination,
        date_start: '2026-06-01',
        date_end: '2026-06-15',
        created_by: userId,
        is_archived: false,
        created_at: '2026-03-14',
        updated_at: '2026-03-14',
      };

      const mockError: PostgrestError = {
        message: 'Member insertion failed',
        code: '23503',
        details: 'Foreign key violation',
        hint: '',
      };

      const mockTripInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTrip,
            error: null,
          }),
        }),
      });

      const mockMemberInsert = jest.fn().mockReturnValue(
        Promise.resolve({
          error: mockError,
        })
      );

      mockFrom.mockImplementation((table: string) => {
        if (table === 'trips') {
          return {
            insert: mockTripInsert,
          };
        }
        if (table === 'trip_members') {
          return {
            insert: mockMemberInsert,
          };
        }
        return {};
      });

      const result = await createTrip(mockSupabase, validInput, userId);

      expect(result.data).toEqual(mockTrip);
      expect(result.error).toEqual(mockError);
    });

    it('should handle unexpected errors', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await createTrip(mockSupabase, validInput, userId);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should convert dates to ISO format for database', async () => {
      const mockTrip: Trip = {
        id: 'date-trip',
        title: validInput.title,
        destination: validInput.destination,
        date_start: '2026-06-01',
        date_end: '2026-06-15',
        created_by: userId,
        is_archived: false,
        created_at: '2026-03-14',
        updated_at: '2026-03-14',
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockTrip,
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      await createTrip(mockSupabase, validInput, userId);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          date_start: '2026-06-01',
          date_end: '2026-06-15',
        })
      );
    });
  });

  describe('createTripItems', () => {
    it('should batch insert items for a trip', async () => {
      const mockItems = [
        {
          trip_id: 'trip-123',
          name: 'Passport',
          category: 'Essentials',
          required_count: 1,
          status: 'needed',
        },
        {
          trip_id: 'trip-123',
          name: 'Sunscreen',
          category: 'Toiletries',
          required_count: 1,
          status: 'needed',
        },
      ];

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: mockItems.map((item, i) => ({ ...item, id: `item-${i}` })),
          error: null,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createTripItems(mockSupabase, mockItems);

      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith(mockItems);
    });

    it('should return error on insertion failure', async () => {
      const mockItems = [
        {
          trip_id: 'trip-123',
          name: 'Invalid Item',
          category: 'Invalid',
          required_count: -1,
          status: 'needed',
        },
      ];

      const mockError: PostgrestError = {
        message: 'Invalid item data',
        code: '23514',
        details: 'Check constraint violation',
        hint: '',
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createTripItems(mockSupabase, mockItems);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle empty items array', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await createTripItems(mockSupabase, []);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });
});
