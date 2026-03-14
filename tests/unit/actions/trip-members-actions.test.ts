/**
 * Unit tests for src/app/actions/trip-members.ts
 *
 * Tests all trip member server actions including:
 * - searchUsersAction: Searching users by username
 * - getTripMembersAction: Fetching trip members
 * - inviteTripMemberAction: Inviting members to trips
 * - removeTripMemberAction: Removing members from trips
 */

import {
  searchUsersAction,
  getTripMembersAction,
  inviteTripMemberAction,
  removeTripMemberAction,
} from '@/app/actions/trip-members';
import { createClient } from '@/lib/supabase/server';
import {
  searchUsersByUsername,
  getTripMembers,
  isTripAdmin,
  inviteTripMember,
  removeTripMember,
} from '@/lib/supabase/trip-members';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/supabase/trip-members');

describe('Trip Members Server Actions', () => {
  const mockCreateClient = createClient as jest.Mock;
  const mockSearchUsersByUsername = searchUsersByUsername as jest.Mock;
  const mockGetTripMembers = getTripMembers as jest.Mock;
  const mockIsTripAdmin = isTripAdmin as jest.Mock;
  const mockInviteTripMember = inviteTripMember as jest.Mock;
  const mockRemoveTripMember = removeTripMember as jest.Mock;

  const mockGetUser = jest.fn();
  const mockSupabaseClient = {
    auth: {
      getUser: mockGetUser,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabaseClient as typeof mockSupabaseClient);
  });

  describe('searchUsersAction', () => {
    it('should return users for valid search query (3+ chars)', async () => {
      const mockProfiles = [
        {
          id: 'user-1',
          username: 'johntraveler',
          full_name: 'John Traveler',
          avatar_theme: 'blue',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
      ];

      mockSearchUsersByUsername.mockResolvedValue({
        data: mockProfiles,
        error: null,
      });

      const result = await searchUsersAction('john');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProfiles);
      expect(mockSearchUsersByUsername).toHaveBeenCalledWith(mockSupabaseClient, 'john');
    });

    it('should trim whitespace from search query', async () => {
      mockSearchUsersByUsername.mockResolvedValue({
        data: [],
        error: null,
      });

      await searchUsersAction('  john  ');

      expect(mockSearchUsersByUsername).toHaveBeenCalledWith(mockSupabaseClient, 'john');
    });

    it('should return error for queries under 3 characters', async () => {
      const result = await searchUsersAction('jo');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search must be at least 3 characters');
      expect(mockCreateClient).not.toHaveBeenCalled();
    });

    it('should return error for empty string', async () => {
      const result = await searchUsersAction('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search must be at least 3 characters');
    });

    it('should return error for whitespace-only query', async () => {
      const result = await searchUsersAction('   ');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search must be at least 3 characters');
    });

    it('should handle RPC errors', async () => {
      const mockError = { message: 'RPC function failed', code: 'PGRST202' };
      mockSearchUsersByUsername.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await searchUsersAction('john');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to search for users. Please try again.');
    });

    it('should handle unexpected errors', async () => {
      mockSearchUsersByUsername.mockRejectedValue(new Error('Network error'));

      const result = await searchUsersAction('john');

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while searching.');
    });

    it('should return empty array when no results found', async () => {
      mockSearchUsersByUsername.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await searchUsersAction('nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockSearchUsersByUsername.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await searchUsersAction('john');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('getTripMembersAction', () => {
    const tripId = 'trip-123';

    it('should return trip members with profiles', async () => {
      const mockMembers = [
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
      ];

      mockGetTripMembers.mockResolvedValue({
        data: mockMembers,
        error: null,
      });

      const result = await getTripMembersAction(tripId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMembers);
      expect(mockGetTripMembers).toHaveBeenCalledWith(mockSupabaseClient, tripId);
    });

    it('should return error on database error', async () => {
      const mockError = { message: 'Trip not found', code: 'PGRST116' };
      mockGetTripMembers.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await getTripMembersAction(tripId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load trip members. Please try again.');
    });

    it('should return empty array when no members exist', async () => {
      mockGetTripMembers.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getTripMembersAction(tripId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockGetTripMembers.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getTripMembersAction(tripId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle unexpected errors', async () => {
      mockGetTripMembers.mockRejectedValue(new Error('Network error'));

      const result = await getTripMembersAction(tripId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while loading members.');
    });

    it('should log error details for debugging', async () => {
      const mockError = {
        message: 'Database error',
        details: 'Connection failed',
        hint: 'Check database',
        code: 'PGRST301',
      };
      mockGetTripMembers.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await getTripMembersAction(tripId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Database error in getTripMembersAction:',
        expect.objectContaining({
          message: mockError.message,
          details: mockError.details,
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('inviteTripMemberAction', () => {
    const tripId = 'trip-123';
    const userId = 'user-456';
    const userFullName = 'John Doe';

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-user' } },
        error: null,
      });
      mockIsTripAdmin.mockResolvedValue({
        isAdmin: true,
        error: null,
      });
    });

    it('should invite user to trip when caller is admin', async () => {
      mockInviteTripMember.mockResolvedValue({
        data: { id: 'member-1', trip_id: tripId, user_id: userId, role: 'member' },
        error: null,
      });

      const result = await inviteTripMemberAction(tripId, userId, userFullName);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fullName: userFullName });
      expect(mockInviteTripMember).toHaveBeenCalledWith(mockSupabaseClient, tripId, userId);
    });

    it('should return error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      });

      const result = await inviteTripMemberAction(tripId, userId, userFullName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You must be logged in to invite members.');
      expect(mockIsTripAdmin).not.toHaveBeenCalled();
    });

    it('should return error when user is not trip admin', async () => {
      mockIsTripAdmin.mockResolvedValue({
        isAdmin: false,
        error: null,
      });

      const result = await inviteTripMemberAction(tripId, userId, userFullName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only trip admins can invite new members.');
      expect(mockInviteTripMember).not.toHaveBeenCalled();
    });

    it('should return error when admin check fails', async () => {
      mockIsTripAdmin.mockResolvedValue({
        isAdmin: null,
        error: { message: 'Admin check failed' },
      });

      const result = await inviteTripMemberAction(tripId, userId, userFullName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only trip admins can invite new members.');
    });

    it('should return specific error when user is already a member', async () => {
      const mockError = { code: '23505', message: 'Duplicate key' };
      mockInviteTripMember.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await inviteTripMemberAction(tripId, userId, userFullName);

      expect(result.success).toBe(false);
      expect(result.error).toBe(`${userFullName} is already a trip member.`);
    });

    it('should return generic error on database error', async () => {
      const mockError = { message: 'Database error', code: 'PGRST301' };
      mockInviteTripMember.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await inviteTripMemberAction(tripId, userId, userFullName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to invite member. Please try again.');
    });

    it('should handle unexpected errors', async () => {
      mockInviteTripMember.mockRejectedValue(new Error('Network error'));

      const result = await inviteTripMemberAction(tripId, userId, userFullName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while inviting.');
    });

    it('should verify authentication before checking admin status', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      });

      await inviteTripMemberAction(tripId, userId, userFullName);

      expect(mockGetUser).toHaveBeenCalled();
      expect(mockIsTripAdmin).not.toHaveBeenCalled();
    });
  });

  describe('removeTripMemberAction', () => {
    const tripId = 'trip-123';
    const userId = 'user-456';

    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'admin-user' } },
        error: null,
      });
      mockIsTripAdmin.mockResolvedValue({
        isAdmin: true,
        error: null,
      });
    });

    it('should remove member from trip when caller is admin', async () => {
      mockRemoveTripMember.mockResolvedValue({
        error: null,
      });

      const result = await removeTripMemberAction(tripId, userId);

      expect(result.success).toBe(true);
      expect(mockRemoveTripMember).toHaveBeenCalledWith(mockSupabaseClient, tripId, userId);
    });

    it('should return error when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      });

      const result = await removeTripMemberAction(tripId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('You must be logged in to remove members.');
      expect(mockIsTripAdmin).not.toHaveBeenCalled();
    });

    it('should return error when user is not trip admin', async () => {
      mockIsTripAdmin.mockResolvedValue({
        isAdmin: false,
        error: null,
      });

      const result = await removeTripMemberAction(tripId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only trip admins can remove members.');
      expect(mockRemoveTripMember).not.toHaveBeenCalled();
    });

    it('should return error when admin check fails', async () => {
      mockIsTripAdmin.mockResolvedValue({
        isAdmin: null,
        error: { message: 'Admin check failed' },
      });

      const result = await removeTripMemberAction(tripId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only trip admins can remove members.');
    });

    it('should return error on database failure', async () => {
      const mockError = { message: 'Deletion failed', code: 'PGRST116' };
      mockRemoveTripMember.mockResolvedValue({
        error: mockError,
      });

      const result = await removeTripMemberAction(tripId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to remove member. Please try again.');
    });

    it('should handle unexpected errors', async () => {
      mockRemoveTripMember.mockRejectedValue(new Error('Network error'));

      const result = await removeTripMemberAction(tripId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An unexpected error occurred while removing member.');
    });

    it('should verify authentication before checking admin status', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      });

      await removeTripMemberAction(tripId, userId);

      expect(mockGetUser).toHaveBeenCalled();
      expect(mockIsTripAdmin).not.toHaveBeenCalled();
    });
  });
});
