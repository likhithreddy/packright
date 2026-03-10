import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockUpdateUser = jest.fn();

jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      updateUser: mockUpdateUser,
    },
  }),
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
  });

  it('shows validation errors for short password', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/New Password/i), 'short');
    // We intentionally don't type confirmPassword to trigger mismatch/short errors
    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    await user.click(submitBtn);

    expect(await screen.findByText(/Password must be at least 8 characters/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('handles Supabase errors correctly', async () => {
    const user = userEvent.setup();
    mockUpdateUser.mockResolvedValueOnce({ error: { message: 'Weak password' } });

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/New Password/i), 'ValidPass123!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'ValidPass123!');
    const submitBtn = screen.getByRole('button', { name: 'Reset Password' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'ValidPass123!' });
    });
  });

  it('submits correctly with valid password', async () => {
    const user = userEvent.setup();
    mockUpdateUser.mockResolvedValueOnce({ error: null });

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/New Password/i), 'ValidPass123!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'ValidPass123!');
    await user.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'ValidPass123!' });
    });
  });
});
