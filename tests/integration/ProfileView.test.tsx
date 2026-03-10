import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileView from '@/components/features/profile/profile-view';
import type { Profile } from '@/types/profile.types';

// Mock Supabase to avoid environment variable errors
jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u' } } }),
    },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockProfile: Profile = {
  id: 'user-123',
  full_name: 'Test Name',
  username: 'testuser',
  avatar_theme: '#B45309',
  packing_style: 'Minimalist',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ProfileView', () => {
  it('renders correctly and handles name initials and packing style branches', () => {
    const { rerender } = render(
      <ProfileView profile={mockProfile} email="test@test.com" providers={['email']} />
    );
    expect(screen.getByText('TN')).toBeInTheDocument();
    expect(screen.getByText('Minimalist')).toBeInTheDocument();

    // Edge cases for initials
    rerender(
      <ProfileView
        profile={{ ...mockProfile, full_name: 'Single' }}
        email="t@e.com"
        providers={['email']}
      />
    );
    expect(screen.getByText('S')).toBeInTheDocument();

    rerender(
      <ProfileView
        profile={{ ...mockProfile, full_name: '' }}
        email="t@e.com"
        providers={['email']}
      />
    );
    expect(screen.getByText('?')).toBeInTheDocument();

    // Missing packing style branch
    rerender(
      <ProfileView
        profile={{ ...mockProfile, packing_style: '' }}
        email="t@e.com"
        providers={['email']}
      />
    );
    expect(screen.queryByText('Minimalist')).not.toBeInTheDocument();
  });

  it('triggers the edit modal and updates the view on save', async () => {
    const user = userEvent.setup();
    render(<ProfileView profile={mockProfile} email="test@test.com" providers={['email']} />);

    const editBtn = screen.getByRole('button', { name: /Edit Profile/i });
    await user.click(editBtn);

    // Verify modal content using 'within' and portal-safe finders
    const modal = await screen.findByRole('dialog');
    const modalWithin = within(modal);

    expect(modalWithin.getByText('Edit Profile')).toBeInTheDocument();

    const nameInput = modalWithin.getByLabelText(/Full Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Identity');

    const saveBtn = modalWithin.getByRole('button', { name: /Save Changes/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('NI')).toBeInTheDocument();
      expect(screen.getByText('New Identity')).toBeInTheDocument();
    });
  });
});
