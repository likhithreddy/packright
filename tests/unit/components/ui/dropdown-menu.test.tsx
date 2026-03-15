import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
} from '@/components/ui/dropdown-menu';

// Mock Radix UI components
jest.mock('@radix-ui/react-dropdown-menu', () => ({
  Root: ({ children, open, onOpenChange }: React.PropsWithChildren<Record<string, unknown>>) => {
    // Prevent rendering children twice in tests
    const renderChildren = React.useMemo(() => children, [children]);
    return (
      <div data-testid="dropdown-root" data-open={open}>
        {React.Children.map(renderChildren, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { open, onOpenChange });
          }
          return child;
        })}
      </div>
    );
  },
  Trigger: ({ children, onClick }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button data-testid="dropdown-trigger" onClick={onClick}>
      {children}
    </button>
  ),
  Content: ({
    children,
    sideOffset,
    className,
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="dropdown-content" data-side-offset={sideOffset} className={className}>
      {children}
    </div>
  ),
  Item: ({
    children,
    className,
    onSelect,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div className={className} data-testid="dropdown-item" onClick={onSelect} {...props}>
      {children}
    </div>
  ),
  CheckboxItem: ({
    children,
    checked,
    onCheckedChange,
    className,
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div
      data-testid="dropdown-checkbox-item"
      data-checked={checked}
      className={className}
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span data-testid="item-indicator">{checked && <span data-testid="check-icon">✓</span>}</span>
      {children}
    </div>
  ),
  ItemIndicator: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
    <span data-testid="item-indicator">{children}</span>
  ),
  RadioItem: ({
    children,
    value,
    onSelect,
    className,
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div
      data-testid="dropdown-radio-item"
      data-value={value}
      className={className}
      onClick={onSelect}
    >
      <span data-testid="radio-indicator" />
      {children}
    </div>
  ),
  Label: ({ children, className }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="dropdown-label" className={className}>
      {children}
    </div>
  ),
  Separator: ({ className }: React.PropsWithChildren<Record<string, unknown>>) => (
    <hr data-testid="dropdown-separator" className={className} />
  ),
  Group: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="dropdown-group">{children}</div>
  ),
  Sub: ({ children, open }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="dropdown-sub" data-open={open}>
      {children}
    </div>
  ),
  SubTrigger: ({
    children,
    className,
    onClick,
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button data-testid="dropdown-sub-trigger" className={className} onClick={onClick}>
      {children}
      <span data-testid="chevron-right">›</span>
    </button>
  ),
  SubContent: ({ children, className }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="dropdown-sub-content" className={className}>
      {children}
    </div>
  ),
  RadioGroup: ({
    children,
    onValueChange,
    value,
  }: React.PropsWithChildren<Record<string, unknown>>) => {
    const renderChildren = React.useMemo(() => children, [children]);
    return (
      <div
        data-testid="dropdown-radio-group"
        data-value={value}
        onClick={() => onValueChange?.('test-value')}
      >
        {React.Children.map(renderChildren, (child) => {
          if (React.isValidElement(child) && child.type === DropdownMenuRadioItem) {
            return React.cloneElement(child, { checked: child.props.value === value });
          }
          return child;
        })}
      </div>
    );
  },
  Portal: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
}));

