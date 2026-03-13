/**
 * ISSUE-#45: Unit tests for trip-members library functions
 *
 * Tests query functions with mocked Supabase client
 */

import {
  searchUsersByUsername,
  getTripMembers,
  isTripAdmin,
  inviteTripMember,
  removeTripMember,
} from '../../../src/lib/supabase/trip-members';
import type { Profile } from '../../../src/types/profile.types';
import type { TripMemberWithProfile } from '../../../src/lib/supabase/trip-members';

// Mock Supabase client
const mockRpc = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockEq2 = jest.fn();
const mockOrder = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockSingle = jest.fn();

const mockSupabase = {
  rpc: mockRpc,
  from: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  })),
} as unknown as typeof import('@supabase/supabase-js').SupabaseClient;

describe('trip-members library functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsersByUsername', () => {
    it('should return empty array for queries less than 3 characters', async () => {
      const result = await searchUsersByUsername(mockSupabase, 'ab');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('should call RPC function with trimmed query', async () => {
      const mockProfiles: Profile[] = [
        {
          id: '1',
          full_name: 'John Doe',
          username: 'johndoe',
          avatar_theme: null,
          packing_style: null,
          created_at: '',
          updated_at: '',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockProfiles,
        error: null,
      });

      await searchUsersByUsername(mockSupabase, '  john  ');

      expect(mockRpc).toHaveBeenCalledWith('search_users_by_username', {
        search_query: 'john',
      });
    });

    it('should return profiles on successful search', async () => {
      const mockProfiles: Profile[] = [
        {
          id: '1',
          full_name: 'John Doe',
          username: 'johndoe',
          avatar_theme: null,
          packing_style: null,
          created_at: '',
          updated_at: '',
        },
        {
          id: '2',
          full_name: 'Jane Smith',
          username: 'janesmith',
          avatar_theme: null,
          packing_style: null,
          created_at: '',
          updated_at: '',
        },
      ];

      mockRpc.mockResolvedValue({
        data: mockProfiles,
        error: null,
      });

      const result = await searchUsersByUsername(mockSupabase, 'john');

      expect(result.data).toEqual(mockProfiles);
      expect(result.error).toBeNull();
    });

    it('should return error on RPC failure', async () => {
      const mockError = { message: 'RPC error', code: '42000' };
      mockRpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await searchUsersByUsername(mockSupabase, 'john');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle empty results', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await searchUsersByUsername(mockSupabase, 'nonexistent');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getTripMembers', () => {
    const mockTripId = 'trip-123';
    const mockMembers: TripMemberWithProfile[] = [
      {
        id: 'member-1',
        trip_id: mockTripId,
        user_id: 'user-1',
        role: 'admin',
        created_at: '',
        profile: {
          id: 'user-1',
          full_name: 'Admin User',
          username: 'admin',
          avatar_theme: null,
          packing_style: null,
          created_at: '',
          updated_at: '',
        },
      },
    ];

    beforeEach(() => {
      // Setup chain: select -> eq -> order
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({
        data: mockMembers,
        error: null,
      });
    });

    it('should fetch trip members with profiles', async () => {
      const result = await getTripMembers(mockSupabase, mockTripId);

      expect(result.data).toEqual(mockMembers);
      expect(result.error).toBeNull();
    });

    it('should call select with correct join syntax', async () => {
      await getTripMembers(mockSupabase, mockTripId);

      expect(mockSelect).toHaveBeenCalledWith(`
        *,
        profile:profiles (*)
      `);
    });

    it('should filter by trip_id', async () => {
      await getTripMembers(mockSupabase, mockTripId);

      expect(mockEq).toHaveBeenCalledWith('trip_id', mockTripId);
    });

    it('should order by created_at ascending', async () => {
      await getTripMembers(mockSupabase, mockTripId);

      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should handle empty members list', async () => {
      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getTripMembers(mockSupabase, mockTripId);

      expect(result.data).toEqual([]);
    });

    it('should return error on database failure', async () => {
      const mockError = { message: 'Database error', code: '42000' };
      mockOrder.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await getTripMembers(mockSupabase, mockTripId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('isTripAdmin', () => {
    const mockTripId = 'trip-123';

    it('should return true when user is admin', async () => {
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const result = await isTripAdmin(mockSupabase, mockTripId);

      expect(result.isAdmin).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return false when user is not admin', async () => {
      mockRpc.mockResolvedValue({
        data: false,
        error: null,
      });

      const result = await isTripAdmin(mockSupabase, mockTripId);

      expect(result.isAdmin).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should call is_admin_of RPC with trip_uuid', async () => {
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      await isTripAdmin(mockSupabase, mockTripId);

      expect(mockRpc).toHaveBeenCalledWith('is_admin_of', {
        trip_uuid: mockTripId,
      });
    });

    it('should return error on RPC failure', async () => {
      const mockError = { message: 'RPC error', code: '42000' };
      mockRpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await isTripAdmin(mockSupabase, mockTripId);

      expect(result.isAdmin).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('inviteTripMember', () => {
    const mockTripId = 'trip-123';
    const mockUserId = 'user-456';
    const mockNewMember = {
      id: 'member-new',
      trip_id: mockTripId,
      user_id: mockUserId,
      role: 'member',
      created_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      // Setup chain: insert -> select -> single
      mockInsert.mockReturnValue({ select: mockSelect });
      mockSelect.mockReturnValue({ single: mockSingle });
    });

    it('should insert member with role=member', async () => {
      mockSingle.mockResolvedValue({
        data: mockNewMember,
        error: null,
      });

      const result = await inviteTripMember(mockSupabase, mockTripId, mockUserId);

      expect(result.data).toEqual(mockNewMember);
      expect(mockInsert).toHaveBeenCalledWith({
        trip_id: mockTripId,
        user_id: mockUserId,
        role: 'member',
      });
    });

    it('should return inserted member on success', async () => {
      mockSingle.mockResolvedValue({
        data: mockNewMember,
        error: null,
      });

      const result = await inviteTripMember(mockSupabase, mockTripId, mockUserId);

      expect(result.data).toEqual(mockNewMember);
      expect(result.error).toBeNull();
    });

    it('should return error on insert failure', async () => {
      const mockError = { message: 'Duplicate entry', code: '23505' };
      mockSingle.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await inviteTripMember(mockSupabase, mockTripId, mockUserId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle unique constraint violation (duplicate member)', async () => {
      const mockError = {
        message: 'duplicate key value violates unique constraint',
        code: '23505',
        details: { table: 'trip_members', constraint: 'trip_members_trip_id_user_id_key' },
      };
      mockSingle.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await inviteTripMember(mockSupabase, mockTripId, mockUserId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
      expect(
        result.error && 'code' in result.error && (result.error as { code: string }).code
      ).toBe('23505');
    });
  });

  describe('removeTripMember', () => {
    const mockTripId = 'trip-123';
    const mockUserId = 'user-456';

    beforeEach(() => {
      jest.clearAllMocks();
      // Setup chain: delete -> eq -> eq
      // delete().eq() returns { eq: mockEq2 }
      // delete().eq().eq() returns Promise with result
      mockDelete.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
    });

    it('should delete member by trip_id and user_id', async () => {
      mockEq2.mockResolvedValue({ error: null });

      const result = await removeTripMember(mockSupabase, mockTripId, mockUserId);

      expect(result.error).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should apply both eq filters', async () => {
      mockEq2.mockResolvedValue({ error: null });

      await removeTripMember(mockSupabase, mockTripId, mockUserId);

      expect(mockEq).toHaveBeenCalledWith('trip_id', mockTripId);
      expect(mockEq2).toHaveBeenCalledWith('user_id', mockUserId);
    });

    it('should return error on delete failure', async () => {
      const mockError = { message: 'Delete failed', code: '42000' };
      mockEq2.mockResolvedValue({ error: mockError });

      const result = await removeTripMember(mockSupabase, mockTripId, mockUserId);

      expect(result.error).toEqual(mockError);
    });

    it('should return null error on successful delete', async () => {
      mockEq2.mockResolvedValue({ error: null });

      const result = await removeTripMember(mockSupabase, mockTripId, mockUserId);

      expect(result.error).toBeNull();
    });
  });
});
