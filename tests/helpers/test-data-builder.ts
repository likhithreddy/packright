/**
 * Test Data Builder - Factory functions for creating consistent test data
 *
 * This module provides builder functions for creating mock objects used in tests.
 * All builders support overrides via Partial<T> pattern for flexibility.
 */

import type { UserProfile, ItemWithClaims, ItemClaim, Database } from '@/types/database.types';

/**
 * Creates a mock user profile
 */
export function createMockProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    id: 'user-1',
    full_name: 'Test User',
    username: 'testuser',
    avatar_theme: 'blue',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock item claim
 */
export function createMockClaim(overrides?: Partial<ItemClaim>): ItemClaim {
  return {
    id: 'claim-1',
    item_id: 'item-1',
    trip_id: 'trip-1',
    user_id: 'user-1',
    quantity: 1,
    is_packed: false,
    sort_order: 0,
    created_at: new Date().toISOString(),
    profiles: null,
    ...overrides,
  };
}

/**
 * Creates a mock item with claims
 */
export function createMockItem(overrides?: Partial<ItemWithClaims>): ItemWithClaims {
  const now = new Date().toISOString();
  return {
    id: 'item-1',
    trip_id: 'trip-1',
    name: 'Test Item',
    category: 'Essentials',
    required_count: 1,
    total_claimed: 0,
    total_packed: 0,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    claims: [],
    ...overrides,
  };
}

/**
 * Creates multiple mock items
 */
export function createMockItems(
  count: number,
  overrides?: Partial<ItemWithClaims>
): ItemWithClaims[] {
  return Array.from({ length: count }, (_, i) =>
    createMockItem({
      ...overrides,
      id: `item-${i + 1}`,
      name: `Test Item ${i + 1}`,
    })
  );
}

/**
 * Creates a mock trip
 */
export function createMockTrip(overrides?: Partial<Database['public']['Tables']['trips']['Row']>) {
  const now = new Date().toISOString();
  return {
    id: 'trip-1',
    title: 'Test Trip',
    destination: 'Test Destination',
    start_date: now,
    end_date: now,
    created_by: 'user-1',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Creates a mock trip member
 */
export function createMockTripMember(
  overrides?: Partial<Database['public']['Tables']['trip_members']['Row']>
) {
  const now = new Date().toISOString();
  return {
    id: 'member-1',
    trip_id: 'trip-1',
    user_id: 'user-1',
    role: 'member',
    created_at: now,
    ...overrides,
  };
}

/**
 * Creates a Supabase PostgrestError
 */
export function createMockError(
  message: string,
  code?: string,
  details?: string,
  hint?: string
): Database['public']['Functions']['get_trip_items']['Returns']['join']['item_claims']['error'] {
  return {
    message,
    code,
    details,
    hint,
  } as Database['public']['Functions']['get_trip_items']['Returns']['join']['item_claims']['error'];
}

/**
 * Creates a mock Supabase response
 */
export function createMockResponse<T>(
  data: T | null,
  error: Database['public']['Tables']['trips']['Insert']['error'] | null = null
) {
  return { data, error };
}

/**
 * Builder pattern for complex test data setup
 */
export class TestDataBuilder {
  private items: ItemWithClaims[] = [];
  private profiles: UserProfile[] = [];
  private claims: ItemClaim[] = [];

  withItem(item: Partial<ItemWithClaims>): this {
    const newItem = createMockItem(item);
    this.items.push(newItem);
    return this;
  }

  withItems(count: number, overrides?: Partial<ItemWithClaims>): this {
    const newItems = createMockItems(count, overrides);
    this.items.push(...newItems);
    return this;
  }

  withProfile(profile: Partial<UserProfile>): this {
    const newProfile = createMockProfile(profile);
    this.profiles.push(newProfile);
    return this;
  }

  withClaim(claim: Partial<ItemClaim>): this {
    const newClaim = createMockClaim(claim);
    this.claims.push(newClaim);
    return this;
  }

  build() {
    return {
      items: this.items,
      profiles: this.profiles,
      claims: this.claims,
    };
  }
}
