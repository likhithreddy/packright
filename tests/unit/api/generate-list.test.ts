/**
 * @jest-environment node
 */
import { POST } from '../../../src/app/api/generate-list/route';
import { createClient } from '../../../src/lib/supabase/server';
import { createTripItems } from '../../../src/lib/supabase/trips';

// Mock Supabase client
jest.mock('../../../src/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock trips helper
jest.mock('../../../src/lib/supabase/trips', () => ({
  createTripItems: jest.fn(),
}));

// Mock native fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('POST /api/generate-list', () => {
  let mockSupabase: { auth: { getSession: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
      },
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    process.env.GROQ_API_KEY = 'test-key';
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify({ description: 'Ski trip', tripId: 'trip-123' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if description is missing', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify({ tripId: 'trip-123' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Trip description is required');
  });

  it('should return 400 if tripId is missing', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify({ description: 'Ski trip' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Trip ID is required');
  });

  it('should call Groq API, save to Supabase, and return saved items', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });

    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [{ name: 'Skis', category: 'Gear', quantity: 1 }],
            }),
          },
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockGroqResponse,
    });

    const mockSavedItems = [{ id: 'item-1', name: 'Skis', trip_id: 'trip-123' }];
    (createTripItems as jest.Mock).mockResolvedValue({
      data: mockSavedItems,
      error: null,
    });

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify({ description: 'Ski trip', tripId: 'trip-123' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(createTripItems).toHaveBeenCalledWith(
      mockSupabase,
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Skis',
          trip_id: 'trip-123',
          required_count: 1,
        }),
      ])
    );
    expect(data.items).toEqual(mockSavedItems);
  });
});
