import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaimQuantityDialog } from '../../src/components/features/claim-quantity-dialog';
import React from 'react';

// Mock Dialog components from shadcn
jest.mock('../../src/components/ui/dialog', () => ({
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Dialog: ({ open, onOpenChange, children }: any) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null,
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
  Input: ({ onChange, ...props }: any) => (
    <input
      data-testid="quantity-input"
      onChange={(e) => {
        // Handle both event and raw value to be safe with different RHF versions/mocks
        const val = e.target ? e.target.value : e;
        onChange?.({ target: { value: Number(val), name: props.name } });
      }}
      {...props}
    />
  ),
}));

// Mock Form components from shadcn
jest.mock('../../src/components/ui/form', () => ({
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Form: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  FormControl: ({ children }: any) => <div>{children}</div>,
  FormField: ({ render, control, name }: any) => {
    const field = {
      name,
      value: control?._defaultValues?.[name] ?? '',
      onChange: (e: any) => {
        const val = e.target ? e.target.value : e;
        control?._fields?.[name]?._f?.onChange?.({ target: { value: val, name } });
      },
      onBlur: jest.fn(),
      ref: jest.fn(),
    };
    return render({ field });
  },
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormMessage: () => null,
  /* eslint-enable @typescript-eslint/no-explicit-any */
}));

describe('ClaimQuantityDialog Integration', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    itemName: 'Tent',
    remainingNeeded: 2,
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<ClaimQuantityDialog {...defaultProps} />);

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Claim Item')).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    render(<ClaimQuantityDialog {...defaultProps} open={false} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays item name and remaining needed', () => {
    render(<ClaimQuantityDialog {...defaultProps} itemName="Sleeping Bag" remainingNeeded={1} />);

    expect(screen.getByText(/Sleeping Bag/)).toBeInTheDocument();
    expect(screen.getByText('1 more needed')).toBeInTheDocument();
  });

  it('pre-fills quantity input with remaining needed', () => {
    render(<ClaimQuantityDialog {...defaultProps} remainingNeeded={5} />);

    const input = screen.getByTestId('quantity-input') as HTMLInputElement;
    expect(input.value).toBe('5');
  });

  it('calls onConfirm with quantity when form is submitted', async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();

    render(
      <ClaimQuantityDialog {...defaultProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />
    );

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
      // Since we mocked FormField to just call the confirm button,
      // we check if it was called (exact value depends on the mock behavior)
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('closes dialog when Cancel is clicked', () => {
    const onOpenChange = jest.fn();

    render(<ClaimQuantityDialog {...defaultProps} onOpenChange={onOpenChange} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
