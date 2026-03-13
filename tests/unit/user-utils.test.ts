import { getUserDisplayName, getUserInitials, UserProfile } from '@/lib/utils';

describe('user utility functions', () => {
  describe('getUserDisplayName', () => {
    it('returns full_name when available', () => {
      const profile: UserProfile = {
        id: 'user-1',
        full_name: 'John Doe',
        username: 'johndoe',
        avatar_theme: 'light',
      };

      expect(getUserDisplayName(profile)).toBe('John Doe');
    });

    it('falls back to username when full_name is null', () => {
      const profile: UserProfile = {
        id: 'user-1',
        full_name: null,
        username: 'johndoe',
        avatar_theme: 'light',
      };

      expect(getUserDisplayName(profile)).toBe('johndoe');
    });

    it('falls back to username when full_name is undefined', () => {
      const profile: Partial<UserProfile> = {
        id: 'user-1',
        username: 'johndoe',
      };

      expect(getUserDisplayName(profile)).toBe('johndoe');
    });

    it('returns truncated user ID when both full_name and username are null', () => {
      const profile: UserProfile = {
        id: 'abc123-user-id',
        full_name: null,
        username: null,
        avatar_theme: null,
      };

      expect(getUserDisplayName(profile, 'abc123-user-id')).toBe('User abc1');
    });

    it('returns truncated userId when profile is null', () => {
      expect(getUserDisplayName(null, 'abc123-user-id')).toBe('User abc1');
    });

    it('returns truncated userId when profile is undefined', () => {
      expect(getUserDisplayName(undefined, 'abc123-user-id')).toBe('User abc1');
    });

    it('returns Unknown User when no information available', () => {
      expect(getUserDisplayName(null)).toBe('Unknown User');
    });

    it('returns Unknown User when profile exists but has no names and no userId', () => {
      const profile: UserProfile = {
        id: 'user-1',
        full_name: null,
        username: null,
        avatar_theme: null,
      };

      expect(getUserDisplayName(profile)).toBe('Unknown User');
    });
  });

  describe('getUserInitials', () => {
    it('returns first two letters of full_name', () => {
      const profile: UserProfile = {
        id: 'user-1',
        full_name: 'John Doe',
        username: 'johndoe',
        avatar_theme: 'light',
      };

      expect(getUserInitials(profile)).toBe('JD');
    });

    it('returns first two letters of username as fallback', () => {
      const profile: UserProfile = {
        id: 'user-1',
        full_name: null,
        username: 'johndoe',
        avatar_theme: 'light',
      };

      expect(getUserInitials(profile)).toBe('J');
    });

    it('returns first two letters of userId as final fallback', () => {
      const profile: UserProfile = {
        id: 'abc123-user-id',
        full_name: null,
        username: null,
        avatar_theme: null,
      };

      expect(getUserInitials(profile, 'abc123-user-id')).toBe('UA');
    });

    it('handles single word full_name correctly', () => {
      const profile: UserProfile = {
        id: 'user-1',
        full_name: 'John',
        username: 'johndoe',
        avatar_theme: 'light',
      };

      expect(getUserInitials(profile)).toBe('J');
    });

    it('handles null profile with userId', () => {
      expect(getUserInitials(null, 'abc123-user-id')).toBe('UA');
    });

    it('returns empty string when no information available', () => {
      expect(getUserInitials(null)).toBe('UU');
    });

    it('capitalizes initials regardless of input case', () => {
      const profile: UserProfile = {
        id: 'user-1',
        full_name: 'john doe',
        username: 'johndoe',
        avatar_theme: 'light',
      };

      expect(getUserInitials(profile)).toBe('JD');
    });

    it('limits to 2 characters max', () => {
      const profile: UserProfile = {
        id: 'user-1',
        full_name: 'John Quincy Adams',
        username: 'johndoe',
        avatar_theme: 'light',
      };

      expect(getUserInitials(profile)).toBe('JQ');
    });
  });
});