describe('DropdownMenu Components', () => {
  describe('DropdownMenu', () => {
    it('should render menu items', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-root')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-trigger')).toHaveTextContent('Trigger');
      expect(screen.getAllByTestId('dropdown-item')).toHaveLength(2);
    });

    it('should trigger onOpenChange callback', async () => {
      const handleOpenChange = jest.fn();
      const user = userEvent.setup();

      render(
        <DropdownMenu open={false} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      await user.click(screen.getByTestId('dropdown-trigger'));
    });
  });

  describe('DropdownMenuItem', () => {
    it('should apply inset class when inset prop is true', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset>Inset Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const item = screen.getByTestId('dropdown-item');
      expect(item).toHaveClass('pl-8');
    });

    it('should apply custom className', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem className="custom-class">Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const item = screen.getByTestId('dropdown-item');
      expect(item).toHaveClass('custom-class');
    });
  });

  describe('DropdownMenuCheckboxItem', () => {
    it('should show check indicator when checked', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={true} onCheckedChange={jest.fn()}>
              Checkbox Item
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const checkbox = screen.getByTestId('dropdown-checkbox-item');
      expect(checkbox).toHaveAttribute('data-checked', 'true');
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should not show check indicator when unchecked', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={jest.fn()}>
              Checkbox Item
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    });

    it('should toggle checked state on click', async () => {
      const handleCheckedChange = jest.fn();
      const user = userEvent.setup();

      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={handleCheckedChange}>
              Checkbox Item
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      await user.click(screen.getByTestId('dropdown-checkbox-item'));
      expect(handleCheckedChange).toHaveBeenCalledWith(true);
    });

    it('should apply custom className', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              checked={false}
              onCheckedChange={jest.fn()}
              className="custom"
            >
              Checkbox
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const checkbox = screen.getByTestId('dropdown-checkbox-item');
      expect(checkbox).toHaveClass('custom');
    });
  });

  describe('DropdownMenuRadioGroup', () => {
    it('should render radio items within group', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1" onValueChange={jest.fn()}>
              <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-radio-group')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-radio-group')).toHaveAttribute('data-value', 'option1');
      expect(screen.getAllByTestId('dropdown-radio-item')).toHaveLength(2);
    });

    it('should render radio items with correct values', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1" onValueChange={jest.fn()}>
              <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const radioItems = screen.getAllByTestId('dropdown-radio-item');
      expect(radioItems[0]).toHaveAttribute('data-value', 'option1');
      expect(radioItems[1]).toHaveAttribute('data-value', 'option2');
    });
  });

  describe('DropdownMenuLabel', () => {
    it('should render label with text', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Label Text</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-label')).toHaveTextContent('Label Text');
    });

    it('should apply inset class when inset prop is true', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const label = screen.getByTestId('dropdown-label');
      expect(label).toHaveClass('pl-8');
    });
  });

  describe('DropdownMenuSeparator', () => {
    it('should render separator element', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-separator')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator className="custom-separator" />
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const separator = screen.getByTestId('dropdown-separator');
      expect(separator).toHaveClass('custom-separator');
    });
  });

  describe('DropdownMenuShortcut', () => {
    it('should render shortcut text', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Item
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Item
              <DropdownMenuShortcut className="custom-shortcut">⌘K</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const shortcut = screen.getByText('⌘K');
      expect(shortcut).toHaveClass('custom-shortcut');
    });
  });

  describe('DropdownMenuGroup', () => {
    it('should render grouped items', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Group Item 1</DropdownMenuItem>
              <DropdownMenuItem>Group Item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-group')).toBeInTheDocument();
      expect(screen.getAllByTestId('dropdown-item')).toHaveLength(2);
    });
  });

  describe('DropdownMenuSub', () => {
    it('should render submenu structure', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub open={true} onOpenChange={jest.fn()}>
              <DropdownMenuSubTrigger>Submenu Trigger</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-sub')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-sub-trigger')).toBeInTheDocument();
      expect(screen.getByTestId('dropdown-sub-content')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    });

    it('should apply inset class to subtrigger when inset prop is true', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub open={true} onOpenChange={jest.fn()}>
              <DropdownMenuSubTrigger inset>Submenu Trigger</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const subtrigger = screen.getByTestId('dropdown-sub-trigger');
      expect(subtrigger).toHaveClass('pl-8');
    });
  });

  describe('DropdownMenuContent', () => {
    it('should render with default sideOffset', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const content = screen.getByTestId('dropdown-content');
      expect(content).toHaveAttribute('data-side-offset', '4');
    });

    it('should render with custom sideOffset', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={8}>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const content = screen.getByTestId('dropdown-content');
      expect(content).toHaveAttribute('data-side-offset', '8');
    });

    it('should apply custom className', () => {
      render(
        <DropdownMenu open={true} onOpenChange={jest.fn()}>
          <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
          <DropdownMenuContent className="custom-content">
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const content = screen.getByTestId('dropdown-content');
      expect(content).toHaveClass('custom-content');
    });
  });
});
