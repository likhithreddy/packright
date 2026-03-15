import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AutoAssignButton } from '@/components/features/trips/auto-assign-button';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={props['data-testid']}
      type="button"
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dialog', () => {
  const MockDialog = ({
    open,
    onOpenChange,
    children,
  }: React.PropsWithChildren<Record<string, unknown>>) => {
    const [internalOpen, setInternalOpen] = React.useState(open);

    React.useEffect(() => {
      setInternalOpen(open);
    }, [open]);

    const handleOpenChange = (newOpen: boolean) => {
      setInternalOpen(newOpen);
      onOpenChange(newOpen);
    };

    return (
      <div data-open={internalOpen} data-testid="dialog">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              open: internalOpen,
              onOpenChange: handleOpenChange,
            });
          }
          return child;
        })}
      </div>
    );
  };

  const MockDialogTrigger = ({
    children,
    asChild,
    onClick,
  }: React.PropsWithChildren<Record<string, unknown>>) => {
    const handleClick = (e: React.MouseEvent) => {
      if (onClick) onClick(e);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, { onClick: handleClick });
    }
    return <button onClick={handleClick}>{children}</button>;
  };

  return {
    Dialog: MockDialog,
    DialogTrigger: MockDialogTrigger,
    DialogContent: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-testid="dialog-content">{children}</div>
    ),
    DialogHeader: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-testid="dialog-header">{children}</div>
    ),
    DialogTitle: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
      <h2 data-testid="dialog-title">{children}</h2>
    ),
    DialogDescription: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p data-testid="dialog-description">{children}</p>
    ),
    DialogFooter: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-testid="dialog-footer">{children}</div>
    ),
  };
});

describe('AutoAssignButton', () => {
  const mockRouter = {
    refresh: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  };

  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render the button with correct text and icon', () => {
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Assign Randomly');
  });

  it('should render dialog components', () => {
    render(<AutoAssignButton tripId="trip-1" />);

    // Dialog components should be in the DOM
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('should show loading state during assignment', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          // Never resolve to keep loading state
          setTimeout(
            () => resolve({ ok: true, json: async () => ({ message: 'Success' }) }),
            10000
          );
        })
    );

    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const confirmButton = screen.getByText('Confirm Assignment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/Assigning\.\.\./i)).toBeInTheDocument();
    });
  });

  it('should disable button during loading', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: async () => ({ message: 'Success' }) }), 1000);
        })
    );

    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const confirmButton = screen.getByText('Confirm Assignment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });
  });

  it('should disable cancel button during loading', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: async () => ({ message: 'Success' }) }), 1000);
        })
    );

    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const cancelButton = screen.getByText('Cancel');
    await user.click(screen.getByText('Confirm Assignment'));

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });

  it('should close dialog on cancel', async () => {
    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    await waitFor(() => {
      const dialog = screen.getByTestId('dialog');
      expect(dialog).toHaveAttribute('data-open', 'false');
    });
  });

  it('should handle successful auto-assignment', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Items assigned successfully!' }),
    });

    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const confirmButton = screen.getByText('Confirm Assignment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/trips/trip-1/auto-assign', {
        method: 'POST',
      });
      expect(toast.success).toHaveBeenCalledWith('Items assigned successfully!');
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    // Dialog should be closed after success
    const dialog = screen.getByTestId('dialog');
    expect(dialog).toHaveAttribute('data-open', 'false');
  });

  it('should handle auto-assignment errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to assign items' }),
    });

    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const confirmButton = screen.getByText('Confirm Assignment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to assign items');
    });

    // Dialog closes after operation completes (even on error)
    const dialog = screen.getByTestId('dialog');
    expect(dialog).toHaveAttribute('data-open', 'false');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const confirmButton = screen.getByText('Confirm Assignment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });

    // Dialog closes after operation completes
    const dialog = screen.getByTestId('dialog');
    expect(dialog).toHaveAttribute('data-open', 'false');
  });

  it('should use custom error message from API when available', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'No members available for assignment' }),
    });

    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const confirmButton = screen.getByText('Confirm Assignment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('No members available for assignment');
    });
  });

  it('should use default error message when API returns no error text', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    const confirmButton = screen.getByText('Confirm Assignment');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to auto-assign items');
    });
  });

  it('should apply custom className', () => {
    render(<AutoAssignButton tripId="trip-1" className="custom-class" />);

    const button = screen.getByTestId('auto-assign-button');
    expect(button).toHaveClass('custom-class');
  });

  it('should display additional note in dialog', async () => {
    const user = userEvent.setup();
    render(<AutoAssignButton tripId="trip-1" />);

    const button = screen.getByTestId('auto-assign-button');
    await user.click(button);

    expect(screen.getByText(/Note:/i)).toBeInTheDocument();
    expect(screen.getByText(/quantity-based balancing algorithm/i)).toBeInTheDocument();
  });
});
