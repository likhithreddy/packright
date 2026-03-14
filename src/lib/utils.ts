import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * User profile information from the profiles table
 */
export interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_theme: string | null;
}

/**
 * Gets the display name for a user from their profile.
 * Prefers full_name, falls back to username, then user ID.
 */
export function getUserDisplayName(
  profile: Partial<UserProfile> | null | undefined,
  userId?: string
): string {
  if (!profile) {
    return userId ? `User ${userId.slice(0, 4)}` : 'Unknown User';
  }
  return (
    profile.full_name ||
    profile.username ||
    (userId ? `User ${userId.slice(0, 4)}` : 'Unknown User')
  );
}

/**
 * Gets initials for a user's display name.
 */
export function getUserInitials(
  profile: Partial<UserProfile> | null | undefined,
  userId?: string
): string {
  const name = getUserDisplayName(profile, userId);
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
