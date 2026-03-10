import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { toast } from 'sonner';

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

const mockSignInWithPassword = jest.fn();
const mockSignInWithOAuth = jest.fn();

// Mock the Supabase client
jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitBtn = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitBtn);

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('handles Supabase sign-in errors gracefully', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'WrongPass123!');

    const submitBtn = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'WrongPass123!',
      });
    });
  });

  it('submits correctly with valid credentials', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValueOnce({ data: { user: { id: '123' } }, error: null });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'ValidPass123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPass123!',
      });
    });
  });

  it('handles Google OAuth click', async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValueOnce({ data: {}, error: null });

    render(<LoginForm />);

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i });
    await user.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.any(Object),
      });
    });
  });
  it('handles email not confirmed error', async () => {
    const user = userEvent.setup();
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'email not confirmed' }, // Ensure lowercase to match component check
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/Email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'ValidPass123!');

    const submitBtn = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Please verify your email address before logging in.'
      );
    });
  });

  it('handles Google OAuth error', async () => {
    const user = userEvent.setup();
    mockSignInWithOAuth.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Google error'),
    });

    render(<LoginForm />);

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i });
    await user.click(googleBtn);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalled();
    });
  });

  it('toggles password visibility correctly', async () => {
    const user = userEvent.setup();
    const { container } = render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/Password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = container.querySelector('button[type="button"]');

    await user.click(toggleButton as Element);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleButton as Element);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
