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

jest.mock('../../src/app/actions/trips', () => ({
  createTripAction: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

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
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
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

  it('shows validation errors if next is clicked without filling details', async () => {
    const { user } = setup();

    await user.click(screen.getByTestId('trigger-btn'));

    // In step 1, the button says "Next"
    const nextBtn = screen.getByRole('button', { name: /^Next$/i });
    await user.click(nextBtn);

    // Zod validation messages
    expect(await screen.findByText(/Title must be at least 2 characters/i)).toBeInTheDocument();

    // Should NOT go to step 2 (AI Suggestions shouldn't be visible)
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
    const datePickerTrigger = screen.getByRole('button', { name: /Pick the trip dates/i });
    await user.click(datePickerTrigger);

    const day10Buttons = await screen.findAllByRole('button', { name: /10/ });
    const day15Buttons = await screen.findAllByRole('button', { name: /15/ });
    await user.click(day10Buttons[0]);
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

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/trips/test-trip-id');
    });
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

    const datePickerTrigger = screen.getByRole('button', { name: /Pick the trip dates/i });
    await user.click(datePickerTrigger);

    // Select dates by day numbers (10 and 15). Use getAll to avoid ambiguity and pick first
    const day10Buttons = await screen.findAllByRole('button', { name: /10/ });
    const day15Buttons = await screen.findAllByRole('button', { name: /15/ });
    await user.click(day10Buttons[0]);
    await user.click(day15Buttons[0]);

    await user.click(screen.getByRole('button', { name: /^Next$/i }));

    // Step 2: Write prompt and go to suggestions
    const promptInput = await screen.findByPlaceholderText(/e.g. 5 day hiking trip/i);
    await user.type(
      promptInput,
      'A very long description that easily exceeds the twenty character minimum length.'
    );

    const getSuggestionsBtn = screen.getByRole('button', { name: /Get Suggestions/i });
    expect(getSuggestionsBtn).not.toBeDisabled();
    await user.click(getSuggestionsBtn);

    // Step 3: Item selection
    expect(await screen.findByText(/Choose Suggested Items/i)).toBeInTheDocument();

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
    expect(callArgs.items).toContain('Sunscreen');
  });
});
