import { getUserTrips } from '@/lib/supabase/trips';
import { Trip } from '@/types/database.types';

describe('getUserTrips lib function', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully fetches trips for a user', async () => {
    const mockData = [{ id: '1', title: 'Trip 1' }] as Trip[];
    (mockSupabase.order as jest.Mock).mockResolvedValue({ data: mockData, error: null });

    const result = await getUserTrips(mockSupabase);

    expect(result.data).toEqual(mockData);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith('trips');
    expect(mockSupabase.select).toHaveBeenCalledWith('*');
    expect(mockSupabase.order).toHaveBeenCalledWith('date_start', { ascending: true });
  });

  it('returns an empty array when no trips are found', async () => {
    (mockSupabase.order as jest.Mock).mockResolvedValue({ data: [], error: null });

    const result = await getUserTrips(mockSupabase);

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('handles Supabase errors gracefully', async () => {
    const mockError = { code: 'P0001', message: 'Database error' };
    (mockSupabase.order as jest.Mock).mockResolvedValue({ data: [], error: mockError });

    const result = await getUserTrips(mockSupabase);

    expect(result.data).toEqual([]);
    expect(result.error).toEqual(mockError);
  });

  it('catches and returns exceptions', async () => {
    const error = new Error('Connection failed');
    (mockSupabase.order as jest.Mock).mockRejectedValue(error);

    const result = await getUserTrips(mockSupabase);

    expect(result.data).toBeNull();
    expect(result.error).toEqual(error);
  });
});
