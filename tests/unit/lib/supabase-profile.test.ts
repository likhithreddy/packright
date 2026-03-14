/**
 * Unit tests for src/lib/supabase/profile.ts
 *
 * Tests profile fetching operations including:
 * - getProfile: Fetching current user's profile
 * - getProfileById: Fetching a profile by user ID
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getProfile, getProfileById } from '@/lib/supabase/profile';
import type { Profile } from '@/types/profile.types';

// Mock the server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';

describe('Supabase Profile Library', () => {
  let mockSupabase: SupabaseClient;
  let mockAuth: jest.Mock;
  let mockFrom: jest.Mock;

  const createMockSupabaseClient = (
    user: { id: string } | null = null,
    authError: unknown = null
  ) => {
    mockAuth = jest.fn().mockResolvedValue({
      data: { user },
      error: authError,
    });

    const mockEq = jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: user ? mockProfile : null,
        error: null,
      }),
    });

    mockFrom = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: mockEq,
      }),
    });

    return {
      auth: {
        getUser: mockAuth,
      },
      from: mockFrom,
    } as unknown as SupabaseClient;
  };

  const mockProfile: Profile = {
    id: 'user-123',
    username: 'testuser',
    full_name: 'Test User',
    avatar_theme: 'blue',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase = createMockSupabaseClient(mockUser, null);
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfile();

      expect(result).toEqual(mockProfile);
      expect(mockAuth).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('should return null when user is not authenticated', async () => {
      const authError = { message: 'No session' };

      mockSupabase = createMockSupabaseClient(null, authError);
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfile();

      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should return null when auth.getUser returns no user', async () => {
      mockSupabase = createMockSupabaseClient(null, null);
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfile();

      expect(result).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should return null when profile fetch fails', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockError = { message: 'Profile not found' };

      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      mockAuth = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase = {
        auth: { getUser: mockAuth },
        from: mockFrom,
      } as unknown as SupabaseClient;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfile();

      expect(result).toBeNull();
    });

    it('should return null when profile data is null', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      mockAuth = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase = {
        auth: { getUser: mockAuth },
        from: mockFrom,
      } as unknown as SupabaseClient;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfile();

      expect(result).toBeNull();
    });

    it('should query profile by user ID', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase = createMockSupabaseClient(mockUser, null);
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      await getProfile();

      const mockEq = (mockFrom().select as jest.Mock)().eq as jest.Mock;
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('should handle unexpected errors gracefully', async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error('Connection error'));

      const result = await getProfile();

      expect(result).toBeNull();
    });

    it('should handle profile query errors', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const queryError = new Error('Query failed');

      mockAuth = jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom = jest.fn().mockImplementation(() => {
        throw queryError;
      });

      mockSupabase = {
        auth: { getUser: mockAuth },
        from: mockFrom,
      } as unknown as SupabaseClient;

      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfile();

      expect(result).toBeNull();
    });
  });

  describe('getProfileById', () => {
    const userId = 'user-456';

    it('should return profile for valid user ID', async () => {
      const mockProfileById: Profile = {
        id: userId,
        username: 'otheruser',
        full_name: 'Other User',
        avatar_theme: 'green',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };

      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockProfileById,
          error: null,
        }),
      });

      mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfileById(userId);

      expect(result).toEqual(mockProfileById);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockEq).toHaveBeenCalledWith('id', userId);
    });

    it('should return null when profile not found', async () => {
      const mockError = { message: 'Profile not found', code: 'PGRST116' };

      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      });

      mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfileById(userId);

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'PGRST301' },
        }),
      });

      mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfileById(userId);

      expect(result).toBeNull();
    });

    it('should handle unexpected errors gracefully', async () => {
      (createClient as jest.Mock).mockRejectedValue(new Error('Connection error'));

      const result = await getProfileById(userId);

      expect(result).toBeNull();
    });

    it('should handle query execution errors', async () => {
      const queryError = new Error('Query execution failed');

      mockFrom = jest.fn().mockImplementation(() => {
        throw queryError;
      });

      mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfileById(userId);

      expect(result).toBeNull();
    });

    it('should handle empty user ID', async () => {
      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Invalid ID', code: 'PGRST116' },
        }),
      });

      mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });

      mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getProfileById('');

      expect(result).toBeNull();
    });
  });
});
