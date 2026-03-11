import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditProfileModal from '@/components/features/profile/edit-profile-modal';
import type { Profile } from '@/types/profile.types';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn(() => ({
  update: mockUpdate,
}));

jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

const mockProfile: Profile = {
  id: 'user-123',
  full_name: 'Test User',
  username: 'testuser',
  avatar_theme: '#B45309',
  packing_style: 'Minimalist',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('EditProfileModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockResolvedValue({ error: null });
  });

  it('renders and handles successful update', async () => {
    const user = userEvent.setup();
    const onProfileUpdate = jest.fn();

    render(
      <EditProfileModal
        profile={mockProfile}
        open={true}
        onOpenChange={() => {}}
        onProfileUpdate={onProfileUpdate}
      />
    );

    // Wait for modal and find label
    const nameInput = await screen.findByLabelText(/Full Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    // Selection branches - Correct regex for "Over Packer"
    fireEvent.click(screen.getByTitle('Subtle Green'));
    fireEvent.click(screen.getByRole('button', { name: /Over Packer/i }));

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockEq).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Profile updated successfully!');
      expect(onProfileUpdate).toHaveBeenCalled();
    });
  });

  it('handles database error and unexpected crashes', async () => {
    const user = userEvent.setup();
    mockEq.mockResolvedValueOnce({ error: { message: 'DB Error' } });

    render(
      <EditProfileModal
        profile={mockProfile}
        open={true}
        onOpenChange={() => {}}
        onProfileUpdate={() => {}}
      />
    );

    // DB Error path
    const saveBtn = await screen.findByRole('button', { name: /Save Changes/i });
    await user.click(saveBtn);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update profile. Please try again.');
    });

    // Crash path
    mockUpdate.mockImplementationOnce(() => {
      throw new Error('Crash');
    });
    await user.click(saveBtn);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred. Please try again.');
    });
  });

  it('handles cancel button click', async () => {
    const onOpenChange = jest.fn();
    render(
      <EditProfileModal
        profile={mockProfile}
        open={true}
        onOpenChange={onOpenChange}
        onProfileUpdate={() => {}}
      />
    );

    // Use findByRole to wait for portal content
    const cancelBtn = await screen.findByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
