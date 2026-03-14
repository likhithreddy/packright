import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TripDashboardClient } from '../../src/components/features/trips/TripDashboardClient';
import React from 'react';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

import { useRouter, useParams } from 'next/navigation';

// Create tracked mock functions
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockPrefetch = jest.fn();

// Mock sub-components to isolate TripDashboardClient using RELATIVE PATHS
jest.mock('../../src/components/features/packing-board', () => ({
  PackingBoard: () => <div data-testid="packing-board">Packing Board</div>,
}));

jest.mock('../../src/components/features/trips/member-invite-input', () => ({
  MemberInviteInput: () => <div data-testid="member-invite-input">MemberInviteInput</div>,
}));

jest.mock('../../src/components/features/trips/members-modal', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MembersModal: ({ open }: any) =>
    open ? <div data-testid="members-modal">Members Modal</div> : null,
}));

// Mock ResizeObserver and IntersectionObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = IntersectionObserverMock as any;

describe('TripDashboardClient Integration', () => {
  const mockTripId = 'trip-123';
  const mockCurrentUserId = 'user-1';
  const mockMembers: any[] = [
    {
      id: 'member-1',
      trip_id: mockTripId,
      user_id: 'user-1',
      role: 'admin',
      profile: { full_name: 'Admin User', avatar_url: null },
    },
    {
      id: 'member-2',
      trip_id: mockTripId,
      user_id: 'user-2',
      role: 'member',
      profile: { full_name: 'Member One', avatar_url: 'http://example.com/1.jpg' },
    },
    {
      id: 'member-3',
      trip_id: mockTripId,
      user_id: 'user-3',
      role: 'member',
      profile: { full_name: 'Member Two', avatar_url: null },
    },
  ];

  const mockTrip: any = {
    id: mockTripId,
    title: 'Summer Camping',
    destination: 'Yosemite',
    date_start: '2024-06-01',
    date_end: '2024-06-07',
    created_by: 'user-admin',
    is_archived: false,
    created_at: '2024-01-01T00:00:00Z',
  };

  const defaultProps = {
    tripId: mockTripId,
    currentUserId: mockCurrentUserId,
    members: mockMembers,
    currentUserIsAdmin: true,
    trip: mockTrip,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
      prefetch: mockPrefetch,
    });
    (useParams as jest.Mock).mockReturnValue({ id: mockTripId });
  });

  describe('Rendering', () => {
    it('should render trip dashboard page', async () => {
      render(<TripDashboardClient {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Summer Camping')).toBeInTheDocument();
      });
    });

    it('should show trip destination and dates', async () => {
      render(<TripDashboardClient {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText('Yosemite')).toBeInTheDocument();
        // Use a more relaxed regex to handle potential timezone shifts (e.g. Jun 1 vs May 31)
        expect(screen.getByText(/[A-Z][a-z]{2} \d+ - [A-Z][a-z]{2} \d+/)).toBeInTheDocument();
      });
    });

    it('should show stats', async () => {
      render(<TripDashboardClient {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByText(/ITEMS/)).toBeInTheDocument();
      });
    });
  });

  describe('Back Button Navigation', () => {
    it('should navigate to dashboard when Back button is clicked', async () => {
      const user = userEvent.setup();
      render(<TripDashboardClient {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const backButton = buttons[0];

      await user.click(backButton);
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Members Interaction', () => {
    it('should open members modal when View all is clicked', async () => {
      const user = userEvent.setup();
      render(<TripDashboardClient {...defaultProps} />);

      const viewAllButton = screen.getByText(/View all/i);
      await user.click(viewAllButton);

      expect(screen.getByTestId('members-modal')).toBeInTheDocument();
    });
  });

  describe('Packing Board Integration', () => {
    it('should render PackingBoard component', async () => {
      render(<TripDashboardClient {...defaultProps} />);
      expect(screen.getByTestId('packing-board')).toBeInTheDocument();
    });
  });
});
