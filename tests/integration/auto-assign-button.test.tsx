import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AutoAssignButton } from '@/components/features/trips/auto-assign-button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockRouter = {
  refresh: jest.fn(),
};

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('AutoAssignButton Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Items assigned successfully!' }),
    } as Response);
  });

  it('should render the button', () => {
    render(<AutoAssignButton tripId="trip-1" />);

    expect(screen.getByTestId('auto-assign-button')).toBeInTheDocument();
    expect(screen.getByText('Assign Randomly')).toBeInTheDocument();
  });

  it('should open dialog when button is clicked', async () => {
    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));

    expect(screen.getByText('Assign Items Randomly?')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('distribute all remaining items'))
    ).toBeInTheDocument();
  });

  it('should close dialog when cancel is clicked', async () => {
    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    expect(screen.getByText('Assign Items Randomly?')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Assign Items Randomly?')).not.toBeInTheDocument();
    });
  });

  it('should show loading state during assignment', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: 'Items assigned successfully!' }),
            } as Response);
          }, 100);
        })
    );

    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    await userEvent.click(screen.getByText('Confirm Assignment'));

    expect(screen.getByText(/Assigning.../)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Assigning.../)).not.toBeInTheDocument();
    });
  });

  it('should disable buttons during loading', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: 'Items assigned successfully!' }),
            } as Response);
          }, 100);
        })
    );

    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    await userEvent.click(screen.getByText('Confirm Assignment'));

    const cancelButton = screen.getByText('Cancel').closest('button');
    const confirmButton = screen.getByText(/Assigning.../).closest('button');

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
  });

  it('should show success toast and close dialog on successful assignment', async () => {
    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    await userEvent.click(screen.getByText('Confirm Assignment'));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Items assigned successfully!');
      expect(mockRouter.refresh).toHaveBeenCalled();
      expect(screen.queryByText('Assign Items Randomly?')).not.toBeInTheDocument();
    });
  });

  it('should show error toast on API error', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to assign items' }),
    } as Response);

    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    await userEvent.click(screen.getByText('Confirm Assignment'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to assign items');
    });
  });

  it('should show error toast on network error', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('Network error')
    );

    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    await userEvent.click(screen.getByText('Confirm Assignment'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Network error');
    });
  });

  it('should show generic error toast when error is not an Error instance', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue('string error');

    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    await userEvent.click(screen.getByText('Confirm Assignment'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('An unexpected error occurred');
    });
  });

  it('should use custom message from API response', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Custom success message' }),
    } as Response);

    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    await userEvent.click(screen.getByText('Confirm Assignment'));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Custom success message');
    });
  });

  it('should refresh page after successful assignment', async () => {
    render(<AutoAssignButton tripId="trip-1" />);

    await userEvent.click(screen.getByTestId('auto-assign-button'));
    await userEvent.click(screen.getByText('Confirm Assignment'));

    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled();
    });
  });
});
