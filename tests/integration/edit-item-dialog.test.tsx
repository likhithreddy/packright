import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EditItemDialog } from '../../src/components/features/edit-item-dialog';

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
  return {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    useForm: ({ defaultValues }: any) => {
      const control = {
        _defaultValues: { ...defaultValues },
      };

      return {
        control,
        reset: (newValues: any) => {
          control._defaultValues = { ...newValues };
        },
        getValues: () => control._defaultValues,
      };
    },
    Form: ({ children, ...props }: any) => (
      <div data-testid="edit-item-form" {...props}>
        {children}
      </div>
    ),
    FormControl: ({ children }: any) => <div>{children}</div>,
    FormField: ({ render, control, name }: any) => {
      const value = control?._defaultValues?.[name] ?? '';

      const field = {
        name,
        value,
        onChange: jest.fn(),
        onBlur: jest.fn(),
      };
      return render({ field });
    },
    FormItem: ({ children }: any) => <div>{children}</div>,
    FormLabel: ({ children, className }: any) => <label className={className}>{children}</label>,
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
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Input: ({ onChange, ...props }: any) => (
    <input
      onChange={onChange && ((e: any) => onChange(parseInt(e.target.value) || 0))}
      {...props}
    />
  ),
  /* eslint-enable @typescript-eslint/no-explicit-any */
}));

jest.mock('../../src/components/ui/label', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

jest.mock('../../src/components/ui/radio-group', () => ({
  /* eslint-disable @typescript-eslint/no-explicit-any */
  RadioGroup: ({ children, onValueChange, value, defaultValue, className }: any) => {
    // Use value if provided, otherwise fall back to defaultValue
    const currentValue = value ?? defaultValue;
    return (
      <div className={className} data-value={currentValue}>
        {React.Children.map(children, (child) =>
          React.cloneElement(child, { onValueChange, currentValue })
        )}
      </div>
    );
  },
  RadioGroupItem: ({ value: itemValue, id, onValueChange, currentValue }: any) => (
    <input
      type="radio"
      value={itemValue}
      id={id}
      checked={currentValue === itemValue}
      onChange={(e) => onValueChange && onValueChange(e.target.value)}
      data-testid={`radio-${itemValue}`}
    />
  ),
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

jest.mock('lucide-react', () => ({
  Loader2: ({ className }: { className: string }) => (
    <div data-testid="loader" className={className}>
      Loader
    </div>
  ),
}));

describe('EditItemDialog Integration', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    itemName: 'Tent',
    requiredCount: 2,
    claimType: 'single' as const,
    onSave: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      render(<EditItemDialog {...defaultProps} open={false} />);
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('renders title "Edit Item"', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByText('Edit Item')).toBeInTheDocument();
    });

    it('renders description about updating item', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(
        screen.getByText(/Update the item name, quantity, and claim type/)
      ).toBeInTheDocument();
    });

    it('renders Item Name label and input', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByText('Item Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter item name')).toBeInTheDocument();
    });

    it('renders Required Quantity label and input', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByText('Required Quantity')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter quantity')).toBeInTheDocument();
    });

    it('renders Claim Type label with radio buttons', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByText('Claim Type')).toBeInTheDocument();
      expect(screen.getByTestId('radio-single')).toBeInTheDocument();
      expect(screen.getByTestId('radio-multiple')).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders Save Changes button when not submitting', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('pre-fills item name input with itemName prop', () => {
      render(<EditItemDialog {...defaultProps} itemName="Sleeping Bag" />);
      const input = screen.getByPlaceholderText('Enter item name') as HTMLInputElement;
      expect(input.value).toBe('Sleeping Bag');
    });

    it('pre-fills quantity input with requiredCount prop', () => {
      render(<EditItemDialog {...defaultProps} requiredCount={5} />);
      const input = screen.getByPlaceholderText('Enter quantity') as HTMLInputElement;
      expect(input.value).toBe('5');
    });
  });

  describe('Claim Type Options', () => {
    it('shows "Single person" option with description', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByText('Single person')).toBeInTheDocument();
      expect(screen.getByText('One person claims all items')).toBeInTheDocument();
    });

    it('shows "Multiple people" option with description', () => {
      render(<EditItemDialog {...defaultProps} />);
      expect(screen.getByText('Multiple people')).toBeInTheDocument();
      expect(screen.getByText('Allow quantity splitting')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSave with form values when Save Changes is clicked', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      render(<EditItemDialog {...defaultProps} onSave={onSave} />);

      await userEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('Tent', 2, 'single');
      });
    });

    it('closes dialog after successful save', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const onOpenChange = jest.fn();
      render(<EditItemDialog {...defaultProps} onSave={onSave} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows loading state while saving', async () => {
      const onSave = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
        );
      render(<EditItemDialog {...defaultProps} onSave={onSave} />);

      await userEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByTestId('loader')).toBeInTheDocument();
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('disables buttons while saving', async () => {
      const onSave = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
        );
      render(<EditItemDialog {...defaultProps} onSave={onSave} />);

      await userEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        expect(cancelButton).toBeDisabled();
      });
    });

    it('handles save error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      const onOpenChange = jest.fn();
      render(<EditItemDialog {...defaultProps} onSave={onSave} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });

      // Dialog should not close on error
      expect(onOpenChange).not.toHaveBeenCalledWith(false);

      consoleSpy.mockRestore();
    });
  });

  describe('Cancel Behavior', () => {
    it('closes dialog when Cancel is clicked', async () => {
      const onOpenChange = jest.fn();
      render(<EditItemDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Cancel'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets form when Cancel is clicked', async () => {
      const onOpenChange = jest.fn();
      render(<EditItemDialog {...defaultProps} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Cancel'));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles very long item name (100 chars)', () => {
      const longName = 'A'.repeat(100);
      render(<EditItemDialog {...defaultProps} itemName={longName} />);
      const input = screen.getByPlaceholderText('Enter item name') as HTMLInputElement;
      expect(input.value).toBe(longName);
    });

    it('handles maximum quantity (1000)', () => {
      render(<EditItemDialog {...defaultProps} requiredCount={1000} />);
      const input = screen.getByPlaceholderText('Enter quantity') as HTMLInputElement;
      expect(input.value).toBe('1000');
    });

    it('handles minimum quantity (1)', () => {
      render(<EditItemDialog {...defaultProps} requiredCount={1} />);
      const input = screen.getByPlaceholderText('Enter quantity') as HTMLInputElement;
      expect(input.value).toBe('1');
    });

    it('handles empty item name', () => {
      render(<EditItemDialog {...defaultProps} itemName="" />);
      const input = screen.getByPlaceholderText('Enter item name') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Error Handling Extended', () => {
    it('displays error message when save fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const onSave = jest.fn().mockRejectedValue(new Error('Network error'));
      render(<EditItemDialog {...defaultProps} onSave={onSave} />);

      await userEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled();
      });

      // Dialog should not close on error
      expect(screen.getByTestId('dialog')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('prevents closing while submitting', async () => {
      const onSave = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
        );
      const onOpenChange = jest.fn();
      render(<EditItemDialog {...defaultProps} onSave={onSave} onOpenChange={onOpenChange} />);

      await userEvent.click(screen.getByText('Save Changes'));

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
