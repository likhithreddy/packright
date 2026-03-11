import { createTripAction } from '../../src/app/actions/trips';
import { createClient } from '../../src/lib/supabase/server';
import { createTrip } from '../../src/lib/supabase/trips';

// Mock dependencies
jest.mock('../../src/lib/supabase/server');
jest.mock('../../src/lib/supabase/trips');

describe('Server Actions - Trips', () => {
  const mockCreateClient = createClient as jest.Mock;
  const mockCreateTrip = createTrip as jest.Mock;
  const mockGetUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    });
  });

  const validData = {
    title: 'European Tour',
    destination: 'Paris',
    dateRange: {
      from: new Date('2026-06-01'),
      to: new Date('2026-06-15'),
    },
  };

  it('fails if input validation fails', async () => {
    const invalidData = { ...validData, title: 'A' }; // length < 2
    const result = await createTripAction(invalidData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid trip data');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('fails if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });

    const result = await createTripAction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('must be logged in');
    expect(mockCreateTrip).not.toHaveBeenCalled();
  });

  it('fails if database creation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockCreateTrip.mockResolvedValue({ data: null, error: new Error('DB error') });

    const result = await createTripAction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to create');
  });

  it('succeeds and returns trip id on valid flow', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockCreateTrip.mockResolvedValue({ data: { id: 'new-trip-123' }, error: null });

    const result = await createTripAction(validData);

    expect(result.success).toBe(true);
    expect(result.data?.tripId).toBe('new-trip-123');
  });

  it('passes aiPrompt and items to createTrip', async () => {
    const dataWithExtras = {
      ...validData,
      aiPrompt: 'Need suggestions for hiking',
      items: ['Boots', 'Map'],
    };
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    mockCreateTrip.mockResolvedValue({ data: { id: 'trip-456' }, error: null });

    await createTripAction(dataWithExtras);

    expect(mockCreateTrip).toHaveBeenCalledWith(expect.anything(), dataWithExtras, 'user-123');
  });

  it('handles unexpected errors in the catch block', async () => {
    mockGetUser.mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });

    const result = await createTripAction(validData);

    expect(result.success).toBe(false);
    expect(result.error).toBe('An unexpected error occurred.');
  });
});
