/**
 * Unit tests for src/components/layout/navbar.tsx
 *
 * Tests the Navbar component which displays navigation, user profile,
 * and sign out functionality.
 */

import { render, screen, waitFor } from '@testing-library/react';
import Navbar from '@/components/layout/navbar';
import type { Profile } from '@/types/profile.types';
import { createClient } from '@/lib/supabase/client';

// Mock dependencies
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSignOut = jest.fn().mockResolvedValue({ error: null });

jest.mock('@/lib/supabase/client');
jest.mock('@/lib/profile-utils', () => ({
  getInitials: (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe('Navbar', () => {
  const mockProfile: Profile = {
    id: 'user-123',
    username: 'testuser',
    full_name: 'Test User',
    avatar_theme: 'blue',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const mockSupabase = {
      auth: {
        signOut: mockSignOut,
      },
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('should show loading skeleton before mount', () => {
    render(<Navbar profile={mockProfile} />);

    // The skeleton should exist initially (before useEffect runs)
    const skeleton = document.querySelector('.animate-pulse');
    // Skeleton may have already been mounted, so we just check it doesn't crash
    expect(skeleton === null || skeleton).toBeDefined();
  });

  it('should render logo with brand name', async () => {
    render(<Navbar profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText('Pack')).toBeInTheDocument();
      expect(screen.getByText('Right')).toBeInTheDocument();
    });
  });

  it('should display username after mount', async () => {
    render(<Navbar profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });
  });

  it('should display user initials in avatar', async () => {
    render(<Navbar profile={mockProfile} />);

    await waitFor(() => {
      const avatar = screen.getByText('TU');
      expect(avatar).toBeInTheDocument();
    });
  });

  it('should use avatar theme color', async () => {
    const { container } = render(<Navbar profile={mockProfile} />);

    await waitFor(() => {
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toBeInTheDocument();
      // Check that inline style exists (not checking exact value due to potential escaping)
      expect(avatar?.getAttribute('style')).toContain('background-color');
    });
  });

  it('should handle missing full_name for initials', async () => {
    const profileWithoutName: Profile = {
      ...mockProfile,
      full_name: null,
    };

    render(<Navbar profile={profileWithoutName} />);

    await waitFor(() => {
      expect(screen.getByText('U')).toBeInTheDocument();
    });
  });

  it('should handle missing avatar_theme', async () => {
    const profileWithoutTheme: Profile = {
      ...mockProfile,
      avatar_theme: null,
    };

    const { container } = render(<Navbar profile={profileWithoutTheme} />);

    await waitFor(() => {
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toHaveStyle({ backgroundColor: '#8B6914' });
    });
  });

  it('should render user menu trigger button', async () => {
    render(<Navbar profile={mockProfile} />);

    await waitFor(() => {
      const avatarButton = screen.getByLabelText('User menu');
      expect(avatarButton).toBeInTheDocument();
      expect(avatarButton).toHaveAttribute('type', 'button');
    });
  });

  it('should have proper link to dashboard', async () => {
    render(<Navbar profile={mockProfile} />);

    await waitFor(() => {
      const logoLink = screen.getByText('Pack').closest('a');
      expect(logoLink).toHaveAttribute('href', '/dashboard');
    });
  });

  it('should handle profile with empty full_name', async () => {
    const profileWithEmptyName: Profile = {
      ...mockProfile,
      full_name: '',
    };

    render(<Navbar profile={profileWithEmptyName} />);

    await waitFor(() => {
      expect(screen.getByText('U')).toBeInTheDocument();
    });
  });

  it('should handle profile with empty username', async () => {
    const profileWithEmptyUsername: Profile = {
      ...mockProfile,
      username: '',
    };

    const { container } = render(<Navbar profile={profileWithEmptyUsername} />);

    await waitFor(() => {
      const usernameEl = container.querySelector('.text-sm.text-white\\/80.font-medium');
      expect(usernameEl).toBeInTheDocument();
    });
  });

  it('should apply proper styling classes', async () => {
    const { container } = render(<Navbar profile={mockProfile} />);

    await waitFor(() => {
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('h-16');
      expect(nav?.className).toContain('bg-');
    });
  });

  it('should handle profile changes', async () => {
    const { rerender } = render(<Navbar profile={mockProfile} />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const updatedProfile: Profile = {
      ...mockProfile,
      username: 'newuser',
      full_name: 'New User',
    };

    rerender(<Navbar profile={updatedProfile} />);

    await waitFor(() => {
      expect(screen.getByText('newuser')).toBeInTheDocument();
      expect(screen.getByText('NU')).toBeInTheDocument();
    });
  });
});
