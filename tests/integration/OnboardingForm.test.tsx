import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingForm from '@/components/features/profile/onboarding-form';
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
const mockFrom = jest.fn(() => ({
  update: mockUpdate,
}));
const mockRpc = jest.fn();

jest.mock('../../src/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

describe('OnboardingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      update: mockUpdate,
    });
    // DEFAULT MOCK: Stable and available
    mockRpc.mockResolvedValue({ data: true, error: null });
  });

  it('covers all branch conditions in OnboardingForm submission', async () => {
    const user = userEvent.setup();
    const mockEq = jest.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });

    // Provide valid full_name to satisfy Zod validation
    render(<OnboardingForm userId="u" existingFullName="Test User" />);

    // Interaction with correct colors from AVATAR_COLORS
    fireEvent.click(screen.getByTitle('Forest Green'));
    fireEvent.click(screen.getByRole('button', { name: /Over Packer/i }));

    await user.type(screen.getByLabelText(/Handle/i), 'valid_handle');
    await user.click(screen.getByRole('button', { name: /Complete Setup/i }));

    const confirmBtn = await screen.findByRole('button', { name: /Confirm Handle/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles cancel in confirm dialog', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm userId="u" existingFullName="Test User" />);

    await user.type(screen.getByLabelText(/Handle/i), 'cancel_me');
    await user.click(screen.getByRole('button', { name: /Complete Setup/i }));

    const cancelBtn = await screen.findByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Are you sure/i })).not.toBeInTheDocument();
    });
  });

  it('handles username taken state', async () => {
    const user = userEvent.setup();
    // Constant failure for availability check (simulating taken)
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<OnboardingForm userId="u" existingFullName="Test User" />);
    const input = screen.getByLabelText(/Handle/i);

    await user.type(input, 'taken');

    await waitFor(
      () => {
        expect(screen.getByText('Taken')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('handles username already taken error (23505)', async () => {
    const user = userEvent.setup();
    const mockEq = jest.fn().mockResolvedValue({ error: { code: '23505' } });
    mockUpdate.mockReturnValue({ eq: mockEq });

    render(<OnboardingForm userId="u" existingFullName="Test User" />);
    await user.type(screen.getByLabelText(/Handle/i), 'taken_db');
    await user.click(screen.getByRole('button', { name: /Complete Setup/i }));
    const confirmBtn = await screen.findByRole('button', { name: /Confirm Handle/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'This handle is already taken. Please choose another.'
      );
    });
  });

  it('handles username check error and catch blocks', async () => {
    const user = userEvent.setup();
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC Error' } });

    render(<OnboardingForm userId="u" existingFullName="Test User" />);
    const input = screen.getByLabelText(/Handle/i);

    await user.type(input, 'error');
    await waitFor(() => expect(mockRpc).toHaveBeenCalled());
    expect(screen.queryByTestId('user-check-icon')).not.toBeInTheDocument();

    // Trigger catch block in submission
    const mockEq = jest.fn().mockRejectedValue(new Error('Crash'));
    mockUpdate.mockReturnValue({ eq: mockEq });

    await user.clear(input);
    await user.type(input, 'crash_user');
    await user.click(screen.getByRole('button', { name: /Complete Setup/i }));
    const confirmBtn = await screen.findByRole('button', { name: /Confirm Handle/i });
    await user.click(confirmBtn);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred. Please try again.')
    );
  });

  it('covers initials generation variations', () => {
    const { unmount } = render(<OnboardingForm userId="u" existingFullName="First Last" />);
    expect(screen.getByText('FL')).toBeInTheDocument();
    unmount();

    render(<OnboardingForm userId="u" existingFullName="Single" />);
    expect(screen.getByText('S')).toBeInTheDocument();
    unmount();

    render(<OnboardingForm userId="u" existingFullName="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
