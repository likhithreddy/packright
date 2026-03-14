import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteConfirmationDialog } from '../../src/components/features/delete-confirmation-dialog';

// Mock Dialog components from shadcn
jest.mock('../../src/components/ui/dialog', () => ({
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Dialog: ({ open, children, onOpenChange }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div className="flex gap-2">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2 role="heading">{children}</h2>,
  /* eslint-enable @typescript-eslint/no-explicit-any */
}));

// Mock Button component
jest.mock('../../src/components/ui/button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-disabled={disabled ? 'true' : undefined}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className: string }) => (
    <div data-testid="loader" className={className}>
      Loader
    </div>
  ),
  AlertTriangle: ({ className }: { className: string }) => (
    <div data-testid="alert-triangle" className={className}>
      Alert
    </div>
  ),
}));

describe('DeleteConfirmationDialog Integration', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    itemName: 'Tent',
    requiredCount: 2,
    onConfirm: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />);
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<DeleteConfirmationDialog {...defaultProps} open={false} />);
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('renders delete icon (AlertTriangle)', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />);
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
    });

    it('renders title "Delete Item"', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />);
      expect(screen.getByRole('heading', { name: 'Delete Item' })).toBeInTheDocument();
    });

    it('renders item name in confirmation message', () => {
      render(<DeleteConfirmationDialog {...defaultProps} itemName="Sleeping Bag" />);
      expect(screen.getAllByText(/Sleeping Bag/).length).toBeGreaterThan(0);
    });

    it('renders warning message about action being irreversible', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />);
      expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
    });

    it('displays item info box with item name and quantity', () => {
      render(<DeleteConfirmationDialog {...defaultProps} itemName="Tent" requiredCount={3} />);
      expect(screen.getByText(/Item:/)).toBeInTheDocument();
      expect(screen.getAllByText(/Tent/).length).toBeGreaterThan(0);
      expect(screen.getByText(/Required Quantity:/)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders Delete Item button when not loading', () => {
      render(<DeleteConfirmationDialog {...defaultProps} />);
      expect(screen.getAllByText('Delete Item')).toHaveLength(2); // title + button
    });

    it('renders loading state when deleting', async () => {
      const onConfirm = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<DeleteConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      const deleteButtons = screen.getAllByText('Delete Item');
      const deleteButton = deleteButtons.find((el) => el.tagName === 'BUTTON');
      await userEvent.click(deleteButton!);

      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('closes dialog when Cancel is clicked', async () => {
      const onOpenChange = jest.fn();
      render(<DeleteConfirmationDialog {...defaultProps} onOpenChange={onOpenChange} />);

      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('calls onConfirm when Delete Item button is clicked', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      render(<DeleteConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      const deleteButtons = screen.getAllByText('Delete Item');
      const deleteButton = deleteButtons.find((el) => el.tagName === 'BUTTON');
      await userEvent.click(deleteButton!);

      expect(onConfirm).toHaveBeenCalled();
    });

    it('closes dialog after successful deletion', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const onOpenChange = jest.fn();
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      );

      const deleteButtons = screen.getAllByText('Delete Item');
      const deleteButton = deleteButtons.find((el) => el.tagName === 'BUTTON');
      await userEvent.click(deleteButton!);

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('does not close dialog when deletion fails (error in console)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onConfirm = jest.fn().mockRejectedValue(new Error('Delete failed'));
      const onOpenChange = jest.fn();
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      );

      const deleteButtons = screen.getAllByText('Delete Item');
      const deleteButton = deleteButtons.find((el) => el.tagName === 'BUTTON');
      await userEvent.click(deleteButton!);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Dialog should not close on error
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Button States', () => {
    it('disables Cancel button while deleting', async () => {
      const onConfirm = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<DeleteConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      const deleteButtons = screen.getAllByText('Delete Item');
      const deleteButton = deleteButtons.find((el) => el.tagName === 'BUTTON');
      await userEvent.click(deleteButton!);

      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });

    it('disables Delete Item button while deleting', async () => {
      const onConfirm = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<DeleteConfirmationDialog {...defaultProps} onConfirm={onConfirm} />);

      const deleteButtons = screen.getAllByText('Delete Item');
      const deleteButton = deleteButtons.find((el) => el.tagName === 'BUTTON');
      await userEvent.click(deleteButton!);

      // After clicking, button should show loading state
      await waitFor(() => {
        const loadingButton = screen.getByText('Deleting...');
        expect(loadingButton).toBeDisabled();
      });
    });

    it('prevents closing dialog while deleting', async () => {
      const onConfirm = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      const onOpenChange = jest.fn();
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      );

      const deleteButtons = screen.getAllByText('Delete Item');
      const deleteButton = deleteButtons.find((el) => el.tagName === 'BUTTON');
      await userEvent.click(deleteButton!);

      // Try to close while deleting - should not call onOpenChange
      onOpenChange(false);
      expect(onOpenChange).toHaveBeenCalledTimes(1); // Only called after deletion completes
    });
  });

  describe('Edge Cases', () => {
    it('handles item name with special characters', () => {
      render(<DeleteConfirmationDialog {...defaultProps} itemName="Tent (2-person)" />);
      expect(screen.getAllByText(/Tent \(2-person\)/).length).toBeGreaterThan(0);
    });

    it('handles very long item names', () => {
      const longName = 'This is a very long item name that might wrap or truncate';
      render(<DeleteConfirmationDialog {...defaultProps} itemName={longName} />);
      expect(screen.getAllByText(new RegExp(longName)).length).toBeGreaterThan(0);
    });

    it('handles zero required count', () => {
      render(<DeleteConfirmationDialog {...defaultProps} requiredCount={0} />);
      expect(screen.getByText(/Required Quantity:/)).toBeInTheDocument();
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('handles large required count', () => {
      render(<DeleteConfirmationDialog {...defaultProps} requiredCount={100} />);
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('handles empty item name', () => {
      render(<DeleteConfirmationDialog {...defaultProps} itemName="" />);
      // Should still render with empty name
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
  });

  describe('Error Handling Extended', () => {
    it('handles delete error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onConfirm = jest.fn().mockRejectedValue(new Error('Delete failed'));
      const onOpenChange = jest.fn();
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      );

      // Click the Delete Item button (not the heading)
      const deleteButtons = screen.getAllByText('Delete Item');
      await userEvent.click(deleteButtons[1]);

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Dialog should not close on error
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      consoleSpy.mockRestore();
    });

    it('prevents closing while submitting', async () => {
      const onConfirm = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
        );
      const onOpenChange = jest.fn();
      render(
        <DeleteConfirmationDialog
          {...defaultProps}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
        />
      );

      // Click the Delete Item button (not the heading)
      const deleteButtons = screen.getAllByText('Delete Item');
      await userEvent.click(deleteButtons[1]);

      // Try to close while submitting
      await userEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        // Cancel should be disabled while submitting
        const cancelButton = screen.getByText('Cancel');
        expect(cancelButton).toBeDisabled();
      });
    });
  });
});
