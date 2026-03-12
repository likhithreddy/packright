/**
 * @jest-environment node
 */
import { POST } from '../../../src/app/api/generate-list/route';
import { createClient } from '../../../src/lib/supabase/server';

// Mock Supabase client
jest.mock('../../../src/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock native fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('POST /api/generate-list', () => {
  let mockSupabase: { auth: { getSession: jest.Mock } };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
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
      body: JSON.stringify({
        description: 'This is a long enough description to pass initial check.',
      }),
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
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Trip description is required');
  });

  it('should return 400 if description is less than 20 characters', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify({ description: 'Short desc' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Trip description must be at least 20 characters long');
  });

  it('should call Groq API and return suggested items on success', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });

    const mockItems = [{ name: 'Skis', category: 'Gear', quantity: 1, is_shared: false }];
    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({ items: mockItems }),
          },
        },
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockGroqResponse,
    });

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify({ description: 'A week long ski trip to the Swiss Alps in December' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(data.items).toEqual(mockItems);
  });

  it('should include destination and duration in the prompt sent to Groq', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ items: [] }),
            },
          },
        ],
      }),
    });

    const body = {
      description: 'A week long ski trip to the Swiss Alps in December',
      destination: 'Switzerland',
      startDate: '2026-12-01T00:00:00.000Z',
      endDate: '2026-12-07T00:00:00.000Z',
    };

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    await POST(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining(
          'Destination: Switzerland. Duration: 7 days. Description: A week long ski trip'
        ),
      })
    );
  });

  it('should retry up to 3 times on Groq API failure and then succeed', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });

    const mockItems = [{ name: 'Skis', category: 'Gear', quantity: 1, is_shared: false }];
    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({ items: mockItems }),
          },
        },
      ],
    };

    // First two calls fail, third succeeds
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Fail' }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ error: 'Bad Gateway' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => mockGroqResponse });

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify({ description: 'A week long ski trip to the Swiss Alps in December' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(data.items).toEqual(mockItems);
  }, 10000); // Higher timeout for retries

  it('should return 500 after 3 failed attempts', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: '123' } } },
      error: null,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Persistent Error' }),
    });

    const request = new Request('http://localhost:3000/api/generate-list', {
      method: 'POST',
      body: JSON.stringify({ description: 'A week long ski trip to the Swiss Alps in December' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain('encountered an issue generating your packing list');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  }, 10000);
});
