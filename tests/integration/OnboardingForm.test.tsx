import { render, screen, waitFor } from '@testing-library/react';
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

const mockUpsert = jest.fn();
const mockFrom = jest.fn(() => ({
  upsert: mockUpsert,
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
    jest.spyOn(console, 'error').mockImplementation(() => { });
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });
    // DEFAULT MOCK: Stable and available
    mockRpc.mockResolvedValue({ data: true, error: null });
  });

  const navigateToStep3 = async (user: ReturnType<typeof userEvent.setup>) => {
    // Step 1 -> Step 2
    await user.type(screen.getByLabelText(/Full Name/i), 'Test User');
    await user.type(screen.getByLabelText(/Unique Handle/i), 'valid_handle');
    await waitFor(() => expect(screen.getByTestId('user-check-icon')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Handle confirmation dialog after Step 1
    const confirmBtn = await screen.findByRole('button', { name: /Yes, I'm sure/i });
    await user.click(confirmBtn);

    // Step 2 -> Step 3
    await waitFor(() => expect(screen.getByText(/Choose your vibe/i)).toBeInTheDocument(), { timeout: 3000 });
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Wait for Step 3 to be active
    await waitFor(() => expect(screen.getByText(/Packing Style/i)).toBeInTheDocument(), { timeout: 3000 });
  };

  it('covers full 3-step submission flow with upsert', async () => {
    const user = userEvent.setup();
    mockUpsert.mockResolvedValue({ error: null });

    render(<OnboardingForm userId="u" />);
    await navigateToStep3(user);

    // Step 3: Packing Style
    await user.click(screen.getByRole('button', { name: /Over Packer/i }));

    // Wait for the transition cooldown to complete
    const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Profile created successfully'));
    }, { timeout: 3000 });
  });

  it('handles back navigation', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm userId="u" existingFullName="Test User" />);

    await user.type(screen.getByLabelText(/Unique Handle/i), 'back_test');
    await waitFor(() => expect(screen.getByTestId('user-check-icon')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Handle confirmation dialog
    const confirmBtn = await screen.findByRole('button', { name: /Yes, I'm sure/i });
    await user.click(confirmBtn);

    await waitFor(() => expect(screen.getByText(/Choose your vibe/i)).toBeInTheDocument(), { timeout: 3000 });
    await user.click(screen.getByRole('button', { name: /Back/i }));

    await waitFor(() => expect(screen.getByText(/Tell us about yourself/i)).toBeInTheDocument());
  });

  it('handles username taken state in Step 1', async () => {
    const user = userEvent.setup();
    mockRpc.mockResolvedValue({ data: false, error: null });

    render(<OnboardingForm userId="u" existingFullName="Test User" />);
    const input = screen.getByLabelText(/Unique Handle/i);

    await user.type(input, 'taken');

    await waitFor(() => {
      expect(screen.getByText('Taken')).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeDisabled();
  });

  it('handles database conflict (23505) after confirm', async () => {
    const user = userEvent.setup();
    mockUpsert.mockResolvedValue({ error: { code: '23505' } });

    render(<OnboardingForm userId="u" existingFullName="Test User" />);
    await navigateToStep3(user);

    // Step 3: Packing Style (select one to enable button naturally if needed, though canSubmit handles the guard)
    await user.click(screen.getByRole('button', { name: /Over Packer/i }));

    // Wait for the transition cooldown to complete
    const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled(), { timeout: 2000 });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('This handle is already taken. Please choose another.');
      // Should redirect back to Step 1
      expect(screen.getByText(/Tell us about yourself/i)).toBeInTheDocument();
    });
  });

  it('handles unexpected submission error', async () => {
    const user = userEvent.setup();
    mockUpsert.mockRejectedValue(new Error('Crash'));

    render(<OnboardingForm userId="u" existingFullName="Test User" />);
    await navigateToStep3(user);

    await user.click(screen.getByRole('button', { name: /Over Packer/i })); // Selection is required for step 3 logic usually

    // Wait for the transition cooldown to complete
    const submitBtn = screen.getByRole('button', { name: /Complete Setup/i });
    await waitFor(() => expect(submitBtn).not.toBeDisabled(), { timeout: 2000 });
    await user.click(submitBtn);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Crash')
    );
  });

  it('covers initials generation variations and display in Step 2', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm userId="u" existingFullName="First Last" />);

    await user.type(screen.getByLabelText(/Unique Handle/i), 'fl_user');
    await waitFor(() => expect(screen.getByTestId('user-check-icon')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Handle confirmation dialog
    const confirmBtn = await screen.findByRole('button', { name: /Yes, I'm sure/i });
    await user.click(confirmBtn);

    // Check initials in Step 2 main preview
    await waitFor(() => expect(screen.getByText(/Choose your vibe/i)).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getAllByText('FL').length).toBeGreaterThan(1); // Main preview + color circles
  });
});
