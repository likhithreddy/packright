import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockResetPasswordForEmail = jest.fn();

jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
}));

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
  });

  it('shows validation errors for empty email', async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    const submitBtn = screen.getByRole('button', { name: 'Send Reset Link' });
    await user.click(submitBtn);

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('handles Supabase errors correctly', async () => {
    const user = userEvent.setup();
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'Rate limit exceeded' } });

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    const submitBtn = screen.getByRole('button', { name: 'Send Reset Link' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(Object)
      );
    });
  });

  it('submits correctly with valid email', async () => {
    const user = userEvent.setup();
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') })
      );
    });
  });
});
