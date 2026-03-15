/**
 * Test data seeding utility for E2E tests
 *
 * Uses Supabase service role key to bypass RLS and insert test data
 * directly into the ephemeral database.
 *
 * This approach is necessary because Next.js server components execute
 * on the server and client-side route mocks cannot intercept server-side
 * database calls.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Load environment from stack-env.json (created by global-setup)
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), 'playwright/.auth/stack-env.json');
let envVars: Record<string, string> = {};

try {
  const envContent = readFileSync(envPath, 'utf-8');
  envVars = JSON.parse(envContent);
} catch {
  // Fallback to process.env if stack-env.json doesn't exist
  envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '[seedTestData] SUPABASE_URL or SERVICE_ROLE_KEY is missing. ' +
      'Ensure global-setup has run successfully.'
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export interface SeedTestDataOptions {
  tripId?: string;
  currentUserId?: string;
  numberOfMembers?: number; // Number of members to create (default: 2)
  projectUsername?: string; // Specific project username to use (e.g., 'e2e_chromium', 'e2e_firefox')
  includeSearchUsers?: boolean; // Whether to create Alice/Bob search users
}

export interface SeedTestDataResult {
  tripId: string;
  currentUserId: string;
  existingMemberId: string | null;
  createdAuthUserId: string | null;
  searchUserIds?: { aliceId: string | null; bobId: string | null };
  verifiedAdmin?: boolean; // Track if admin status was verified after seeding
}

/**
 * Generate a deterministic UUID v4 from a string
 * This ensures we get the same UUIDs for the same test data each time
 * Exported for use in tests to generate consistent trip IDs
 */
export function deterministicUUID(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  // Convert to hex UUID format
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Create search test users (Alice Johnson, Bob Smith) for search tests
 * These users need to exist in the database for the search to find them
 *
 * IMPORTANT: This function now checks if users already exist before creating new ones
 * to prevent accumulation of duplicate users across test runs.
 */
export async function createSearchTestUsers(): Promise<{
  aliceId: string | null;
  bobId: string | null;
}> {
  let aliceId: string | null = null;
  let bobId: string | null = null;

  // Check if Alice Johnson already exists (look for any user with "Alice" in full_name)
  try {
    const { data: existingAlices } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', 'Alice%')
      .limit(1);

    if (existingAlices && existingAlices.length > 0) {
      aliceId = existingAlices[0].id;
      console.log(`[seedTestData] Reusing existing Alice Johnson user ${aliceId}`);
    }
  } catch (error) {
    console.warn(`[seedTestData] Failed to check for existing Alice:`, error);
  }

  // Create Alice Johnson only if doesn't exist
  if (!aliceId) {
    try {
      const uniqueSuffix = Math.random().toString(36).substring(2, 10);
      const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users`;
      const createAliceResponse = await fetch(authAdminUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          email: `alice.johnson-${uniqueSuffix}@packright.test`,
          password: 'Password123!',
          email_confirm: true,
          user_metadata: {
            full_name: 'Alice Johnson',
            username: `alicej${uniqueSuffix}`,
          },
        }),
      });

      if (createAliceResponse.ok) {
        const aliceData = await createAliceResponse.json();
        aliceId = aliceData.id;

        // Create profile for Alice
        await supabase.from('profiles').upsert(
          {
            id: aliceId,
            full_name: 'Alice Johnson',
            username: `alicej${uniqueSuffix}`,
            avatar_theme: null,
            packing_style: null,
          },
          { onConflict: 'id' }
        );

        console.log(`[seedTestData] Created Alice Johnson user ${aliceId}`);
      }
    } catch (error) {
      console.warn(`[seedTestData] Failed to create Alice Johnson:`, error);
    }
  }

  // Check if Bob Smith already exists (look for any user with "Bob" in full_name)
  try {
    const { data: existingBobs } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', 'Bob%')
      .limit(1);

    if (existingBobs && existingBobs.length > 0) {
      bobId = existingBobs[0].id;
      console.log(`[seedTestData] Reusing existing Bob Smith user ${bobId}`);
    }
  } catch (error) {
    console.warn(`[seedTestData] Failed to check for existing Bob:`, error);
  }

  // Create Bob Smith only if doesn't exist
  if (!bobId) {
    try {
      const uniqueSuffix = Math.random().toString(36).substring(2, 10);
      const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users`;
      const createBobResponse = await fetch(authAdminUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          email: `bob.smith-${uniqueSuffix}@packright.test`,
          password: 'Password123!',
          email_confirm: true,
          user_metadata: {
            full_name: 'Bob Smith',
            username: `bobsmith${uniqueSuffix}`,
          },
        }),
      });

      if (createBobResponse.ok) {
        const bobData = await createBobResponse.json();
        bobId = bobData.id;

        // Create profile for Bob
        await supabase.from('profiles').upsert(
          {
            id: bobId,
            full_name: 'Bob Smith',
            username: `bobsmith${uniqueSuffix}`,
            avatar_theme: null,
            packing_style: null,
          },
          { onConflict: 'id' }
        );

        console.log(`[seedTestData] Created Bob Smith user ${bobId}`);
      }
    } catch (error) {
      console.warn(`[seedTestData] Failed to create Bob Smith:`, error);
    }
  }

  return { aliceId, bobId };
}

