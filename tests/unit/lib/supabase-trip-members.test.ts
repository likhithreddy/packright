/**
 * Unit tests for src/lib/supabase/trip-members.ts
 *
 * Tests all trip member operations including:
 * - searchUsersByUsername: Searching users by username/full name
 * - getTripMembers: Fetching trip members with profiles
 * - isTripAdmin: Checking admin status
 * - inviteTripMember: Adding members to trips
 * - removeTripMember: Removing members from trips
 */

import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  searchUsersByUsername,
  getTripMembers,
  isTripAdmin,
  inviteTripMember,
  removeTripMember,
  type TripMemberWithProfile,
} from '@/lib/supabase/trip-members';
import type { TripMember, Profile } from '@/types/database.types';

// Mock Supabase client builder
const createMockSupabaseClient = () => {
  const mockRpc = jest.fn();
  const mockEq = jest.fn().mockReturnThis();
  const mockDelete = jest.fn().mockReturnValue({
    eq: mockEq,
  });
  const mockOrder = jest.fn().mockReturnThis();
  const mockSelect = jest.fn().mockReturnValue({
    eq: mockEq,
    order: mockOrder,
  });
  const mockInsert = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
  });

  const mockFrom = jest.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  });

  return {
    from: mockFrom,
    rpc: mockRpc,
  } as unknown as SupabaseClient;
};

