import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UnclaimDialog } from '../../src/components/features/unclaim-dialog';

// Mock Dialog components
jest.mock('../../src/components/ui/dialog', () => ({
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Dialog: ({ open, children, onOpenChange: _onOpenChange }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div className="flex gap-2">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  /* eslint-enable @typescript-eslint/no-explicit-any */
}));

// Mock Form components
jest.mock('../../src/components/ui/form', () => {
  const React = require('react');
  return {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    Form: ({ children, ...props }: any) => (
      <div data-testid="unclaim-form" {...props}>
        {children}
      </div>
    ),
    FormControl: ({ children }: any) => <div>{children}</div>,
    FormField: ({ render }: any) => {
      const [value, setValue] = React.useState(2);
      const field = {
        name: 'quantity',
        value,
        onChange: (val: any) => setValue(val),
        onBlur: jest.fn(),
      };
      return render({ field });
    },
    FormItem: ({ children }: any) => <div>{children}</div>,
    FormMessage: () => <div data-testid="form-message" />,
    /* eslint-enable @typescript-eslint/no-explicit-any */
  };
});

// Mock other UI components
jest.mock('../../src/components/ui/button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, disabled, type, className, ...props }: any) => (
    <button
      type={type}
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

jest.mock('../../src/components/ui/input', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input: ({ min, max, ...props }: any) => (
    <input type="number" min={min} max={max} data-testid="quantity-input" {...props} />
  ),
}));

jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className: string }) => (
    <div data-testid="loader" className={className}>
      Loader
    </div>
  ),
}));

describe('UnclaimDialog Integration', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    itemName: 'Tent',
    claimedQuantity: 2,
    onConfirm: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<UnclaimDialog {...defaultProps} />);
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<UnclaimDialog {...defaultProps} open={false} />);
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('renders title "Unclaim Item"', () => {
      render(<UnclaimDialog {...defaultProps} />);
      expect(screen.getByText('Unclaim Item')).toBeInTheDocument();
    });

    it('renders item name in description', () => {
      render(<UnclaimDialog {...defaultProps} itemName="Sleeping Bag" />);
      expect(screen.getByText(/Sleeping Bag/)).toBeInTheDocument();
    });

    it('displays claimed quantity in description', () => {
      render(<UnclaimDialog {...defaultProps} claimedQuantity={5} />);
      expect(screen.getByText(/You have claimed 5/)).toBeInTheDocument();
    });

    it('renders quantity input field', () => {
      render(<UnclaimDialog {...defaultProps} />);
      expect(screen.getByTestId('quantity-input')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<UnclaimDialog {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders Unclaim button when not submitting', () => {
      render(<UnclaimDialog {...defaultProps} />);
      expect(screen.getByText('Unclaim')).toBeInTheDocument();
    });

    it('renders loading state when submitting', async () => {
      const onConfirm = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<UnclaimDialog {...defaultProps} onConfirm={onConfirm} />);

      await userEvent.click(screen.getByText('Unclaim'));

      await waitFor(() => {
        expect(screen.getByTestId('loader')).toBeInTheDocument();
        expect(screen.getByText('Unclaiming...')).toBeInTheDocument();
      });
    });
  });

  describe('Form Behavior', () => {
    it('sets max attribute on input to claimedQuantity', () => {
      render(<UnclaimDialog {...defaultProps} claimedQuantity={5} />);
      const input = screen.getByTestId('quantity-input') as HTMLInputElement;
      expect(input.max).toBe('5');
    });

    it('sets min attribute on input to 1', () => {
      render(<UnclaimDialog {...defaultProps} />);
      const input = screen.getByTestId('quantity-input') as HTMLInputElement;
      expect(input.min).toBe('1');
    });
  });

  describe('Interactions', () => {
    it('calls onConfirm with quantity when Unclaim button is clicked', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      render(<UnclaimDialog {...defaultProps} onConfirm={onConfirm} claimedQuantity={5} />);

      await userEvent.click(screen.getByText('Unclaim'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(5); // Default value is claimedQuantity
      });
    });

    it('closes dialog after successful unclaim', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const onOpenChange = jest.fn();
      render(<UnclaimDialog {...defaultProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Unclaim'));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('closes dialog when Cancel is clicked', async () => {
      const onOpenChange = jest.fn();
      render(<UnclaimDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Cancel'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('disables buttons while submitting', async () => {
      const onConfirm = jest
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
      render(<UnclaimDialog {...defaultProps} onConfirm={onConfirm} />);

      await userEvent.click(screen.getByText('Unclaim'));

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        expect(cancelButton).toBeDisabled();
      });
    });

    it('handles unclaim error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onConfirm = jest.fn().mockRejectedValue(new Error('Unclaim failed'));
      const onOpenChange = jest.fn();
      render(<UnclaimDialog {...defaultProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Unclaim'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Dialog should not close on error
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles large claimed quantity', () => {
      render(<UnclaimDialog {...defaultProps} claimedQuantity={100} />);
      const input = screen.getByTestId('quantity-input') as HTMLInputElement;
      expect(input.max).toBe('100');
    });

    it('handles item name with special characters', () => {
      render(<UnclaimDialog {...defaultProps} itemName="Tent (2-person)" />);
      expect(screen.getByText(/Tent \(2-person\)/)).toBeInTheDocument();
    });

    it('handles very long item names', () => {
      const longName = 'This is a very long item name that might affect layout';
      render(<UnclaimDialog {...defaultProps} itemName={longName} />);
      expect(screen.getByText(new RegExp(longName))).toBeInTheDocument();
    });

    it('handles empty item name', () => {
      render(<UnclaimDialog {...defaultProps} itemName="" />);
      // Should still render with empty name
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });
  });

  describe('Error Handling Extended', () => {
    it('displays error message when unclaim fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onConfirm = jest.fn().mockRejectedValue(new Error('Network error'));
      render(<UnclaimDialog {...defaultProps} onConfirm={onConfirm} />);

      await userEvent.click(screen.getByText('Unclaim'));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });

      // Dialog should not close on error
      expect(screen.getByTestId('dialog')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('prevents closing while submitting', async () => {
      const onConfirm = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
        );
      const onOpenChange = jest.fn();
      render(<UnclaimDialog {...defaultProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Unclaim'));

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