/**
 * Seed test data for member-management E2E tests
 *
 * Creates:
 * - 1 trip (with valid UUID)
 * - 1-2 trip members (current user as admin + optional existing member)
 * - Creates auth user for "existing member" via Admin API if numberOfMembers > 1
 */
export async function seedMemberManagementTestData(options: SeedTestDataOptions = {}) {
  // Use a valid UUID for the trip ID
  const tripId = options.tripId || deterministicUUID('test-trip-123');
  const {
    currentUserId,
    numberOfMembers = 2,
    projectUsername,
    includeSearchUsers = false,
  } = options;

  // Get current user ID from profiles if not provided
  let userId = currentUserId;
  if (!userId) {
    // If projectUsername is provided, look up that specific user
    // This ensures the trip is created for the authenticated user in the current browser
    const usernameQuery = projectUsername
      ? { username: projectUsername }
      : { username: 'e2e_chromium' }; // Default to chromium user

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', usernameQuery.username)
      .limit(1);

    userId = profiles?.[0]?.id;
    console.log(`[seedTestData] Found userId ${userId} for username "${usernameQuery.username}"`);

    // Fallback to any e2e user if specific user not found
    if (!userId) {
      console.warn(
        `[seedTestData] User with username "${usernameQuery.username}" not found, falling back to any e2e user`
      );
      const { data: fallbackProfiles } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', 'e2e_%')
        .limit(1);
      userId = fallbackProfiles?.[0]?.id;
    }
  }

  if (!userId) {
    throw new Error('Could not determine current user ID. Provide currentUserId option.');
  }

  console.log(
    `[seedTestData] Creating test trip with ID ${tripId} for user ${userId}, members: ${numberOfMembers}`
  );

  // 1. Create test trip
  const { error: tripError } = await supabase.from('trips').upsert(
    {
      id: tripId,
      created_by: userId,
      title: 'Test Trip',
      destination: 'Test Destination',
      date_start: new Date().toISOString().split('T')[0],
      date_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_archived: false,
    },
    { onConflict: 'id' }
  );
  if (tripError) {
    console.error(`[seedTestData] Failed to upsert trip ${tripId}:`, JSON.stringify(tripError));
  } else {
    console.log(`[seedTestData] Successfully created trip ${tripId} with creator ${userId}`);
  }

  // ISSUE-#45: Wait for trip to be committed and visible before creating trip_members
  // This fixes foreign key constraint issues and timing problems
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 2. Create trip member for current user (admin) - use randomUUID  // 2. Add members
  console.log(`[seedTestData] Adding userId ${userId} as admin to trip ${tripId}`);
  const { error: adminError } = await supabase.from('trip_members').upsert(
    {
      trip_id: tripId,
      user_id: userId,
      role: 'admin',
    },
    { onConflict: 'trip_id,user_id' }
  );
  if (adminError) {
    console.error(`[seedTestData] Failed to add admin member: ${JSON.stringify(adminError)}`);
  } else {
    console.log(`[seedTestData] Successfully added admin ${userId} to trip ${tripId}`);
  }

  // ISSUE-#45: Add explicit wait for database commit to ensure data is visible to server components
  // This fixes timing issues where the Next.js server component reads stale data
  // Increased from 100ms to 500ms for more reliability
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify the admin member was created correctly
  // Don't use .single() as it may fail with PGRST116 if there are 0 or multiple rows
  const { data: verifyMembers, error: verifyError } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .eq('role', 'admin');

  const verifyMember = verifyMembers && verifyMembers.length > 0 ? verifyMembers[0] : null;

  if (verifyError || !verifyMember) {
    console.error(
      `[seedTestData] Failed to verify admin member for user ${userId}:`,
      JSON.stringify(verifyError),
      `Found ${verifyMembers?.length || 0} members`
    );
    // Retry once more after additional wait
    await new Promise((resolve) => setTimeout(resolve, 500));
    const { data: retryMembers, error: retryError } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .eq('role', 'admin');
    const retryMember = retryMembers && retryMembers.length > 0 ? retryMembers[0] : null;
    if (retryMember && !retryError) {
      console.log(`[seedTestData] Verified admin member on retry: user=${userId}, trip=${tripId}`);
    } else {
      console.error(`[seedTestData] Retry also failed:`, JSON.stringify(retryError));
    }
  } else {
    console.log(
      `[seedTestData] Verified admin member: user=${userId}, trip=${tripId}, role=${verifyMember.role}`
    );
  }

  // 3. Create additional "existing member" auth user via Admin API if numberOfMembers > 1
  let createdExistingUserId: string | null = null;
  let existingMemberTripId: string | null = null;

  if (numberOfMembers > 1) {
    // Use a random suffix for uniqueness instead of Date.now() which can duplicate
    const uniqueSuffix = Math.random().toString(36).substring(2, 10);
    const existingMemberEmail = `existing-member-${uniqueSuffix}@packright.test`;
    console.log(`[seedTestData] Attempting to create existing member with suffix: ${uniqueSuffix}`);

    try {
      const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users`;
      const createUserResponse = await fetch(authAdminUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          email: existingMemberEmail,
          password: 'Password123!',
          email_confirm: true,
          user_metadata: {
            full_name: 'Existing Member',
            username: `existingmember${uniqueSuffix}`,
          },
        }),
      });

      if (createUserResponse.ok) {
        const userData = await createUserResponse.json();
        createdExistingUserId = userData.id;
        console.log(
          `[seedTestData] Successfully created auth user for existing member: ${createdExistingUserId}`
        );

        // Create profile for the new user using upsert (handles duplicates)
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: createdExistingUserId,
            full_name: 'Existing Member',
            username: `existingmember${uniqueSuffix}`, // Use same unique suffix
            avatar_theme: null,
            packing_style: null,
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          console.error(
            `[seedTestData] Failed to create profile for existing member:`,
            JSON.stringify(profileError)
          );
        } else {
          console.log(
            `[seedTestData] Successfully created profile for existing member ${createdExistingUserId}`
          );
        }
      } else {
        const errorText = await createUserResponse.text();
        console.warn(`[seedTestData] Failed to create auth user for existing member: ${errorText}`);
      }
    } catch (error) {
      console.warn(`[seedTestData] Exception creating auth user for existing member:`, error);
    }

    // Create trip member for "existing member" if we successfully created the auth user - use randomUUID for uniqueness
    if (createdExistingUserId) {
      console.log(
        `[seedTestData] Attempting to create trip member for existing user ${createdExistingUserId} on trip ${tripId}`
      );
      const { error: existingMemberError } = await supabase.from('trip_members').upsert(
        {
          id: randomUUID(),
          trip_id: tripId,
          user_id: createdExistingUserId,
          role: 'member',
        },
        { onConflict: 'trip_id,user_id' }
      );

      if (existingMemberError) {
        console.error(
          `[seedTestData] Failed to upsert existing trip member:`,
          JSON.stringify(existingMemberError)
        );
      } else {
        console.log(
          `[seedTestData] Successfully created existing trip member ${createdExistingUserId} on trip ${tripId}`
        );
        existingMemberTripId = createdExistingUserId;
      }
    } else {
      console.warn(
        `[seedTestData] Skipping existing trip member creation - no auth user was created`
      );
    }
  }

  // 4. Create search users if requested
  let searchUserIds = undefined;
  if (includeSearchUsers) {
    searchUserIds = await createSearchTestUsers();
  }

  return {
    tripId,
    currentUserId: userId,
    existingMemberId: existingMemberTripId,
    createdAuthUserId: createdExistingUserId,
    searchUserIds,
    verifiedAdmin: !!verifyMember, // Include verification status in result
  };
}

/**
 * Clean up test data after tests complete
 * @param tripId The trip ID to clean up
 * @param createdAuthUserIds Optional array of auth user IDs to delete (if we created any)
 */
export async function cleanupMemberManagementTestData(
  tripId?: string,
  createdAuthUserIds?: string | string[]
) {
  if (!tripId) {
    tripId = deterministicUUID('test-trip-123');
  }
  // Cascade delete handles trip_members, items, etc.
  await supabase.from('trips').delete().eq('id', tripId);
  console.log(`[seedTestData] Cleaned up trip ${tripId}`);

  // Normalize to array
  const userIds = Array.isArray(createdAuthUserIds)
    ? createdAuthUserIds
    : createdAuthUserIds
      ? [createdAuthUserIds]
      : [];

  // Also delete the created auth users if provided
  for (const userId of userIds) {
    try {
      const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users/${userId}`;
      const deleteResponse = await fetch(authAdminUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (deleteResponse.ok) {
        console.log(`[seedTestData] Cleaned up auth user ${userId}`);
      } else {
        console.warn(`[seedTestData] Failed to delete auth user ${userId}`);
      }
    } catch (error) {
      console.warn(`[seedTestData] Exception deleting auth user ${userId}:`, error);
    }
  }
}

/**
 * Seed data for tests requiring many members (tests "+X" avatar display)
 * Creates 6 additional auth users and adds them to the trip.
 * Returns the result with all created auth user IDs for cleanup.
 */
export async function seedManyMembersTestData(
  tripId?: string,
  projectUsername?: string
): Promise<SeedTestDataResult & { additionalAuthUserIds: string[] }> {
  const actualTripId = tripId || deterministicUUID('test-trip-123');

  // First ensure base data exists (creates 2 members: admin + 1 existing)
  // Pass projectUsername to ensure the correct user is used as admin
  const baseResult = await seedMemberManagementTestData({ tripId: actualTripId, projectUsername });

  const additionalAuthUserIds: string[] = [];
  if (baseResult.createdAuthUserId) {
    additionalAuthUserIds.push(baseResult.createdAuthUserId);
  }

  // Create 4 more members (total 6: admin + 5 existing)
  for (let i = 0; i < 4; i++) {
    // Use random suffix for uniqueness
    const uniqueSuffix = Math.random().toString(36).substring(2, 10);
    const memberEmail = `member-${i}-${uniqueSuffix}@packright.test`;

    try {
      const authAdminUrl = `${supabaseUrl}/auth/v1/admin/users`;
      const createUserResponse = await fetch(authAdminUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          email: memberEmail,
          password: 'Password123!',
          email_confirm: true,
          user_metadata: {
            full_name: `Member ${i + 2}`,
            username: `member${i + 2}${uniqueSuffix}`,
          },
        }),
      });

      if (createUserResponse.ok) {
        const userData = await createUserResponse.json();
        const userId = userData.id;
        additionalAuthUserIds.push(userId);

        // Create profile for the new user using upsert (handles duplicates)
        await supabase.from('profiles').upsert(
          {
            id: userId,
            full_name: `Member ${i + 2}`,
            username: `member${i + 2}${uniqueSuffix}`,
            avatar_theme: null,
            packing_style: null,
          },
          { onConflict: 'id' }
        );

        // Create trip member using upsert (handles duplicates) - use randomUUID for uniqueness
        await supabase.from('trip_members').upsert(
          {
            id: randomUUID(),
            trip_id: actualTripId,
            user_id: userId,
            role: 'member',
          },
          { onConflict: 'trip_id,user_id' }
        );

        console.log(`[seedTestData] Created additional member ${i + 2} with auth user ${userId}`);
      }
    } catch (error) {
      console.warn(`[seedTestData] Exception creating additional member ${i}:`, error);
    }
  }

  // ISSUE-#45: Add explicit wait for database commit after creating additional members
  // Increased from 100ms to 500ms for more reliability
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Verify all members were created
  const { data: allMembers } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', actualTripId);
  console.log(
    `[seedTestData] Verified ${allMembers?.length || 0} members for trip ${actualTripId}`
  );

  // Verify admin member exists
  const { data: adminCheck } = await supabase
    .from('trip_members')
    .select('user_id, role')
    .eq('trip_id', actualTripId)
    .eq('role', 'admin');
  console.log(`[seedTestData] Admin check: ${JSON.stringify(adminCheck)}`);

  return {
    ...baseResult,
    additionalAuthUserIds,
    verifiedAdmin: baseResult.verifiedAdmin || !!allMembers?.length,
  };
}

