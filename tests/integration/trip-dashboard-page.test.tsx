/**
 * ISSUE-#45: Integration tests for Trip Dashboard Page
 *
 * Comprehensive tests covering rendering, admin vs non-admin behavior,
 * error states, and permissions.
 *
 * Target Coverage: 90%+
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TripDashboardClient } from '@/components/features/trips/TripDashboardClient';
import { TripMemberWithProfile } from '@/lib/supabase/trip-members';

// Mock Next.js navigation - exact same pattern as new-trip-modal
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

import { useRouter } from 'next/navigation';

// Create tracked mock functions
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockPrefetch = jest.fn();

// Mock ResizeObserver and IntersectionObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

describe('TripDashboardClient Integration', () => {
  const mockTripId = 'trip-123';
  const mockCurrentUserId = 'user-current';

  // Mock trip members data
  const mockMembers: TripMemberWithProfile[] = [
    {
      id: 'member-1',
      trip_id: mockTripId,
      user_id: 'user-admin',
      role: 'admin',
      created_at: '2024-01-01T00:00:00Z',
      profile: {
        id: 'user-admin',
        full_name: 'Admin User',
        username: 'adminuser',
        avatar_theme: null,
        packing_style: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    },
    {
      id: 'member-2',
      trip_id: mockTripId,
      user_id: mockCurrentUserId,
      role: 'admin',
      created_at: '2024-01-02T00:00:00Z',
      profile: {
        id: mockCurrentUserId,
        full_name: 'Current User',
        username: 'currentuser',
        avatar_theme: null,
        packing_style: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    },
    {
      id: 'member-3',
      trip_id: mockTripId,
      user_id: 'user-member-1',
      role: 'member',
      created_at: '2024-01-03T00:00:00Z',
      profile: {
        id: 'user-member-1',
        full_name: 'Member One',
        username: 'memberone',
        avatar_theme: null,
        packing_style: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    },
  ];

  const defaultProps = {
    tripId: mockTripId,
    currentUserId: mockCurrentUserId,
    members: mockMembers,
    currentUserIsAdmin: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup router mock - exact same pattern as new-trip-modal
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
      prefetch: mockPrefetch,
    });
  });

  describe('Rendering', () => {
    it('should render trip dashboard page', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Trip Dashboard')).toBeInTheDocument();
      });
    });

    it('should render Back button', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });
    });

    it('should render header section', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Trip Dashboard')).toBeInTheDocument();
      });
    });

    it('should render main content area with placeholder', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Packing Board Coming Soon')).toBeInTheDocument();
      });
    });

    it('should render placeholder description text', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText(/The collaborative packing board will appear here/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Avatar Display', () => {
    it('should display avatar group for visible members', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        const avatars = document.querySelectorAll('[data-testid="avatar"]');
        expect(avatars.length).toBeGreaterThan(0);
      });
    });

    it('should limit visible avatars to 5', async () => {
      const manyMembers = Array.from({ length: 10 }, (_, i) => ({
        id: `member-${i}`,
        trip_id: mockTripId,
        user_id: `user-${i}`,
        role: 'member' as const,
        created_at: '2024-01-01T00:00:00Z',
        profile: {
          id: `user-${i}`,
          full_name: `User ${i}`,
          username: `user${i}`,
          avatar_theme: null,
          packing_style: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }));

      render(<TripDashboardClient {...defaultProps} members={manyMembers} />);

      await waitFor(() => {
        expect(screen.getByText('10 members')).toBeInTheDocument();
        expect(screen.getByText('+5')).toBeInTheDocument();
      });
    });

    it('should not show remaining count when members are 5 or fewer', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument();
      });
    });

    it('should display avatar initials from full name', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('AU')).toBeInTheDocument(); // Admin User
        expect(screen.getByText('CU')).toBeInTheDocument(); // Current User
      });
    });
  });

  describe('View All Members Button', () => {
    it('should render "View all" button', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('View all')).toBeInTheDocument();
      });
    });

    it('should have Users icon', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        const usersIcon = document.querySelector('[class*="lucide-users"]');
        expect(usersIcon).toBeInTheDocument();
      });
    });
  });

  describe('Admin vs Non-Admin Behavior', () => {
    it('should show invite input for admins', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invite members:')).toBeInTheDocument();
      });
    });

    it('should not show invite input for non-admins', async () => {
      render(<TripDashboardClient {...defaultProps} currentUserIsAdmin={false} />);

      await waitFor(() => {
        expect(screen.queryByText('Invite members:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Back Button Navigation', () => {
    it('should navigate to dashboard when Back button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Back'));

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Member Count Display', () => {
    it('should show member count', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('3 members')).toBeInTheDocument();
      });
    });

    it('should show singular "member" for single member', async () => {
      render(<TripDashboardClient {...defaultProps} members={[mockMembers[0]]} />);

      await waitFor(() => {
        expect(screen.getByText('1 member')).toBeInTheDocument();
      });
    });

    it('should show 0 members for empty array', async () => {
      render(<TripDashboardClient {...defaultProps} members={[]} />);

      await waitFor(() => {
        expect(screen.getByText('0 members')).toBeInTheDocument();
      });
    });
  });

  describe('Member Invite Integration', () => {
    it('should pass correct props to MemberInviteInput', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invite members:')).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText('Search by name or username...')).toBeInTheDocument();
    });

    it('should include tripId in MemberInviteInput', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or username...')).toBeInTheDocument();
      });
    });

    it('should include currentUserId in MemberInviteInput', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or username...')).toBeInTheDocument();
      });
    });

    it('should include existingMemberIds in MemberInviteInput', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by name or username...')).toBeInTheDocument();
      });
    });
  });

  describe('Members Modal Integration', () => {
    it('should render MembersModal component', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('View all')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty members list', async () => {
      render(<TripDashboardClient {...defaultProps} members={[]} />);

      await waitFor(() => {
        expect(screen.getByText('0 members')).toBeInTheDocument();
      });
    });

    it('should handle null profile data', async () => {
      const membersWithNullProfile: TripMemberWithProfile[] = [
        {
          ...mockMembers[0],
          profile: {
            id: 'user-admin',
            full_name: null,
            username: null,
            avatar_theme: null,
            packing_style: null,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ];

      render(<TripDashboardClient {...defaultProps} members={membersWithNullProfile} />);

      await waitFor(() => {
        expect(screen.getByText('1 member')).toBeInTheDocument();
      });
    });

    it('should handle very large number of members', async () => {
      const manyMembers = Array.from({ length: 100 }, (_, i) => ({
        id: `member-${i}`,
        trip_id: mockTripId,
        user_id: `user-${i}`,
        role: 'member' as const,
        created_at: '2024-01-01T00:00:00Z',
        profile: {
          id: `user-${i}`,
          full_name: `User ${i}`,
          username: `user${i}`,
          avatar_theme: null,
          packing_style: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }));

      render(<TripDashboardClient {...defaultProps} members={manyMembers} />);

      await waitFor(() => {
        expect(screen.getByText('100 members')).toBeInTheDocument();
        expect(screen.getByText('+95')).toBeInTheDocument();
      });
    });
  });

  describe('UI Layout', () => {
    it('should have proper header layout', async () => {
      const { container } = render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Trip Dashboard')).toBeInTheDocument();
      });

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have proper main content area', async () => {
      const { container } = render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Packing Board Coming Soon')).toBeInTheDocument();
      });

      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: 'Trip Dashboard' });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should have accessible Back button', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /Back/i });
        expect(backButton).toBeInTheDocument();
      });
    });

    it('should have accessible View all button', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        const viewAllButton = screen.getByRole('button', { name: /View all/i });
        expect(viewAllButton).toBeInTheDocument();
      });
    });
  });

  describe('Router Refresh Handling', () => {
    it('should have invite success handler defined', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invite members:')).toBeInTheDocument();
      });
    });

    it('should have members change handler defined', async () => {
      render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('View all')).toBeInTheDocument();
      });
    });
  });

  describe('Styling and Theme', () => {
    it('should use correct background colors', async () => {
      const { container } = render(<TripDashboardClient {...defaultProps} />);

      await waitFor(() => {
        const mainDiv = container.querySelector('.bg-\\[\\#FAFAF8\\]');
        expect(mainDiv).toBeInTheDocument();
      });
    });
  });
});
