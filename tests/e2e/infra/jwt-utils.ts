import jwt from 'jsonwebtoken';

/**
 * Generates Supabase-compatible JWT keys for local testing.
 * @param secret The JWT secret to sign the keys with.
 * @returns An object containing the anon and service_role keys.
 */
export function generateSupabaseKeys(secret: string) {
  const anonPayload = {
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year
  };

  const serviceRolePayload = {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year
  };

  const anonKey = jwt.sign(anonPayload, secret);
  const serviceRoleKey = jwt.sign(serviceRolePayload, secret);

  return {
    anonKey,
    serviceRoleKey,
  };
}