/**
 * Update trip to have only one member (for singular "member" test)
 * Uses numberOfMembers: 1 option to create only the current user
 */
export async function seedSingleMemberTestData(
  tripId?: string,
  createdAuthUserId?: string,
  projectUsername?: string
): Promise<SeedTestDataResult> {
  const actualTripId = tripId || deterministicUUID('test-trip-123');

  // Clean up first (including any existing auth user)
  await cleanupMemberManagementTestData(actualTripId, createdAuthUserId);

  // ISSUE-#45: Add explicit wait after cleanup to ensure database consistency
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Seed with just the current user as member (numberOfMembers: 1)
  // Pass projectUsername to ensure the correct user is used
  const result = await seedMemberManagementTestData({
    tripId: actualTripId,
    numberOfMembers: 1,
    projectUsername,
  });

  return result;
}

/**
 * Get the current user ID from profiles
 */
export async function getCurrentUserId(username?: string): Promise<string> {
  // If a specific username is provided, use it (exact match)
  // Otherwise, fallback to the standard e2e_% lookup
  const query = username
    ? supabase.from('profiles').select('id').eq('username', username)
    : supabase.from('profiles').select('id').ilike('username', 'e2e_%');

  const { data, error } = await query.limit(1).single();
  if (error) {
    throw new Error(`Error fetching user ID: ${error.message}`);
  }

  const userId = data?.id;
  if (!userId) {
    throw new Error(
      username
        ? `No user found with username '${username}'`
        : 'No e2e test user found in profiles table'
    );
  }
  return userId;
}

