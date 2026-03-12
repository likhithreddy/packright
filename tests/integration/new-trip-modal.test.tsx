import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewTripModal } from '@/components/features/trips/new-trip-modal';
import * as actions from '@/app/actions/trips';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../../src/app/actions/trips', () => ({
  createTripAction: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

import { toast } from 'sonner';

// Mock ResizeObserver for Framer Motion
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('NewTripModal Integration', () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
      prefetch: jest.fn(),
    });
    mockFetch.mockReset();
  });

  const setup = () => {
    const user = userEvent.setup();
    render(
      <NewTripModal>
        <button data-testid="trigger-btn">Plan New Trip</button>
      </NewTripModal>
    );
    return { user };
  };

  it('renders the modal when trigger is clicked', async () => {
    const { user } = setup();

    expect(screen.queryByText('Plan a New Trip')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('trigger-btn'));

    expect(await screen.findByText('Plan a New Trip')).toBeInTheDocument();
    expect(screen.getByLabelText(/TRIP NAME/i)).toBeInTheDocument();
    expect(screen.getByText(/Next/i)).toBeInTheDocument();
  });

  it('disables the Next button if title is not filled', async () => {
    const { user } = setup();

    await user.click(screen.getByTestId('trigger-btn'));

    const nextBtn = screen.getByRole('button', { name: /^Next$/i });
    expect(nextBtn).toBeDisabled();

    const titleInput = await screen.findByLabelText(/TRIP NAME/i);
    await user.type(titleInput, 'My Title');
    expect(nextBtn).not.toBeDisabled();

    await user.click(nextBtn);

    expect(await screen.findByText(/Destination must be at least/i)).toBeInTheDocument();
    expect(screen.queryByText(/AI Packing Suggestions/i)).not.toBeInTheDocument();
  });

  it('submits correctly using "Skip & Create" flow', async () => {
    (actions.createTripAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { tripId: 'test-trip-id' },
    });

    const { user } = setup();

    await user.click(screen.getByTestId('trigger-btn'));

    // Step 1: Fill in details
    const titleInput = await screen.findByLabelText(/TRIP NAME/i);
    const destInput = screen.getByLabelText(/DESTINATION/i);

    await user.type(titleInput, 'My Vacation');
    await user.type(destInput, 'Hawaii');

    // Pick dates
    const startDateTrigger = screen.getByRole('button', { name: /Start Date/i });
    await user.click(startDateTrigger);
    const day10Buttons = await screen.findAllByRole('button', { name: /10/ });
    await user.click(day10Buttons[0]);

    const endDateTrigger = screen.getByRole('button', { name: /End Date/i });
    await user.click(endDateTrigger);
    const day15Buttons = await screen.findAllByRole('button', { name: /15/ });
    await user.click(day15Buttons[0]);

    const nextBtn = screen.getByRole('button', { name: /^Next$/i });
    await user.click(nextBtn);

    // Step 2: AI Prompt
    expect(await screen.findByText(/AI Packing Suggestions/i)).toBeInTheDocument();

    // Click "Skip & Create"
    const skipBtn = screen.getByRole('button', { name: /Skip & Create/i });
    await user.click(skipBtn);

    await waitFor(() => {
      expect(actions.createTripAction).toHaveBeenCalledTimes(1);
    });

    const callArgs = (actions.createTripAction as jest.Mock).mock.calls[0][0];
    expect(callArgs.title).toBe('My Vacation');
    expect(callArgs.destination).toBe('Hawaii');
    expect(callArgs.items).toEqual([]); // Should be empty

    await waitFor(
      () => {
        expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/trips/test-trip-id');
      },
      { timeout: 8000 }
    );
  });

  it('navigates to step 3 when valid AI prompt is provided and allows item selection', async () => {
    (actions.createTripAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { tripId: 'test-trip-id-2' },
    });

    const { user } = setup();
    await user.click(screen.getByTestId('trigger-btn'));

    // Skip accurate date picker logic for brevity in this test by mocking out RHF trigger? No, just type
    await user.type(await screen.findByLabelText(/TRIP NAME/i), 'Another Trip');
    await user.type(screen.getByLabelText(/DESTINATION/i), 'Paris');

    const startDateTrigger = screen.getByRole('button', { name: /Start Date/i });
    await user.click(startDateTrigger);
    const day10Buttons = await screen.findAllByRole('button', { name: /10/ });
    await user.click(day10Buttons[0]);

    const endDateTrigger = screen.getByRole('button', { name: /End Date/i });
    await user.click(endDateTrigger);
    const day15Buttons = await screen.findAllByRole('button', { name: /15/ });
    await user.click(day15Buttons[0]);

    await user.click(screen.getByRole('button', { name: /^Next$/i }));

    // Step 2: Write prompt and go to suggestions
    const promptInput = await screen.findByPlaceholderText(/e.g. 5 day hiking trip/i);
    await user.type(
      promptInput,
      'A very long description that easily exceeds the twenty character minimum length.'
    );

    // Mock fetch for suggestions
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { name: 'Sunscreen', quantity: 1, category: 'Personal Care' },
          { name: 'Passport', quantity: 1, category: 'Documents' },
        ],
      }),
    });

    const getSuggestionsBtn = screen.getByRole('button', { name: /Get Suggestions/i });
    expect(getSuggestionsBtn).not.toBeDisabled();
    await user.click(getSuggestionsBtn);

    // Step 3: Item selection
    expect(await screen.findByText(/Choose Suggested Items/i)).toBeInTheDocument();

    // Select an item pill
    const sunscreenBtn = await screen.findByRole('button', { name: /Sunscreen/i });
    await user.click(sunscreenBtn);

    // Submit
    const addItemsBtn = await screen.findByRole('button', { name: /Add 1 Items & Create/i });
    await user.click(addItemsBtn);

    await waitFor(() => {
      expect(actions.createTripAction).toHaveBeenCalledTimes(1);
    });

    const callArgs = (actions.createTripAction as jest.Mock).mock.calls[0][0];
    // Since it was default-selected, clicking it toggled it OFF.
    // So we expect Passport to be there but NOT Sunscreen.
    expect(callArgs.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Passport' })])
    );
    expect(callArgs.items).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Sunscreen' })])
    );

    await waitFor(
      () => {
        expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/trips/test-trip-id-2');
      },
      { timeout: 8000 }
    );
  }, 10000);

  it('shows a warning toast (not success) when server returns a warning on Skip & Create', async () => {
    (actions.createTripAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { tripId: 'warn-trip-id' },
      warning:
        "Trip created, but we couldn't fetch AI suggestions. You can add items manually later.",
    });

    const { user } = setup();
    await user.click(screen.getByTestId('trigger-btn'));

    await user.type(await screen.findByLabelText(/TRIP NAME/i), 'Warning Trip');
    await user.type(screen.getByLabelText(/DESTINATION/i), 'Berlin');

    const startDateTrigger = screen.getByRole('button', { name: /Start Date/i });
    await user.click(startDateTrigger);
    const day10Buttons = await screen.findAllByRole('button', { name: /10/ });
    await user.click(day10Buttons[0]);

    const endDateTrigger = screen.getByRole('button', { name: /End Date/i });
    await user.click(endDateTrigger);
    const day15Buttons = await screen.findAllByRole('button', { name: /15/ });
    await user.click(day15Buttons[0]);

    await user.click(screen.getByRole('button', { name: /^Next$/i }));
    await user.click(await screen.findByRole('button', { name: /Skip & Create/i }));

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining("couldn't fetch AI suggestions")
      );
      // Must NOT call success toast
      expect(toast.success).not.toHaveBeenCalled();
    });

    await waitFor(
      () => {
        expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/trips/warn-trip-id');
      },
      { timeout: 8000 }
    );
  }, 10000);

  it('closes modal and resets form when Cancel is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByTestId('trigger-btn'));

    await user.type(await screen.findByLabelText(/TRIP NAME/i), 'Trip To Cancel');
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelBtn);

    // Modal should be gone
    await waitFor(() => {
      expect(screen.queryByText('Plan a New Trip')).not.toBeInTheDocument();
    });

    // Reopen: field should be empty (form was reset)
    await user.click(screen.getByTestId('trigger-btn'));
    const titleInput = await screen.findByLabelText(/TRIP NAME/i);
    expect((titleInput as HTMLInputElement).value).toBe('');
  });

  it('navigates back from step 2 to step 1 when Back is clicked', async () => {
    const { user } = setup();
    await user.click(screen.getByTestId('trigger-btn'));

    await user.type(await screen.findByLabelText(/TRIP NAME/i), 'Round Trip');
    await user.type(screen.getByLabelText(/DESTINATION/i), 'Rome');

    const startDateTrigger = screen.getByRole('button', { name: /Start Date/i });
    await user.click(startDateTrigger);
    const day11Buttons = await screen.findAllByRole('button', { name: /11/ });
    await user.click(day11Buttons[0]);

    const endDateTrigger = screen.getByRole('button', { name: /End Date/i });
    await user.click(endDateTrigger);
    const day16Buttons = await screen.findAllByRole('button', { name: /16/ });
    await user.click(day16Buttons[0]);

    await user.click(screen.getByRole('button', { name: /^Next$/i }));

    // Verify step 2 is showing
    expect(await screen.findByText(/AI Packing Suggestions/i)).toBeInTheDocument();

    // Go back to step 1
    await user.click(screen.getByRole('button', { name: /Back/i }));
    // Verify step 1 heading is visible (not step 2 / step 3)
    expect(await screen.findByText('Plan a New Trip')).toBeInTheDocument();
    // Step 2 heading should no longer be visible (wait for AnimatePresence exit)
    await waitFor(() => {
      expect(screen.queryByText(/AI Packing Suggestions/i)).not.toBeInTheDocument();
    });
  });

  it('disables Get Suggestions btn below 20 chars and enables it at exactly 20 chars', async () => {
    const { user } = setup();
    await user.click(screen.getByTestId('trigger-btn'));

    await user.type(await screen.findByLabelText(/TRIP NAME/i), 'Char Limit Trip');
    await user.type(screen.getByLabelText(/DESTINATION/i), 'Oslo');

    const startDateTrigger = screen.getByRole('button', { name: /Start Date/i });
    await user.click(startDateTrigger);
    const day12Buttons = await screen.findAllByRole('button', { name: /12/ });
    await user.click(day12Buttons[0]);

    const endDateTrigger = screen.getByRole('button', { name: /End Date/i });
    await user.click(endDateTrigger);
    const day17Buttons = await screen.findAllByRole('button', { name: /17/ });
    await user.click(day17Buttons[0]);

    await user.click(screen.getByRole('button', { name: /^Next$/i }));

    const promptInput = await screen.findByPlaceholderText(/e.g. 5 day hiking trip/i);
    const getSuggestionsBtn = screen.getByRole('button', { name: /Get Suggestions/i });

    // Below 20 chars: disabled
    await user.type(promptInput, '19 characters long!'); // 19 chars
    expect(getSuggestionsBtn).toBeDisabled();

    // At exactly 20 chars: enabled
    await user.type(promptInput, 'X'); // now 20 chars
    expect(getSuggestionsBtn).not.toBeDisabled();
  });

  it('shows error toast when createTripAction fails', async () => {
    (actions.createTripAction as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Failed to create the trip. Please try again later.',
    });

    const { user } = setup();
    await user.click(screen.getByTestId('trigger-btn'));
    await user.type(await screen.findByLabelText(/TRIP NAME/i), 'Error Trip');
    await user.type(screen.getByLabelText(/DESTINATION/i), 'Nowhere');

    const startDateTrigger = screen.getByRole('button', { name: /Start Date/i });
    await user.click(startDateTrigger);
    const day13Buttons = await screen.findAllByRole('button', { name: /13/ });
    await user.click(day13Buttons[0]);

    const endDateTrigger = screen.getByRole('button', { name: /End Date/i });
    await user.click(endDateTrigger);
    const day18Buttons = await screen.findAllByRole('button', { name: /18/ });
    await user.click(day18Buttons[0]);

    await user.click(screen.getByRole('button', { name: /^Next$/i }));
    await user.click(await screen.findByRole('button', { name: /Skip & Create/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create the trip')
      );
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
