import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecuritySettingsForm from '@/components/features/profile/security-settings-form';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockSignInWithPassword = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      updateUser: mockUpdateUser,
    },
  }),
}));

describe('SecuritySettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles email/password user password change flow', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockUpdateUser
      .mockResolvedValueOnce({ error: { message: 'Err' } })
      .mockResolvedValueOnce({ error: null });

    render(<SecuritySettingsForm email="test@test.com" providers={['email']} />);

    await user.type(screen.getByLabelText(/^Current Password$/i), 'oldPass123!');
    await user.type(screen.getByLabelText(/^New Password$/i), 'NewPass123!');
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'NewPass123!');

    // Visibility toggles for branch coverage
    fireEvent.click(screen.getByLabelText(/Toggle current password visibility/i));
    fireEvent.click(screen.getByLabelText(/Toggle new password visibility/i));
    fireEvent.click(screen.getByLabelText(/Toggle confirm password visibility/i));

    // Fail path
    await user.click(screen.getByRole('button', { name: /Change Password/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    // Success path
    await user.click(screen.getByRole('button', { name: /Change Password/i }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Password changed successfully!')
    );
  });

  it('handles incorrect current password', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: 'Wrong' } });

    render(<SecuritySettingsForm email="test@test.com" providers={['email']} />);

    await user.type(screen.getByLabelText(/^Current Password$/i), 'wrong');
    await user.type(screen.getByLabelText(/^New Password$/i), 'NewPass123!');
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: /Change Password/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Incorrect current password.');
    });
  });

  it('handles OAuth user Set Password flow', async () => {
    const user = userEvent.setup();
    mockUpdateUser
      .mockResolvedValueOnce({ error: { message: 'Fail' } })
      .mockResolvedValueOnce({ error: null });

    render(<SecuritySettingsForm email="oauth@google.com" providers={['google']} />);

    expect(screen.getByRole('button', { name: /Set Password/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^New Password$/i), 'OAuthPass123!');
    await user.type(screen.getByLabelText(/^Confirm Password$/i), 'OAuthPass123!');

    // Visibility toggles in SetPasswordForm
    fireEvent.click(screen.getAllByLabelText(/Toggle new password visibility/i)[0]);
    fireEvent.click(screen.getByLabelText(/Toggle confirm password visibility/i));

    // Fail
    await user.click(screen.getByRole('button', { name: /Set Password/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    // Success
    await user.click(screen.getByRole('button', { name: /Set Password/i }));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('handles validation and crash branches', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockImplementation(() => {
      throw new Error('Crash');
    });

    render(<SecuritySettingsForm email="test@test.com" providers={['email']} />);

    // Mismatch validation
    await user.type(screen.getByLabelText(/^Current Password$/i), 'abc');
    await user.type(screen.getByLabelText(/^New Password$/i), 'NewPass123!');
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'Diff');
    await user.click(screen.getByRole('button', { name: /Change Password/i }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();

    // Unexpected error branch
    await user.clear(screen.getByLabelText(/^Confirm New Password$/i));
    await user.type(screen.getByLabelText(/^Confirm New Password$/i), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: /Change Password/i }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred. Please try again.')
    );
  });
});
