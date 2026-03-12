import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Navbar from '@/components/layout/navbar';
import { Profile } from '@/types/profile.types';

// Mock dependencies
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockSignOut = jest.fn();
jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

describe('Navbar Integration', () => {
  const mockProfile: Profile = {
    id: 'user-123',
    username: 'traveler_alex',
    full_name: 'Alex Johnson',
    avatar_theme: '#4A3728',
    packing_style: 'Minimalist',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with profile data after mounting', async () => {
    render(<Navbar profile={mockProfile} />);

    // Initially matches loading state if not mounted?
    // Actually in JSDOM, useEffect runs immediately.

    expect(screen.getByText('Pack')).toBeInTheDocument();
    expect(screen.getByText('Right')).toBeInTheDocument();
    expect(screen.getByText('traveler_alex')).toBeInTheDocument();
    expect(screen.getByText('AJ')).toBeInTheDocument();
  });

  it('handles sign out flow', async () => {
    render(<Navbar profile={mockProfile} />);

    // Open dropdown
    const trigger = screen.getByLabelText('User menu');
    fireEvent.click(trigger);

    // Click Sign Out
    const signOutBtn = screen.getByText('Sign Out');
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('shows profile info in dropdown', () => {
    render(<Navbar profile={mockProfile} />);

    const trigger = screen.getByLabelText('User menu');
    fireEvent.click(trigger);

    expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    expect(screen.getByText('@traveler_alex')).toBeInTheDocument();
  });
});
