import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import {
  getAutoAssignData,
  performAutoAssignment,
  calculateDistributions,
  MemberClaimStats,
  UnassignedItem,
  Assignment,
} from '@/lib/supabase/auto-assign';
import { getTripMembers } from '@/lib/supabase/trip-members';
import { getTripItems } from '@/lib/supabase/items';

// Mock dependencies
jest.mock('@/lib/supabase/trip-members');
jest.mock('@/lib/supabase/items');

const mockGetTripMembers = getTripMembers as jest.MockedFunction<typeof getTripMembers>;
const mockGetTripItems = getTripItems as jest.MockedFunction<typeof getTripItems>;

describe('getAutoAssignData', () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
      channel: jest.fn(),
    } as unknown as SupabaseClient;
  });

  it('should return error when fetching members fails', async () => {
    const mockError = { code: 'P0001', message: 'Database error' } as PostgrestError;
    mockGetTripMembers.mockResolvedValue({ data: null, error: mockError });

    const result = await getAutoAssignData(mockSupabase, 'trip-1');

    expect(result).toEqual({
      members: null,
      items: null,
      error: mockError,
    });
    expect(mockGetTripMembers).toHaveBeenCalledWith(mockSupabase, 'trip-1');
  });

  it('should return error when fetching items fails', async () => {
    const mockError = { code: 'P0002', message: 'Items fetch failed' } as PostgrestError;
    mockGetTripMembers.mockResolvedValue({
      data: [
        {
          user_id: 'user-1',
          trip_id: 'trip-1',
          is_admin: false,
          profiles: { full_name: 'User One', username: 'userone', avatar_theme: 'blue' },
        },
      ],
      error: null,
    });
    mockGetTripItems.mockResolvedValue({ data: null, error: mockError });

    const result = await getAutoAssignData(mockSupabase, 'trip-1');

    expect(result).toEqual({
      members: null,
      items: null,
      error: mockError,
    });
  });

  it('should return empty arrays when no data exists', async () => {
    mockGetTripMembers.mockResolvedValue({ data: null, error: null });
    mockGetTripItems.mockResolvedValue({ data: null, error: null });

    const result = await getAutoAssignData(mockSupabase, 'trip-1');

    expect(result).toEqual({
      members: [],
      items: [],
      error: null,
    });
  });

  it('should calculate member stats correctly from existing claims', async () => {
    mockGetTripMembers.mockResolvedValue({
      data: [
        {
          user_id: 'user-1',
          trip_id: 'trip-1',
          is_admin: false,
          profiles: { full_name: 'User One', username: 'userone', avatar_theme: 'blue' },
        },
        {
          user_id: 'user-2',
          trip_id: 'trip-1',
          is_admin: false,
          profiles: { full_name: 'User Two', username: 'usertwo', avatar_theme: 'green' },
        },
      ],
      error: null,
    });

    mockGetTripItems.mockResolvedValue({
      data: [
        {
          id: 'item-1',
          trip_id: 'trip-1',
          name: 'Tent',
          required_count: 2,
          category: 'Essentials',
          sort_order: 0,
          created_at: new Date().toISOString(),
          claims: [
            {
              id: 'claim-1',
              item_id: 'item-1',
              trip_id: 'trip-1',
              user_id: 'user-1',
              quantity: 2,
              is_packed: false,
              sort_order: 0,
              created_at: new Date().toISOString(),
            },
          ],
          total_claimed: 2,
          total_packed: 0,
        },
      ],
      error: null,
    });

    const result = await getAutoAssignData(mockSupabase, 'trip-1');

    expect(result.error).toBeNull();
    expect(result.members).toEqual([
      { userId: 'user-1', currentQuantity: 2 },
      { userId: 'user-2', currentQuantity: 0 },
    ]);
  });

  it('should exclude items that are fully claimed', async () => {
    mockGetTripMembers.mockResolvedValue({
      data: [
        {
          user_id: 'user-1',
          trip_id: 'trip-1',
          is_admin: false,
          profiles: { full_name: 'User One', username: 'userone', avatar_theme: 'blue' },
        },
      ],
      error: null,
    });

    mockGetTripItems.mockResolvedValue({
      data: [
        {
          id: 'item-1',
          trip_id: 'trip-1',
          name: 'Fully Claimed Item',
          required_count: 2,
          category: 'Essentials',
          sort_order: 0,
          created_at: new Date().toISOString(),
          claims: [],
          total_claimed: 2,
          total_packed: 0,
        },
        {
          id: 'item-2',
          trip_id: 'trip-1',
          name: 'Partially Claimed Item',
          required_count: 3,
          category: 'Essentials',
          sort_order: 1,
          created_at: new Date().toISOString(),
          claims: [],
          total_claimed: 1,
          total_packed: 0,
        },
      ],
      error: null,
    });

    const result = await getAutoAssignData(mockSupabase, 'trip-1');

    expect(result.error).toBeNull();
    expect(result.items).toHaveLength(1);
    expect(result.items?.[0].id).toBe('item-2');
    expect(result.items?.[0].currentlyClaimedCount).toBe(1);
  });
});