/**
 * Seed items with different states for drag-drop tests
 * Creates items in needed, claimed, and packed states for testing drag-and-drop
 */
export async function seedKanbanBoardData(options: {
  tripId: string;
  items: Array<{
    name: string;
    category: string;
    required_count: number;
    status: 'needed' | 'claimed' | 'packed';
    claimed_by?: string;
    claimed_quantity?: number;
  }>;
}) {
  const { tripId, items } = options;

  console.log(`[seedTestData] Creating ${items.length} items for trip ${tripId}`);

  for (const item of items) {
    const itemId = randomUUID();
    const itemData: Record<string, unknown> = {
      id: itemId,
      trip_id: tripId,
      name: item.name,
      category: item.category,
      required_count: item.required_count,
      claim_type: 'multiple',
    };

    // Set status-based fields
    if (item.status === 'claimed' && item.claimed_by) {
      itemData.claimed_by = item.claimed_by;
      itemData.claimed_quantity = item.claimed_quantity || item.required_count;
    } else if (item.status === 'packed' && item.claimed_by) {
      itemData.claimed_by = item.claimed_by;
      itemData.claimed_quantity = item.claimed_quantity || item.required_count;
      itemData.packed_by = item.claimed_by;
      itemData.packed_quantity = item.claimed_quantity || item.required_count;
    }

    const { error } = await supabase.from('items').insert(itemData);
    if (error) {
      console.error(`[seedTestData] Failed to insert item ${item.name}:`, JSON.stringify(error));
    }
  }

  // Wait for database commit
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`[seedTestData] Successfully created ${items.length} items for trip ${tripId}`);
}

