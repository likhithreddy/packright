import {
  calculateDistributions,
  MemberClaimStats,
  UnassignedItem,
} from '../../src/lib/supabase/auto-assign';

describe('calculateDistributions', () => {
  it('should distribute items evenly among members', () => {
    const members: MemberClaimStats[] = [
      { userId: 'user1', currentQuantity: 0 },
      { userId: 'user2', currentQuantity: 0 },
    ];
    const items: UnassignedItem[] = [
      { id: 'item1', name: 'Tent', requiredCount: 2, currentlyClaimedCount: 0 },
    ];

    const results = calculateDistributions(members, items);

    expect(results).toHaveLength(2);
    expect(results).toContainEqual({ itemId: 'item1', userId: 'user1', quantity: 1 });
    expect(results).toContainEqual({ itemId: 'item1', userId: 'user2', quantity: 1 });
  });

  it('should prioritize members with lower counts', () => {
    const members: MemberClaimStats[] = [
      { userId: 'user1', currentQuantity: 5 },
      { userId: 'user2', currentQuantity: 2 },
    ];
    const items: UnassignedItem[] = [
      { id: 'item1', name: 'Water', requiredCount: 3, currentlyClaimedCount: 0 },
    ];

    const results = calculateDistributions(members, items);

    // user2 should get all 3 to catch up (2+3=5, matches user1)
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ itemId: 'item1', userId: 'user2', quantity: 3 });
  });

  it('should handle multi-item distribution', () => {
    const members: MemberClaimStats[] = [
      { userId: 'user1', currentQuantity: 0 },
      { userId: 'user2', currentQuantity: 0 },
      { userId: 'user3', currentQuantity: 0 },
    ];
    const items: UnassignedItem[] = [
      { id: 'item1', name: 'Food', requiredCount: 4, currentlyClaimedCount: 0 },
      { id: 'item2', name: 'Stove', requiredCount: 1, currentlyClaimedCount: 0 },
    ];

    const results = calculateDistributions(members, items);

    // Total 5 units for 3 people. 5/3 = 1.66. Expect 2 people to have 2 items, 1 person to have 1 item.
    // Total assigned sum should be 5
    const totalAssigned = results.reduce((sum, a) => sum + a.quantity, 0);
    expect(totalAssigned).toBe(5);

    const user1Count = results
      .filter((a) => a.userId === 'user1')
      .reduce((s, a) => s + a.quantity, 0);
    const user2Count = results
      .filter((a) => a.userId === 'user2')
      .reduce((s, a) => s + a.quantity, 0);
    const user3Count = results
      .filter((a) => a.userId === 'user3')
      .reduce((s, a) => s + a.quantity, 0);

    const counts = [user1Count, user2Count, user3Count].sort();
    expect(counts).toEqual([1, 2, 2]);
  });

  it('should handle already partially claimed items', () => {
    const members: MemberClaimStats[] = [
      { userId: 'user1', currentQuantity: 2 },
      { userId: 'user2', currentQuantity: 0 },
    ];
    const items: UnassignedItem[] = [
      // 5 required, 3 already claimed (unassigned: 2)
      { id: 'item1', name: 'Chips', requiredCount: 5, currentlyClaimedCount: 3 },
    ];

    const results = calculateDistributions(members, items);

    // Both unassigned chips should go to user2 to reach parity with user1
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ itemId: 'item1', userId: 'user2', quantity: 2 });
  });

  it('should return empty array if no items to assign', () => {
    const members: MemberClaimStats[] = [{ userId: 'user1', currentQuantity: 0 }];
    const items: UnassignedItem[] = [
      { id: 'item1', name: 'Tent', requiredCount: 1, currentlyClaimedCount: 1 },
    ];

    const results = calculateDistributions(members, items);
    expect(results).toHaveLength(0);
  });
});
