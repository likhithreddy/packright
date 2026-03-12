import { SupabaseClient } from '@supabase/supabase-js';
import { getUserTrips } from '@/lib/supabase/trips';
import { Trip } from '@/types/database.types';

describe('getUserTrips lib function', () => {
  const mockOrder = jest.fn();
  const mockSelect = jest.fn();
  const mockFrom = jest.fn();

  const mockSupabase = {
    from: mockFrom.mockReturnThis(),
    select: mockSelect.mockReturnThis(),
    order: mockOrder,
  } as unknown as SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnThis();
    mockSelect.mockReturnThis();
  });

  it('successfully fetches trips for a user', async () => {
    const mockData = [
      {
        id: '1',
        title: 'Trip 1',
        created_by: 'user-1',
        destination: 'Destination 1',
        date_start: new Date().toISOString(),
        date_end: new Date().toISOString(),
        is_archived: false,
        created_at: new Date().toISOString(),
      },
    ] as Trip[];
    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const result = await getUserTrips(mockSupabase);

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('trips');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('date_start', { ascending: true });
  });

  it('returns an empty array when no trips are found', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const result = await getUserTrips(mockSupabase);

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('handles Supabase errors gracefully', async () => {
    const mockError = { code: 'P0001', message: 'Database error' };
    mockOrder.mockResolvedValue({ data: [], error: mockError });

    const result = await getUserTrips(mockSupabase);

    expect(result.data).toEqual([]);
    expect(result.error).toEqual(mockError);
  });

  it('catches and returns exceptions', async () => {
    const error = new Error('Connection failed');
    mockOrder.mockRejectedValue(error);

    const result = await getUserTrips(mockSupabase);

    expect(result.data).toBeNull();
    expect(result.error).toEqual(error);
  });
});
