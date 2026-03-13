/**
 * ISSUE-#45: Unit tests for trip-members server actions
 *
 * Comprehensive tests covering error handling, edge cases,
 * boundary conditions, and malformed responses.
 *
 * Target Coverage: 95%+
 */

import {
  searchUsersAction,
  getTripMembersAction,
  inviteTripMemberAction,
  removeTripMemberAction,
} from '../../../src/app/actions/trip-members';

// Mock dependencies
jest.mock('../../../src/lib/supabase/server');
jest.mock('../../../src/lib/supabase/trip-members');

import { createClient } from '../../../src/lib/supabase/server';
import {
  searchUsersByUsername,
  getTripMembers,
  isTripAdmin,
  inviteTripMember,
  removeTripMember,
} from '../../../src/lib/supabase/trip-members';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  rpc: jest.fn(),
  from: jest.fn(),
} as unknown as ReturnType<typeof createClient>;

// Mock all imported functions from trip-members
(searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>).mockImplementation(
  jest.fn()
);
(getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockImplementation(jest.fn());
(isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockImplementation(jest.fn());
(inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockImplementation(jest.fn());
(removeTripMember as jest.MockedFunction<typeof removeTripMember>).mockImplementation(jest.fn());

describe('trip-members server actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('searchUsersAction', () => {
    describe('Validation', () => {
      it('should return error for empty string', async () => {
        const result = await searchUsersAction('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Search must be at least 3 characters');
        expect(searchUsersByUsername).not.toHaveBeenCalled();
      });

      it('should return error for queries less than 3 characters', async () => {
        const result = await searchUsersAction('ab');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Search must be at least 3 characters');
        expect(searchUsersByUsername).not.toHaveBeenCalled();
      });

      it('should return error for single character', async () => {
        const result = await searchUsersAction('a');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Search must be at least 3 characters');
      });

      it('should return error for whitespace-only queries', async () => {
        const result = await searchUsersAction('   ');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Search must be at least 3 characters');
      });

      it('should return error for tabs and newlines', async () => {
        const result = await searchUsersAction('\t\n');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Search must be at least 3 characters');
      });

      it('should accept exactly 3 characters', async () => {
        const mockProfiles = [
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
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

        const result = await searchUsersAction('abc');

        expect(result.success).toBe(true);
        expect(searchUsersByUsername).toHaveBeenCalledWith(mockSupabase, 'abc');
      });
    });

    describe('Query Processing', () => {
      it('should call search function with trimmed query', async () => {
        const mockProfiles = [
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
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

        const result = await searchUsersAction('  john  ');

        expect(searchUsersByUsername).toHaveBeenCalledWith(mockSupabase, 'john');
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockProfiles);
      });

      it('should handle special characters in query', async () => {
        const mockProfiles = [];
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

        const result = await searchUsersAction("o'brien-müller");

        expect(searchUsersByUsername).toHaveBeenCalledWith(mockSupabase, "o'brien-müller");
        expect(result.success).toBe(true);
      });

      it('should handle unicode characters', async () => {
        const mockProfiles = [];
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

        const result = await searchUsersAction('日本人');

        expect(searchUsersByUsername).toHaveBeenCalledWith(mockSupabase, '日本人');
        expect(result.success).toBe(true);
      });

      it('should handle emoji in query', async () => {
        const mockProfiles = [];
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

        const result = await searchUsersAction('john😀');

        expect(searchUsersByUsername).toHaveBeenCalledWith(mockSupabase, 'john😀');
        expect(result.success).toBe(true);
      });

      it('should handle very long search queries', async () => {
        const mockProfiles = [];
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

        const longQuery = 'a'.repeat(1000);
        const result = await searchUsersAction(longQuery);

        expect(searchUsersByUsername).toHaveBeenCalledWith(mockSupabase, longQuery);
        expect(result.success).toBe(true);
      });
    });

    describe('Results Handling', () => {
      it('should return empty array when no users found', async () => {
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: [],
          error: null,
        });

        const result = await searchUsersAction('nonexistent');

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should return null data as empty array', async () => {
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await searchUsersAction('test');

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should handle malformed response data', async () => {
        const malformedData = [{ invalid: 'data' }] as unknown as DbUserSearchResult[];
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: malformedData,
          error: null,
        });

        const result = await searchUsersAction('test');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(malformedData);
      });
    });

    describe('Error Handling', () => {
      it('should return error on search failure', async () => {
        const mockError = { message: 'Search failed', code: '42000' };
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: null,
          error: mockError,
        });

        const result = await searchUsersAction('john');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to search for users. Please try again.');
      });

      it('should return error on exception', async () => {
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockRejectedValue(new Error('Network error'));

        const result = await searchUsersAction('john');

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred while searching.');
      });

      it('should handle timeout errors', async () => {
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockRejectedValue(new Error('Timeout'));

        const result = await searchUsersAction('john');

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred while searching.');
      });
    });

    describe('Concurrent Requests', () => {
      it('should handle multiple concurrent search requests', async () => {
        const mockProfiles = [
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
        (
          searchUsersByUsername as jest.MockedFunction<typeof searchUsersByUsername>
        ).mockResolvedValue({
          data: mockProfiles,
          error: null,
        });

        const promises = [
          searchUsersAction('john'),
          searchUsersAction('jane'),
          searchUsersAction('bob'),
        ];

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result.success).toBe(true);
        });
      });
    });
  });

  describe('getTripMembersAction', () => {
    const mockTripId = 'trip-123';

    describe('Validation', () => {
      it('should handle empty trip ID', async () => {
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockResolvedValue({
          data: [],
          error: null,
        });

        const result = await getTripMembersAction('');

        expect(result.success).toBe(true);
        expect(getTripMembers).toHaveBeenCalledWith(mockSupabase, '');
      });

      it('should handle UUID format trip IDs', async () => {
        const uuidTripId = '550e8400-e29b-41d4-a716-446655440000';
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockResolvedValue({
          data: [],
          error: null,
        });

        const result = await getTripMembersAction(uuidTripId);

        expect(result.success).toBe(true);
        expect(getTripMembers).toHaveBeenCalledWith(mockSupabase, uuidTripId);
      });

      it('should handle very long trip IDs', async () => {
        const longTripId = 'trip-' + 'a'.repeat(500);
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockResolvedValue({
          data: [],
          error: null,
        });

        const result = await getTripMembersAction(longTripId);

        expect(result.success).toBe(true);
        expect(getTripMembers).toHaveBeenCalledWith(mockSupabase, longTripId);
      });
    });

    describe('Success Cases', () => {
      it('should return trip members on success', async () => {
        const mockMembers = [
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
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockResolvedValue({
          data: mockMembers,
          error: null,
        });

        const result = await getTripMembersAction(mockTripId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockMembers);
        expect(getTripMembers).toHaveBeenCalledWith(mockSupabase, mockTripId);
      });

      it('should return empty array when no members', async () => {
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockResolvedValue({
          data: [],
          error: null,
        });

        const result = await getTripMembersAction(mockTripId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });

      it('should return null data as empty array', async () => {
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockResolvedValue({
          data: null,
          error: null,
        });

        const result = await getTripMembersAction(mockTripId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual([]);
      });
    });

    describe('Error Handling', () => {
      it('should return error on database failure', async () => {
        const mockError = { message: 'Database error', code: '42000' };
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockResolvedValue({
          data: null,
          error: mockError,
        });

        const result = await getTripMembersAction(mockTripId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to load trip members. Please try again.');
      });

      it('should return error on exception', async () => {
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockRejectedValue(
          new Error('Network error')
        );

        const result = await getTripMembersAction(mockTripId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred while loading members.');
      });

      it('should handle malformed member data', async () => {
        const malformedMembers = [{ invalid: 'member' }] as unknown as TripMemberWithProfile[];
        (getTripMembers as jest.MockedFunction<typeof getTripMembers>).mockResolvedValue({
          data: malformedMembers,
          error: null,
        });

        const result = await getTripMembersAction(mockTripId);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(malformedMembers);
      });
    });
  });

  describe('inviteTripMemberAction', () => {
    const mockTripId = 'trip-123';
    const mockUserId = 'user-456';
    const mockFullName = 'John Doe';

    beforeEach(() => {
      // Setup authenticated user
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'current-user' } },
        error: null,
      }) as unknown as Promise<{
        data: { user: { id: string } | null } | null;
        error: { message: string } | null;
      }>;
    });

    describe('Authentication Checks', () => {
      it('should return error when user is not authenticated', async () => {
        mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }) as unknown as Promise<{
          data: { user: { id: string } | null } | null;
          error: { message: string } | null;
        }>;

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('You must be logged in to invite members.');
      });

      it('should return error when auth check fails', async () => {
        mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Auth error' },
        }) as unknown as Promise<{
          data: { user: { id: string } | null } | null;
          error: { message: string } | null;
        }>;

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('You must be logged in to invite members.');
      });

      it('should return error when user object is undefined', async () => {
        mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: undefined },
          error: null,
        }) as unknown as Promise<{
          data: { user: { id: string } | null } | null;
          error: { message: string } | null;
        }>;

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('You must be logged in to invite members.');
      });
    });

    describe('Authorization Checks', () => {
      it('should return error when user is not admin', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: false,
          error: null,
        });

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Only trip admins can invite new members.');
      });

      it('should return error when admin check fails', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: null,
          error: { message: 'Admin check failed' },
        });

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Only trip admins can invite new members.');
      });

      it('should return error when isAdmin is null', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: null,
          error: null,
        });

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Only trip admins can invite new members.');
      });
    });

    describe('Validation', () => {
      it('should handle empty user ID', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockMember = {
          id: 'member-new',
          trip_id: mockTripId,
          user_id: '',
          role: 'member',
          created_at: '',
        };
        (inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockResolvedValue({
          data: mockMember,
          error: null,
        });

        const result = await inviteTripMemberAction(mockTripId, '', mockFullName);

        expect(result.success).toBe(true);
        expect(inviteTripMember).toHaveBeenCalledWith(mockSupabase, mockTripId, '');
      });

      it('should handle null user ID', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockMember = {
          id: 'member-new',
          trip_id: mockTripId,
          user_id: null as string | null,
          role: 'member',
          created_at: '',
        };
        (inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockResolvedValue({
          data: mockMember,
          error: null,
        });

        const result = await inviteTripMemberAction(
          mockTripId,
          null as string | null,
          mockFullName
        );

        expect(result.success).toBe(true);
      });

      it('should handle empty full name', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockMember = {
          id: 'member-new',
          trip_id: mockTripId,
          user_id: mockUserId,
          role: 'member',
          created_at: '',
        };
        (inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockResolvedValue({
          data: mockMember,
          error: null,
        });

        const result = await inviteTripMemberAction(mockTripId, mockUserId, '');

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ fullName: '' });
      });

      it('should handle very long full name', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockMember = {
          id: 'member-new',
          trip_id: mockTripId,
          user_id: mockUserId,
          role: 'member',
          created_at: '',
        };
        (inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockResolvedValue({
          data: mockMember,
          error: null,
        });

        const longName = 'A'.repeat(1000);
        const result = await inviteTripMemberAction(mockTripId, mockUserId, longName);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ fullName: longName });
      });

      it('should handle special characters in full name', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockMember = {
          id: 'member-new',
          trip_id: mockTripId,
          user_id: mockUserId,
          role: 'member',
          created_at: '',
        };
        (inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockResolvedValue({
          data: mockMember,
          error: null,
        });

        const specialName = "O'Brien-Müller 日本人";
        const result = await inviteTripMemberAction(mockTripId, mockUserId, specialName);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ fullName: specialName });
      });
    });

    describe('Database Operations', () => {
      it('should return error on duplicate member (unique constraint)', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockError = { code: '23505', message: 'Duplicate entry' };
        (inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockResolvedValue({
          data: null,
          error: mockError,
        });

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe(`${mockFullName} is already a trip member.`);
      });

      it('should return error on invite failure', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockError = { message: 'Insert failed', code: '42000' };
        (inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockResolvedValue({
          data: null,
          error: mockError,
        });

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to invite member. Please try again.');
      });

      it('should return success with full name on successful invite', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockMember = {
          id: 'member-new',
          trip_id: mockTripId,
          user_id: mockUserId,
          role: 'member',
          created_at: '',
        };
        (inviteTripMember as jest.MockedFunction<typeof inviteTripMember>).mockResolvedValue({
          data: mockMember,
          error: null,
        });

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({ fullName: mockFullName });
      });
    });

    describe('Error Handling', () => {
      it('should return error on exception', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockRejectedValue(
          new Error('Network error')
        );

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred while inviting.');
      });

      it('should handle timeout errors', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockRejectedValue(
          new Error('Timeout')
        );

        const result = await inviteTripMemberAction(mockTripId, mockUserId, mockFullName);

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred while inviting.');
      });
    });
  });

  describe('removeTripMemberAction', () => {
    const mockTripId = 'trip-123';
    const mockUserId = 'user-456';

    beforeEach(() => {
      // Setup authenticated user
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: 'current-user' } },
        error: null,
      }) as unknown as Promise<{
        data: { user: { id: string } | null } | null;
        error: { message: string } | null;
      }>;
    });

    describe('Authentication Checks', () => {
      it('should return error when user is not authenticated', async () => {
        mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }) as unknown as Promise<{
          data: { user: { id: string } | null } | null;
          error: { message: string } | null;
        }>;

        const result = await removeTripMemberAction(mockTripId, mockUserId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('You must be logged in to remove members.');
      });

      it('should return error when auth check fails', async () => {
        mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Auth error' },
        }) as unknown as Promise<{
          data: { user: { id: string } | null } | null;
          error: { message: string } | null;
        }>;

        const result = await removeTripMemberAction(mockTripId, mockUserId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('You must be logged in to remove members.');
      });
    });

    describe('Authorization Checks', () => {
      it('should return error when user is not admin', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: false,
          error: null,
        });

        const result = await removeTripMemberAction(mockTripId, mockUserId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Only trip admins can remove members.');
      });

      it('should return error when admin check fails', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: null,
          error: { message: 'Admin check failed' },
        });

        const result = await removeTripMemberAction(mockTripId, mockUserId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Only trip admins can remove members.');
      });
    });

    describe('Validation', () => {
      it('should handle empty user ID', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        (removeTripMember as jest.MockedFunction<typeof removeTripMember>).mockResolvedValue({
          error: null,
        });

        const result = await removeTripMemberAction(mockTripId, '');

        expect(result.success).toBe(true);
        expect(removeTripMember).toHaveBeenCalledWith(mockSupabase, mockTripId, '');
      });

      it('should handle empty trip ID', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        (removeTripMember as jest.MockedFunction<typeof removeTripMember>).mockResolvedValue({
          error: null,
        });

        const result = await removeTripMemberAction('', mockUserId);

        expect(result.success).toBe(true);
        expect(removeTripMember).toHaveBeenCalledWith(mockSupabase, '', mockUserId);
      });

      it('should handle non-existent member', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        // Removing non-existent member still succeeds (idempotent)
        (removeTripMember as jest.MockedFunction<typeof removeTripMember>).mockResolvedValue({
          error: null,
        });

        const result = await removeTripMemberAction(mockTripId, 'non-existent-user');

        expect(result.success).toBe(true);
      });
    });

    describe('Database Operations', () => {
      it('should return error on remove failure', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        const mockError = { message: 'Delete failed', code: '42000' };
        (removeTripMember as jest.MockedFunction<typeof removeTripMember>).mockResolvedValue({
          error: mockError,
        });

        const result = await removeTripMemberAction(mockTripId, mockUserId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to remove member. Please try again.');
      });

      it('should return success on successful remove', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        (removeTripMember as jest.MockedFunction<typeof removeTripMember>).mockResolvedValue({
          error: null,
        });

        const result = await removeTripMemberAction(mockTripId, mockUserId);

        expect(result.success).toBe(true);
        expect(removeTripMember).toHaveBeenCalledWith(mockSupabase, mockTripId, mockUserId);
      });
    });

    describe('Error Handling', () => {
      it('should return error on exception', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockRejectedValue(
          new Error('Network error')
        );

        const result = await removeTripMemberAction(mockTripId, mockUserId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred while removing member.');
      });

      it('should handle timeout errors', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockRejectedValue(
          new Error('Timeout')
        );

        const result = await removeTripMemberAction(mockTripId, mockUserId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('An unexpected error occurred while removing member.');
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle concurrent remove requests for different users', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        (removeTripMember as jest.MockedFunction<typeof removeTripMember>).mockResolvedValue({
          error: null,
        });

        const promises = [
          removeTripMemberAction(mockTripId, 'user-1'),
          removeTripMemberAction(mockTripId, 'user-2'),
          removeTripMemberAction(mockTripId, 'user-3'),
        ];

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result.success).toBe(true);
        });
      });

      it('should handle concurrent remove requests for the same user', async () => {
        (isTripAdmin as jest.MockedFunction<typeof isTripAdmin>).mockResolvedValue({
          isAdmin: true,
          error: null,
        });

        (removeTripMember as jest.MockedFunction<typeof removeTripMember>).mockResolvedValue({
          error: null,
        });

        const promises = [
          removeTripMemberAction(mockTripId, mockUserId),
          removeTripMemberAction(mockTripId, mockUserId),
        ];

        const results = await Promise.all(promises);

        expect(results).toHaveLength(2);
        results.forEach((result) => {
          expect(result.success).toBe(true);
        });
      });
    });
  });
});