describe('performAutoAssignment', () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
    } as unknown as SupabaseClient;
  });

  it('should return early with no error for empty assignments', async () => {
    const assignments: Assignment[] = [];

    const result = await performAutoAssignment(mockSupabase, 'trip-1', assignments);

    expect(result).toEqual({ error: null });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should update existing claim when assignment exists', async () => {
    const assignments: Assignment[] = [{ itemId: 'item-1', userId: 'user-1', quantity: 2 }];

    const mockExistingClaim = { id: 'claim-1', quantity: 1 };
    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: mockExistingClaim,
      error: null,
    });
    const mockEq = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    const result = await performAutoAssignment(mockSupabase, 'trip-1', assignments);

    expect(result.error).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith({ quantity: mockExistingClaim.quantity + 2 });
  });

  it('should insert new claim when none exists', async () => {
    const assignments: Assignment[] = [{ itemId: 'item-1', userId: 'user-1', quantity: 2 }];

    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const mockEq = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    const mockInsert = jest.fn().mockResolvedValue({ error: null });

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    const result = await performAutoAssignment(mockSupabase, 'trip-1', assignments);

    expect(result.error).toBeNull();
    expect(mockInsert).toHaveBeenCalledWith({
      trip_id: 'trip-1',
      item_id: 'item-1',
      user_id: 'user-1',
      quantity: 2,
      is_packed: false,
    });
  });

  it('should handle update errors gracefully', async () => {
    const assignments: Assignment[] = [{ itemId: 'item-1', userId: 'user-1', quantity: 2 }];

    const mockError = { code: 'P0001', message: 'Update failed' } as PostgrestError;
    const mockExistingClaim = { id: 'claim-1', quantity: 1 };
    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: mockExistingClaim,
      error: null,
    });
    const mockEq = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    const mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: mockError }),
    });

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    });

    const result = await performAutoAssignment(mockSupabase, 'trip-1', assignments);

    expect(result.error).toEqual(mockError);
  });

  it('should handle insert errors gracefully', async () => {
    const assignments: Assignment[] = [{ itemId: 'item-1', userId: 'user-1', quantity: 2 }];

    const mockError = { code: 'P0002', message: 'Insert failed' } as PostgrestError;
    const mockMaybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const mockEq = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq, maybeSingle: mockMaybeSingle });
    const mockInsert = jest.fn().mockResolvedValue({ error: mockError });

    (mockSupabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    const result = await performAutoAssignment(mockSupabase, 'trip-1', assignments);

    expect(result.error).toEqual(mockError);
  });
});

describe('calculateDistributions - Additional Edge Cases', () => {
  it('should return empty array when no members provided', () => {
    const members: MemberClaimStats[] = [];
    const items: UnassignedItem[] = [
      { id: 'item-1', name: 'Tent', requiredCount: 2, currentlyClaimedCount: 0 },
    ];

    const result = calculateDistributions(members, items);

    expect(result).toEqual([]);
  });

  it('should skip items where remaining count is zero', () => {
    const members: MemberClaimStats[] = [{ userId: 'user-1', currentQuantity: 0 }];
    const items: UnassignedItem[] = [
      { id: 'item-1', name: 'Full Tent', requiredCount: 2, currentlyClaimedCount: 2 },
      { id: 'item-2', name: 'Water', requiredCount: 3, currentlyClaimedCount: 0 },
    ];

    const result = calculateDistributions(members, items);

    expect(result).toHaveLength(1);
    expect(result[0].itemId).toBe('item-2');
    expect(result[0].quantity).toBe(3);
  });

  it('should handle multiple items with different remaining counts', () => {
    const members: MemberClaimStats[] = [
      { userId: 'user-1', currentQuantity: 0 },
      { userId: 'user-2', currentQuantity: 0 },
    ];
    const items: UnassignedItem[] = [
      { id: 'item-1', name: 'Tent', requiredCount: 2, currentlyClaimedCount: 0 }, // 2 remaining
      { id: 'item-2', name: 'Water', requiredCount: 5, currentlyClaimedCount: 2 }, // 3 remaining
      { id: 'item-3', name: 'Food', requiredCount: 1, currentlyClaimedCount: 1 }, // 0 remaining
    ];

    const result = calculateDistributions(members, items);

    // Total: 2 + 3 = 5 units to distribute among 2 people
    const totalAssigned = result.reduce((sum, a) => sum + a.quantity, 0);
    expect(totalAssigned).toBe(5);

    // Each user should get approximately equal amounts
    const user1Total = result
      .filter((a) => a.userId === 'user-1')
      .reduce((sum, a) => sum + a.quantity, 0);
    const user2Total = result
      .filter((a) => a.userId === 'user-2')
      .reduce((sum, a) => sum + a.quantity, 0);

    expect(Math.abs(user1Total - user2Total)).toBeLessThanOrEqual(1);
  });

  it('should consolidate assignments for same item-user pair', () => {
    const members: MemberClaimStats[] = [{ userId: 'user-1', currentQuantity: 0 }];
    const items: UnassignedItem[] = [
      { id: 'item-1', name: 'Water', requiredCount: 5, currentlyClaimedCount: 0 },
    ];

    const result = calculateDistributions(members, items);

    // Should have 1 assignment, not 5 separate ones
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      itemId: 'item-1',
      userId: 'user-1',
      quantity: 5,
    });
  });

  it('should handle items with zero remaining count', () => {
    const members: MemberClaimStats[] = [
      { userId: 'user-1', currentQuantity: 0 },
      { userId: 'user-2', currentQuantity: 0 },
    ];
    const items: UnassignedItem[] = [
      { id: 'item-1', name: 'Full Item', requiredCount: 3, currentlyClaimedCount: 3 },
      { id: 'item-2', name: 'Another Full', requiredCount: 1, currentlyClaimedCount: 1 },
    ];

    const result = calculateDistributions(members, items);

    expect(result).toEqual([]);
  });
});
