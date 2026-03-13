/**
 * ISSUE-#45: Integration tests for MemberInviteInput component
 *
 * Comprehensive tests covering rendering, interactions, permissions,
 * error handling, edge cases, debounce behavior, and accessibility.
 *
 * Target Coverage: 95%+
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MemberInviteInput } from '@/components/features/trips/member-invite-input';
import * as actions from '../../src/app/actions/trip-members';

// Mock dependencies to prevent actual API calls
jest.mock('../../src/app/actions/trip-members', () => ({
  searchUsersAction: jest.fn(),
  inviteTripMemberAction: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { toast } from 'sonner';

// Mock AnimatePresence to bypass animations in tests
// This is needed because mode="wait" blocks content rendering with fake timers
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => {
    // If children is an array, return the first one (current child)
    // Otherwise return children as-is
    if (Array.isArray(children)) {
      return children[0];
    }
    return children;
  },
}));

// Mock ResizeObserver for Framer Motion
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

describe('MemberInviteInput Integration', () => {
  const defaultProps = {
    tripId: 'trip-123',
    currentUserId: 'user-current',
    existingMemberIds: new Set(['user-1', 'user-2']),
    onInviteSuccess: jest.fn(),
  };

  // Mock user data for search results
  const mockSearchResults = [
    {
      id: 'user-3',
      full_name: 'Alice Johnson',
      username: 'alicej',
      avatar_theme: null,
      packing_style: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-4',
      full_name: 'Bob Smith',
      username: 'bobsmith',
      avatar_theme: null,
      packing_style: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-current',
      full_name: 'Current User',
      username: 'currentuser',
      avatar_theme: null,
      packing_style: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-1',
      full_name: 'Existing Member',
      username: 'existingmember',
      avatar_theme: null,
      packing_style: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render search input with correct placeholder', () => {
      render(<MemberInviteInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search by name or username...')).toBeInTheDocument();
    });

    it('should display search icon', () => {
      render(<MemberInviteInput {...defaultProps} />);

      const searchIcon = document.querySelector('[class*="lucide-search"]') as HTMLElement;
      expect(searchIcon).toBeInTheDocument();
    });

    it('should have correct input attributes', () => {
      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should not show loading spinner initially', () => {
      render(<MemberInviteInput {...defaultProps} />);

      const loadingSpinner = document.querySelector('[class*="animate-spin"]');
      expect(loadingSpinner).not.toBeInTheDocument();
    });
  });

  describe('Input Interaction', () => {
    it('should allow typing in the search input', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'alice');

      expect(input).toHaveValue('alice');
    });

    it('should clear input when popover closes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'alice');

      // Click outside to close popover
      await user.click(document.body);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Minimum Characters Validation', () => {
    it('should show minimum characters message for 1-2 characters', async () => {
      const user = userEvent.setup({ delay: null });
      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');

      // Type 1 character
      await user.clear(input);
      await user.type(input, 'a');
      await waitFor(() => {
        expect(screen.getByText('Enter at least 3 characters to search')).toBeInTheDocument();
      });

      // Type 2 characters
      await user.clear(input);
      await user.type(input, 'ab');
      await waitFor(() => {
        expect(screen.getByText('Enter at least 3 characters to search')).toBeInTheDocument();
      });
    });

    it('should trigger search at exactly 3 characters', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: mockSearchResults.slice(0, 1),
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');

      // Fast-forward debounce timer
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(actions.searchUsersAction).toHaveBeenCalledWith('ali');
      });
    });
  });

  describe('Debounce Behavior', () => {
    it('should reset debounce timer on rapid input changes', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');

      await user.type(input, 'abc');
      jest.advanceTimersByTime(100);

      await user.clear(input);
      await user.type(input, 'xyz');
      jest.advanceTimersByTime(100);

      // Original timer should be cancelled
      expect(actions.searchUsersAction).not.toHaveBeenCalled();

      // Complete debounce for new input
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(actions.searchUsersAction).toHaveBeenCalledTimes(1);
        expect(actions.searchUsersAction).toHaveBeenCalledWith('xyz');
      });
    });
  });

  describe('Search Results Display', () => {
    it('should display search results after successful search', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: mockSearchResults.slice(0, 2),
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      });
    });

    it('should display username with @ prefix', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('@alicej')).toBeInTheDocument();
      });
    });

    it('should show "No users found" message for empty results', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'nonexistent');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
      });
    });

    it('should limit results to 5 users', async () => {
      const user = userEvent.setup({ delay: null });
      const sixResults = Array.from({ length: 6 }, (_, i) => ({
        id: `user-${i}`,
        full_name: `User ${i}`,
        username: `user${i}`,
        avatar_theme: null,
        packing_style: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }));

      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: sixResults,
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'user');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getAllByText(/User \d/)).toHaveLength(5);
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner on individual user during invite', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      let resolveInvite: (value: { success: boolean; data?: { fullName: string } }) => void;
      const invitePromise = new Promise<{ success: boolean; data?: { fullName: string } }>(
        (resolve) => {
          resolveInvite = resolve;
        }
      );

      (actions.inviteTripMemberAction as jest.Mock).mockReturnValue(invitePromise);

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Click to invite
      const userButton = screen.getByText('Alice Johnson').closest('button');
      await user.click(userButton!);

      // Check for loading state on the user row
      await waitFor(() => {
        const loadingSpinners = document.querySelectorAll('[class*="animate-spin"]');
        expect(loadingSpinners.length).toBeGreaterThan(0);
      });

      // Resolve the invite
      resolveInvite!({ success: true, data: { fullName: 'Alice Johnson' } });

      await waitFor(() => {
        const loadingSpinners = document.querySelectorAll('[class*="animate-spin"]');
        expect(loadingSpinners.length).toBe(0);
      });
    });
  });

  describe('"You" Badge for Current User', () => {
    it('should show "You" badge for current user', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[2]], // current user
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'current');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('You')).toBeInTheDocument();
      });
    });

    it('should prevent clicking on current user', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[2]], // current user
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'current');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        const userButton = screen.getByText('Current User').closest('button');
        expect(userButton).toBeDisabled();
      });

      // Try clicking anyway
      const userButton = screen.getByText('Current User').closest('button');
      await user.click(userButton!);

      // Should not call invite action
      expect(actions.inviteTripMemberAction).not.toHaveBeenCalled();
    });

    it('should show UserPlus icon instead of You badge for non-current users', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]], // Alice, not current user
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.queryByText('You')).not.toBeInTheDocument();
        const addIcon = document.querySelector('[class*="lucide-user-plus"]');
        expect(addIcon).toBeInTheDocument();
      });
    });
  });

  describe('"Already member" Badge for Existing Members', () => {
    it('should show "Already member" badge for existing trip members', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[3]], // user-1 is in existingMemberIds
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'exist');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Already member')).toBeInTheDocument();
      });
    });

    it('should prevent clicking on existing members', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[3]], // existing member
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'exist');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        const userButton = screen.getByText('Existing Member').closest('button');
        expect(userButton).toBeDisabled();
      });

      // Try clicking anyway
      const userButton = screen.getByText('Existing Member').closest('button');
      await user.click(userButton!);

      // Should not call invite action
      expect(actions.inviteTripMemberAction).not.toHaveBeenCalled();
    });
  });

  describe('Invite Flow - Success', () => {
    it('should successfully invite a user and show success toast', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]], // Alice
      });

      (actions.inviteTripMemberAction as jest.Mock).mockResolvedValue({
        success: true,
        data: { fullName: 'Alice Johnson' },
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Click to invite
      const userButton = screen.getByText('Alice Johnson').closest('button');
      await user.click(userButton!);

      await waitFor(() => {
        expect(actions.inviteTripMemberAction).toHaveBeenCalledWith(
          'trip-123',
          'user-3',
          'Alice Johnson'
        );
      });

      expect(toast.success).toHaveBeenCalledWith('Alice Johnson joined!');
      expect(defaultProps.onInviteSuccess).toHaveBeenCalled();
    });

    it('should close popover and clear search after successful invite', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      (actions.inviteTripMemberAction as jest.Mock).mockResolvedValue({
        success: true,
        data: { fullName: 'Alice Johnson' },
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const userButton = screen.getByText('Alice Johnson').closest('button');
      await user.click(userButton!);

      await waitFor(() => {
        // Results should be cleared
        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
        // Input should be cleared
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Invite Flow - Errors', () => {
    it('should show error toast when invite fails', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      (actions.inviteTripMemberAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Only trip admins can invite new members.',
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const userButton = screen.getByText('Alice Johnson').closest('button');
      await user.click(userButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Only trip admins can invite new members.');
      });

      expect(defaultProps.onInviteSuccess).not.toHaveBeenCalled();
    });

    it('should show generic error toast when no error message provided', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      (actions.inviteTripMemberAction as jest.Mock).mockResolvedValue({
        success: false,
        error: undefined,
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const userButton = screen.getByText('Alice Johnson').closest('button');
      await user.click(userButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to invite member. Please try again.');
      });
    });

    it('should show error toast when network error occurs', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      (actions.inviteTripMemberAction as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const userButton = screen.getByText('Alice Johnson').closest('button');
      await user.click(userButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to invite member. Please try again.');
      });
    });

    it('should show error and keep popover open on failure', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      (actions.inviteTripMemberAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const userButton = screen.getByText('Alice Johnson').closest('button');
      await user.click(userButton!);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Results should still be visible
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });
  });

  describe('Search Error Handling', () => {
    it('should handle search action failure gracefully', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Search service unavailable',
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      // Should not show results, but also not crash
      await waitFor(() => {
        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
      });
    });

    it('should handle search action rejection', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
      });
    });

    it('should return empty results when search returns null data', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: null,
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases - Input Validation', () => {
    it('should handle whitespace-only input', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, '   ');
      jest.advanceTimersByTime(300);

      // Should not search with whitespace
      expect(actions.searchUsersAction).not.toHaveBeenCalled();

      // Should show minimum characters message
      await waitFor(() => {
        expect(screen.getByText('Enter at least 3 characters to search')).toBeInTheDocument();
      });
    });

    it('should trim whitespace from search query', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, '  alice  ');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(actions.searchUsersAction).toHaveBeenCalledWith('alice');
      });
    });

    it('should handle special characters in search', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, "o'brien-müller");
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(actions.searchUsersAction).toHaveBeenCalledWith("o'brien-müller");
      });
    });

    it('should handle very long search queries', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      const longQuery = 'a'.repeat(200);
      await user.type(input, longQuery);
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(actions.searchUsersAction).toHaveBeenCalledWith(longQuery);
      });
    });

    it('should handle exact match search', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'alicej');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases - User Data', () => {
    it('should handle user with null full_name', async () => {
      const user = userEvent.setup({ delay: null });
      const userWithNullName = {
        ...mockSearchResults[0],
        full_name: null,
      };

      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [userWithNullName],
      });

      (actions.inviteTripMemberAction as jest.Mock).mockResolvedValue({
        success: true,
        data: { fullName: 'alicej' },
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Unknown')).toBeInTheDocument();
        expect(screen.getByText('@alicej')).toBeInTheDocument();
      });

      // Click to invite - should use username as fallback
      const userButton = screen.getByText('Unknown').closest('button');
      await user.click(userButton!);

      await waitFor(() => {
        expect(actions.inviteTripMemberAction).toHaveBeenCalledWith('trip-123', 'user-3', 'alicej');
      });
    });

    it('should handle user with null username', async () => {
      const user = userEvent.setup({ delay: null });
      const userWithNullUsername = {
        ...mockSearchResults[0],
        username: null,
      };

      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [userWithNullUsername],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('@no-username')).toBeInTheDocument();
      });
    });

    it('should display avatar with initials using full_name', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        // Alice Johnson -> AJ
        expect(screen.getByText('AJ')).toBeInTheDocument();
      });
    });

    it('should display avatar with initials using username when full_name is null', async () => {
      const user = userEvent.setup({ delay: null });
      const userWithNullName = {
        ...mockSearchResults[0],
        full_name: null,
      };

      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [userWithNullName],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        // alicej -> A
        const avatarFallback = screen.getByText('A');
        expect(avatarFallback).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');

      // Focus input
      input.focus();
      expect(input).toHaveFocus();

      // Type to open results
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Should be able to tab through results
      const userButton = screen.getByText('Alice Johnson').closest('button');
      expect(userButton).not.toHaveAttribute('tabIndex', '-1');
    });

    it('should have appropriate ARIA attributes', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        const userButton = screen.getByText('Alice Johnson').closest('button');
        expect(userButton).toHaveAttribute('type', 'button');
      });
    });

    it('should disable unselectable users for accessibility', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[2]], // current user
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'current');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        const userButton = screen.getByText('Current User').closest('button');
        expect(userButton).toBeDisabled();
      });
    });
  });

  describe('Props Variations', () => {
    it('should render with custom tripId and userId', () => {
      const customProps = {
        ...defaultProps,
        tripId: 'custom-trip-456',
        currentUserId: 'custom-user-789',
      };

      render(<MemberInviteInput {...customProps} />);

      expect(screen.getByPlaceholderText('Search by name or username...')).toBeInTheDocument();
    });

    it('should render with empty existing members set', () => {
      const customProps = {
        ...defaultProps,
        existingMemberIds: new Set(),
      };

      render(<MemberInviteInput {...customProps} />);

      expect(screen.getByPlaceholderText('Search by name or username...')).toBeInTheDocument();
    });

    it('should not show "Already member" badge when existingMemberIds is empty', async () => {
      const user = userEvent.setup({ delay: null });
      const customProps = {
        ...defaultProps,
        existingMemberIds: new Set(),
      };

      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[3]], // Would be existing, but set is empty
      });

      render(<MemberInviteInput {...customProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'exist');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.queryByText('Already member')).not.toBeInTheDocument();
      });
    });

    it('should work without onInviteSuccess callback', async () => {
      const user = userEvent.setup({ delay: null });
      const propsWithoutCallback = {
        ...defaultProps,
        onInviteSuccess: undefined,
      };

      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      (actions.inviteTripMemberAction as jest.Mock).mockResolvedValue({
        success: true,
        data: { fullName: 'Alice Johnson' },
      });

      render(<MemberInviteInput {...propsWithoutCallback} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const userButton = screen.getByText('Alice Johnson').closest('button');
      await user.click(userButton!);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
      // Should not throw error without callback
    });
  });

  describe('Popover Interaction', () => {
    it('should open popover on input focus when typing', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });
    });

    it('should reset search when popover closes', async () => {
      const user = userEvent.setup({ delay: null });
      (actions.searchUsersAction as jest.Mock).mockResolvedValue({
        success: true,
        data: [mockSearchResults[0]],
      });

      render(<MemberInviteInput {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search by name or username...');
      await user.type(input, 'ali');
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Press Escape to close
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(input).toHaveValue('');
        expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
      });
    });
  });
});
