import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimQuantityDialog } from '@/components/features/claim-quantity-dialog';

// Track default values for dynamic mocking
let mockDefaultValue = 2;

// Mock react-hook-form to provide a mock form
jest.mock('react-hook-form', () => ({
  /* eslint-disable @typescript-eslint/no-explicit-any */
  useForm: ({ defaultValues }: any) => {
    mockDefaultValue = defaultValues?.quantity || 2;
    return {
      control: {},
      handleSubmit: (fn: any) => (e: any) => {
        e?.preventDefault?.();
        return fn({ quantity: mockDefaultValue });
      },
      reset: () => {
        mockDefaultValue = 2;
      },
      formState: { isSubmitting: false },
    };
  },
  Controller: ({ render }: any) =>
    render({
      field: {
        value: mockDefaultValue,
        onChange: jest.fn(),
        onBlur: jest.fn(),
        name: 'quantity',
        ref: jest.fn(),
      },
    }),
  FormProvider: ({ children }: any) => <>{children}</>,
  /* eslint-enable @typescript-eslint/no-explicit-any */
}));

// Mock Dialog components from shadcn
jest.mock('../../src/components/ui/dialog', () => ({
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Dialog: ({ open, onOpenChange: _onOpenChange, children }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div className="flex gap-2">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  /* eslint-enable @typescript-eslint/no-explicit-any */
}));

// Mock Button component
jest.mock('../../src/components/ui/button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, type, ...props }: any) => (
    <button type={type} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock Input component
jest.mock('../../src/components/ui/input', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Input: (props: any) => <input data-testid="quantity-input" {...props} />,
}));

describe('ClaimQuantityDialog Integration', () => {
  it('renders dialog when open', () => {
    render(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={jest.fn()}
        itemName="Tent"
        remainingNeeded={2}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Claim Item')).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    render(
      <ClaimQuantityDialog
        open={false}
        onOpenChange={jest.fn()}
        itemName="Tent"
        remainingNeeded={2}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays item name and remaining needed', () => {
    render(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={jest.fn()}
        itemName="Tent"
        remainingNeeded={3}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByText(/Tent/)).toBeInTheDocument();
    expect(screen.getByText('3 more needed')).toBeInTheDocument();
  });

  it('pre-fills quantity input with remaining needed', () => {
    render(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={jest.fn()}
        itemName="Tent"
        remainingNeeded={2}
        onConfirm={jest.fn()}
      />
    );

    const input = screen.getByTestId('quantity-input') as HTMLInputElement;
    expect(input.value).toBe('2');
  });

  it('calls onConfirm with quantity when form is submitted', async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={onOpenChange}
        itemName="Tent"
        remainingNeeded={2}
        onConfirm={onConfirm}
      />
    );

    // The form should auto-submit with the default value
    const form = screen.getByText('Confirm').closest('form');
    if (form) {
      await userEvent.click(screen.getByText('Confirm'));
    }

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(2);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('closes dialog when Cancel is clicked', async () => {
    const onOpenChange = jest.fn();

    render(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={onOpenChange}
        itemName="Tent"
        remainingNeeded={2}
        onConfirm={jest.fn()}
      />
    );

    await userEvent.click(screen.getByText('Cancel'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('resets form when dialog closes', async () => {
    const onOpenChange = jest.fn();

    const { rerender } = render(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={onOpenChange}
        itemName="Tent"
        remainingNeeded={2}
        onConfirm={jest.fn()}
      />
    );

    // Close the dialog
    rerender(
      <ClaimQuantityDialog
        open={false}
        onOpenChange={onOpenChange}
        itemName="Tent"
        remainingNeeded={2}
        onConfirm={jest.fn()}
      />
    );

    // Open again - should have reset
    rerender(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={onOpenChange}
        itemName="Tent"
        remainingNeeded={2}
        onConfirm={jest.fn()}
      />
    );

    const input = screen.getByTestId('quantity-input') as HTMLInputElement;
    expect(input.value).toBe('2'); // Should be reset to default
  });

  it('handles single remaining needed item', () => {
    render(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={jest.fn()}
        itemName="Sleeping Bag"
        remainingNeeded={1}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByText('1 more needed')).toBeInTheDocument();

    const input = screen.getByTestId('quantity-input') as HTMLInputElement;
    expect(input.value).toBe('1');
  });

  it('handles large remaining needed count', () => {
    render(
      <ClaimQuantityDialog
        open={true}
        onOpenChange={jest.fn()}
        itemName="Snacks"
        remainingNeeded={10}
        onConfirm={jest.fn()}
      />
    );

    expect(screen.getByText('10 more needed')).toBeInTheDocument();

    const input = screen.getByTestId('quantity-input') as HTMLInputElement;
    expect(input.value).toBe('10');
  });
});
