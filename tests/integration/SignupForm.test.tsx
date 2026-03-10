import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupForm } from '@/components/features/auth/SignupForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockSignUp = jest.fn();
const mockOAuth = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));
const mockRpc = jest.fn();

jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithOAuth: mockOAuth,
    },
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

describe('SignupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all necessary fields', () => {
    render(<SignupForm />);

    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('shows validation errors on empty submission', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    await user.click(submitBtn);

    expect(await screen.findByText(/Username must be at least 3 characters/i)).toBeInTheDocument();
    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('shows validation error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/Username/i), 'johndoe123');
    await user.type(screen.getByLabelText(/Email/i), 'name@example.com');
    await user.type(screen.getByLabelText(/^Password/i), 'ValidPass123!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'DifferentPass123!');

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    await user.click(submitBtn);

    expect(await screen.findByText(/Passwords don't match/i)).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('submits successfully when data is valid and username is unique', async () => {
    const user = userEvent.setup();
    mockRpc.mockResolvedValueOnce({ data: true, error: null }); // Simulate unique username
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }); // Simulate no existing user from 'from' if it was used
    mockSignUp.mockResolvedValueOnce({ data: { user: { id: '1' } }, error: null });

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/Username/i), 'johndoe123');
    await user.type(screen.getByLabelText(/Email/i), 'name@example.com');
    await user.type(screen.getByLabelText(/^Password/i), 'ValidPass123!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'ValidPass123!');

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('check_username_available', {
        username_to_check: 'johndoe123',
      });
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'name@example.com',
        password: 'ValidPass123!',
        options: {
          data: {
            username: 'johndoe123',
          },
        },
      });
    });
  });

  it('throws an error if the username is already taken', async () => {
    const user = userEvent.setup();
    mockRpc.mockResolvedValueOnce({ data: false, error: null }); // Simulate user exists (not available)

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/Username/i), 'johndoe123');
    await user.type(screen.getByLabelText(/Email/i), 'name@example.com');
    await user.type(screen.getByLabelText(/^Password/i), 'ValidPass123!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'ValidPass123!');

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('check_username_available', {
        username_to_check: 'johndoe123',
      });
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('handles generic username query errors', async () => {
    const user = userEvent.setup();
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'OTHER_ERR' } }); // generic error

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/Username/i), 'johndoe123');
    await user.type(screen.getByLabelText(/Email/i), 'name@example.com');
    await user.type(screen.getByLabelText(/^Password/i), 'ValidPass123!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'ValidPass123!');

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('check_username_available', {
        username_to_check: 'johndoe123',
      });
    });

    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('handles generic auth sign up errors', async () => {
    const user = userEvent.setup();
    mockRpc.mockResolvedValueOnce({ data: true, error: null }); // username available
    mockSignUp.mockResolvedValueOnce({ data: null, error: { message: 'Some generic error' } }); // generic auth error

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/Username/i), 'johndoe123');
    await user.type(screen.getByLabelText(/Email/i), 'name@example.com');
    await user.type(screen.getByLabelText(/^Password/i), 'ValidPass123!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'ValidPass123!');

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });
  });

  it('handles Google OAuth click', async () => {
    const user = userEvent.setup();
    mockOAuth.mockResolvedValueOnce({ data: {}, error: null });

    render(<SignupForm />);

    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i });
    await user.click(googleBtn);

    await waitFor(() => {
      expect(mockOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.any(Object),
      });
    });
  });
});