describe('Supabase Trip Members Library', () => {
  let mockSupabase: SupabaseClient;
  let mockFrom: jest.Mock;
  let mockRpc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const client = createMockSupabaseClient();
    mockSupabase = client;
    mockFrom = client.from as jest.Mock;
    mockRpc = client.rpc as jest.Mock;
  });

  describe('searchUsersByUsername', () => {
    it('should return users for valid search query (3+ chars)', async () => {
      const mockProfiles: Profile[] = [
        {
          id: 'user-1',
          username: 'johntraveler',
          full_name: 'John Traveler',
          avatar_theme: 'blue',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        {
          id: 'user-2',
          username: 'johnnyexplorer',
          full_name: 'Johnny Explorer',
          avatar_theme: 'green',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockProfiles,
        error: null,
      });

      const result = await searchUsersByUsername(mockSupabase, 'john');

      expect(result.data).toEqual(mockProfiles);
      expect(result.error).toBeNull();
      expect(mockRpc).toHaveBeenCalledWith('search_users_by_username', {
        search_query: 'john',
      });
    });

    it('should trim whitespace from search query', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      await searchUsersByUsername(mockSupabase, '  john  ');

      expect(mockRpc).toHaveBeenCalledWith('search_users_by_username', {
        search_query: 'john',
      });
    });

    it('should return empty array for queries under 3 characters', async () => {
      const result = await searchUsersByUsername(mockSupabase, 'jo');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should return 3 character query after trim (minimum valid)', async () => {
      const mockProfiles: Profile[] = [
        {
          id: 'user-1',
          username: 'abcuser',
          full_name: 'Abc User',
          avatar_theme: 'blue',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockProfiles,
        error: null,
      });

      const result = await searchUsersByUsername(mockSupabase, ' abc ');

      expect(result.data).toEqual(mockProfiles);
      expect(result.error).toBeNull();
      expect(mockRpc).toHaveBeenCalledWith('search_users_by_username', {
        search_query: 'abc',
      });
    });

    it('should return 3+ character query', async () => {
      const mockProfiles: Profile[] = [
        {
          id: 'user-1',
          username: 'alice',
          full_name: 'Alice Wonderland',
          avatar_theme: 'purple',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockProfiles,
        error: null,
      });

      const result = await searchUsersByUsername(mockSupabase, 'ali');

      expect(result.data).toEqual(mockProfiles);
      expect(result.error).toBeNull();
      expect(mockRpc).toHaveBeenCalledWith('search_users_by_username', {
        search_query: 'ali',
      });
    });

    it('should handle RPC errors', async () => {
      const mockError: PostgrestError = {
        message: 'Function execution failed',
        code: 'PGRST202',
        details: 'RPC function error',
        hint: '',
      };

      mockRpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await searchUsersByUsername(mockSupabase, 'john');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle unexpected errors', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'));

      const result = await searchUsersByUsername(mockSupabase, 'john');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getTripMembers', () => {
    const tripId = 'trip-123';

    it('should return trip members with profile data', async () => {
      const mockMembers: TripMemberWithProfile[] = [
        {
          id: 'member-1',
          trip_id: tripId,
          user_id: 'user-1',
          role: 'admin',
          created_at: '2026-01-01',
          profile: {
            id: 'user-1',
            username: 'adminuser',
            full_name: 'Admin User',
            avatar_theme: 'blue',
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        },
        {
          id: 'member-2',
          trip_id: tripId,
          user_id: 'user-2',
          role: 'member',
          created_at: '2026-01-02',
          profile: {
            id: 'user-2',
            username: 'memberuser',
            full_name: 'Member User',
            avatar_theme: 'green',
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockMembers,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: mockOrder,
          }),
        }),
      });

      const result = await getTripMembers(mockSupabase, tripId);

      expect(result.data).toEqual(mockMembers);
      expect(result.error).toBeNull();
    });

    it('should filter out members without profiles', async () => {
      const mockMembersWithNullProfile = [
        {
          id: 'member-1',
          trip_id: tripId,
          user_id: 'user-1',
          role: 'admin',
          created_at: '2026-01-01',
          profile: {
            id: 'user-1',
            username: 'validuser',
            full_name: 'Valid User',
            avatar_theme: 'blue',
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        },
        {
          id: 'member-2',
          trip_id: tripId,
          user_id: 'user-2',
          role: 'member',
          created_at: '2026-01-02',
          profile: null,
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockMembersWithNullProfile,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: mockOrder,
          }),
        }),
      });

      const result = await getTripMembers(mockSupabase, tripId);

      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].user_id).toBe('user-1');
      expect(result.error).toBeNull();
    });

    it('should return null on error', async () => {
      const mockError: PostgrestError = {
        message: 'Trip not found',
        code: 'PGRST116',
        details: 'No results found',
        hint: '',
      };

      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: mockOrder,
          }),
        }),
      });

      const result = await getTripMembers(mockSupabase, tripId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle unexpected errors', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await getTripMembers(mockSupabase, tripId);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });

    it('should return empty array when no members exist', async () => {
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: mockOrder,
          }),
        }),
      });

      const result = await getTripMembers(mockSupabase, tripId);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should return all members when all have profiles', async () => {
      const mockMembersAllValid: TripMemberWithProfile[] = [
        {
          id: 'member-1',
          trip_id: tripId,
          user_id: 'user-1',
          role: 'admin',
          created_at: '2026-01-01',
          profile: {
            id: 'user-1',
            username: 'adminuser',
            full_name: 'Admin User',
            avatar_theme: 'blue',
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        },
        {
          id: 'member-2',
          trip_id: tripId,
          user_id: 'user-2',
          role: 'member',
          created_at: '2026-01-02',
          profile: {
            id: 'user-2',
            username: 'memberuser',
            full_name: 'Member User',
            avatar_theme: 'green',
            created_at: '2026-01-01',
            updated_at: '2026-01-01',
          },
        },
      ];

      const mockOrder = jest.fn().mockResolvedValue({
        data: mockMembersAllValid,
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: mockOrder,
          }),
        }),
      });

      const result = await getTripMembers(mockSupabase, tripId);

      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
      expect(result.data?.[0].profile).not.toBeNull();
      expect(result.data?.[1].profile).not.toBeNull();
    });
  });

  describe('isTripAdmin', () => {
    const tripId = 'trip-123';

    it('should return true when user is admin', async () => {
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await isTripAdmin(mockSupabase, tripId);

      expect(result.isAdmin).toBe(true);
      expect(result.error).toBeNull();
      expect(mockRpc).toHaveBeenCalledWith('is_admin_of', {
        trip_uuid: tripId,
      });
    });

    it('should return false when user is not admin', async () => {
      mockRpc.mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await isTripAdmin(mockSupabase, tripId);

      expect(result.isAdmin).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should return null on RPC error', async () => {
      const mockError: PostgrestError = {
        message: 'RPC function failed',
        code: 'PGRST202',
        details: 'Function execution error',
        hint: '',
      };

      mockRpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await isTripAdmin(mockSupabase, tripId);

      expect(result.isAdmin).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle unexpected errors', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'));

      const result = await isTripAdmin(mockSupabase, tripId);

      expect(result.isAdmin).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('inviteTripMember', () => {
    const tripId = 'trip-123';
    const userId = 'user-456';

    it('should add user as trip member', async () => {
      const mockMember: TripMember = {
        id: 'member-1',
        trip_id: tripId,
        user_id: userId,
        role: 'member',
        created_at: '2026-03-14',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockMember,
        error: null,
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await inviteTripMember(mockSupabase, tripId, userId);

      expect(result.data).toEqual(mockMember);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('trip_members');
    });

    it('should set role to "member" by default', async () => {
      const mockMember: TripMember = {
        id: 'member-1',
        trip_id: tripId,
        user_id: userId,
        role: 'member',
        created_at: '2026-03-14',
      };

      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockMember,
            error: null,
          }),
        }),
      });

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });

      await inviteTripMember(mockSupabase, tripId, userId);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          trip_id: tripId,
          user_id: userId,
          role: 'member',
        })
      );
    });

    it('should return error on duplicate member', async () => {
      const mockError: PostgrestError = {
        message: 'Duplicate key violation',
        code: '23505',
        details: 'Key (trip_id, user_id) already exists',
        hint: '',
      };

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const result = await inviteTripMember(mockSupabase, tripId, userId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle unexpected errors', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await inviteTripMember(mockSupabase, tripId, userId);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('removeTripMember', () => {
    const tripId = 'trip-123';
    const userId = 'user-456';

    it('should remove member from trip', async () => {
      const mockEqSecond = jest.fn().mockResolvedValue({
        error: null,
      });
      const mockEqFirst = jest.fn().mockReturnValue({
        eq: mockEqSecond,
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqFirst,
      });

      mockFrom.mockReturnValue({
        delete: mockDelete,
      });

      const result = await removeTripMember(mockSupabase, tripId, userId);

      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('trip_members');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should filter by both trip_id and user_id', async () => {
      const mockEqSecond = jest.fn().mockResolvedValue({
        error: null,
      });
      const mockEqFirst = jest.fn().mockReturnValue({
        eq: mockEqSecond,
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqFirst,
      });

      mockFrom.mockReturnValue({
        delete: mockDelete,
      });

      await removeTripMember(mockSupabase, tripId, userId);

      expect(mockEqFirst).toHaveBeenCalledWith('trip_id', tripId);
      expect(mockEqSecond).toHaveBeenCalledWith('user_id', userId);
    });

    it('should return error when deletion fails', async () => {
      const mockError: PostgrestError = {
        message: 'Deletion failed',
        code: 'PGRST116',
        details: 'No rows matched',
        hint: '',
      };

      const mockEqSecond = jest.fn().mockResolvedValue({
        error: mockError,
      });
      const mockEqFirst = jest.fn().mockReturnValue({
        eq: mockEqSecond,
      });

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEqFirst,
      });

      mockFrom.mockReturnValue({
        delete: mockDelete,
      });

      const result = await removeTripMember(mockSupabase, tripId, userId);

      expect(result.error).toEqual(mockError);
    });

    it('should handle unexpected errors', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await removeTripMember(mockSupabase, tripId, userId);

      expect(result.error).toBeInstanceOf(Error);
    });
  });
});