/**
 * Seed items with permissions for edit/delete tests
 * Creates items where different users have different permissions
 */
export async function seedItemPermissionsData(options: {
  tripId: string;
  creatorUserId: string;
  claimerUserId: string;
}) {
  const { tripId, creatorUserId, claimerUserId } = options;

  console.log(
    `[seedTestData] Creating permission test items for trip ${tripId}: creator=${creatorUserId}, claimer=${claimerUserId}`
  );

  // Item 1: Unassigned item (only creator/admin can edit)
  const unassignedItemId = randomUUID();
  await supabase.from('items').insert({
    id: unassignedItemId,
    trip_id: tripId,
    name: 'Unassigned Item',
    category: 'Essentials',
    required_count: 5,
    claim_type: 'multiple',
  });

  // Item 2: Claimed by claimer user (claimer can edit/pack/unclaim)
  const claimedItemId = randomUUID();
  await supabase.from('items').insert({
    id: claimedItemId,
    trip_id: tripId,
    name: 'Claimed Item',
    category: 'Essentials',
    required_count: 5,
    claim_type: 'multiple',
    claimed_by: claimerUserId,
    claimed_quantity: 3,
  });

  // Item 3: Packed by claimer user
  const packedItemId = randomUUID();
  await supabase.from('items').insert({
    id: packedItemId,
    trip_id: tripId,
    name: 'Packed Item',
    category: 'Essentials',
    required_count: 5,
    claim_type: 'multiple',
    claimed_by: claimerUserId,
    claimed_quantity: 5,
    packed_by: claimerUserId,
    packed_quantity: 5,
  });

  // Wait for database commit
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`[seedTestData] Created permission test items: unassigned, claimed, packed`);

  return { unassignedItemId, claimedItemId, packedItemId };
}

