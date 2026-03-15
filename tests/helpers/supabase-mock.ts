/**
 * Supabase Mock Factory - Mock Supabase client for testing
 *
 * This module provides consistent mock builders for Supabase client operations
 * across unit and integration tests.
 */

import { PostgrestError } from '@supabase/supabase-js';

export interface MockSupabaseClient {
  from: jest.Mock;
  auth?: {
    getUser: jest.Mock;
  };
}

export interface MockSupabaseQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  range: jest.Mock;
  rpc: jest.Mock;
}

/**
 * Creates a mock Supabase query builder with chainable methods
 */
export function createMockQueryBuilder(
  data: unknown = null,
  error: PostgrestError | null = null
): MockSupabaseQueryBuilder {
  const mockFunctions: Record<string, jest.Mock> = {};

  const chainableMethods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'in',
    'order',
    'limit',
    'range',
  ];

  // Create chainable mocks
  chainableMethods.forEach((method) => {
    mockFunctions[method] = jest.fn().mockReturnThis();
  });

  // Terminal methods return data/error
  mockFunctions.single = jest.fn().mockResolvedValue({ data, error });
  mockFunctions.maybeSingle = jest.fn().mockResolvedValue({ data, error });
  mockFunctions.rpc = jest.fn().mockResolvedValue({ data, error });

  return mockFunctions;
}

/**
 * Creates a mock Supabase client
 */
export function createMockSupabaseClient(
  overrides?: Partial<MockSupabaseClient>
): MockSupabaseClient {
  const defaultClient: MockSupabaseClient = {
    from: jest.fn().mockReturnValue(createMockQueryBuilder()),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  };

  return { ...defaultClient, ...overrides };
}

/**
 * Creates a mock Supabase error
 */
export function createMockSupabaseError(
  message: string,
  code?: string,
  details?: string,
  hint?: string
): PostgrestError {
  return {
    message,
    code,
    details,
    hint,
  };
}

/**
 * Sets up mock data for a table query
 */
export function mockTableQuery(
  mockClient: MockSupabaseClient,
  tableName: string,
  data: unknown,
  error: PostgrestError | null = null
): void {
  const mockQueryBuilder = createMockQueryBuilder(data, error);
  (mockClient.from as jest.Mock).mockReturnValue(mockQueryBuilder);
}

/**
 * Resets all mock calls
 */
export function resetSupabaseMocks(mockClient: MockSupabaseClient): void {
  mockClient.from.mockClear();
  if (mockClient.auth) {
    mockClient.auth.getUser.mockClear();
  }
}

/**
 * Creates mock authenticated user
 */
export function createMockAuthUser(userId: string, email?: string) {
  return {
    id: userId,
    email: email || `user-${userId}@example.com`,
    aud: 'authenticated',
    role: 'authenticated',
  };
}

/**
 * Creates mock auth response
 */
export function createMockAuthResponse(
  user: ReturnType<typeof createMockAuthUser> | null,
  error: PostgrestError | null = null
) {
  return {
    data: { user },
    error,
  };
}