/**
 * Seed large number of items for performance tests
 * Creates many items to test board performance with large datasets
 */
export async function seedLargeBoardData(options: { tripId: string; itemCount: number }) {
  const { tripId, itemCount } = options;

  console.log(`[seedTestData] Creating ${itemCount} items for trip ${tripId}`);

  const categories = [
    'Essentials',
    'Clothing',
    'Food',
    'Health',
    'Electronics',
    'Documents',
    'Fitness',
    'Travel',
    'Toiletries',
    'Gear',
    'Misc',
  ];
  const itemNames = [
    'Tent',
    'Sleeping Bag',
    'Backpack',
    'Water Bottle',
    'Flashlight',
    'First Aid Kit',
    'Sunscreen',
    'Hat',
    'Sunglasses',
    'Camera',
    'Chargers',
    'Toiletries',
    'Towel',
    'Swimsuit',
    'Hiking Boots',
    'Jacket',
    'Pants',
    'Shirt',
    'Socks',
    'Underwear',
  ];

  const itemsToInsert = [];
  for (let i = 0; i < itemCount; i++) {
    const name = `${itemNames[i % itemNames.length]} ${Math.floor(i / itemNames.length) + 1}`;
    const category = categories[i % categories.length];
    const required_count = (i % 5) + 1; // 1-5 items

    itemsToInsert.push({
      id: randomUUID(),
      trip_id: tripId,
      name,
      category,
      required_count,
      claim_type: 'multiple',
    });
  }

  // Batch insert for performance
  const { error } = await supabase.from('items').insert(itemsToInsert);
  if (error) {
    console.error(`[seedTestData] Failed to batch insert items:`, JSON.stringify(error));
  }

  // Wait for database commit
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log(`[seedTestData] Successfully created ${itemCount} items for trip ${tripId}`);
}

/**
 * Seed items and claims specifically for auto-assign testing
 */
export async function seedAutoAssignItems(options: {
  tripId: string;
  items: Array<{
    name: string;
    required_count: number;
    category?: string;
  }>;
  existingClaims?: Array<{
    userId: string;
    itemId: string;
    quantity: number;
  }>;
}) {
  const { tripId, items, existingClaims = [] } = options;

  console.log(`[seedTestData] Seeding auto-assign items for trip ${tripId}`);

  // 1. Insert items
  const itemsToInsert = items.map((item) => ({
    id: randomUUID(),
    trip_id: tripId,
    name: item.name,
    category: item.category || 'Essentials',
    required_count: item.required_count,
    claim_type: 'multiple',
  }));

  const { error: itemsError } = await supabase.from('items').insert(itemsToInsert);
  if (itemsError) {
    console.error(`[seedTestData] Failed to insert items:`, JSON.stringify(itemsError));
    throw itemsError;
  }

  // Map names to IDs for claims
  const itemMap = new Map(itemsToInsert.map((i) => [i.name, i.id]));

  // 2. Insert existing claims if any
  if (existingClaims.length > 0) {
    const claimsToInsert = existingClaims.map((claim) => ({
      id: randomUUID(),
      trip_id: tripId,
      item_id: claim.itemId,
      user_id: claim.userId,
      quantity: claim.quantity,
    }));

    const { error: claimsError } = await supabase.from('item_claims').insert(claimsToInsert);
    if (claimsError) {
      console.error(`[seedTestData] Failed to insert claims:`, JSON.stringify(claimsError));
      throw claimsError;
    }
  }

  // Wait for database commit
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { itemIds: Array.from(itemMap.values()), itemMap };
}
