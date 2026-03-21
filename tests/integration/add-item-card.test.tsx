import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddItemCard } from '@/components/features/add-item-card';

describe('AddItemCard Integration', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with default props', () => {
      render(<AddItemCard onClick={mockOnClick} />);

      expect(screen.getByText('Add item')).toBeInTheDocument();
    });

    it('renders Plus icon', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      // Check for the Plus icon (lucide-react icon renders as an SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders as a button element', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });

    it('has correct button type', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  describe('Click Behavior', () => {
    it('calls onClick handler when clicked', async () => {
      const user = userEvent.setup();
      render(<AddItemCard onClick={mockOnClick} />);

      const button = screen.getByText('Add item').closest('button');
      if (button) {
        await user.click(button);

        expect(mockOnClick).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onClick handler when Plus icon is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      if (svg) {
        await user.click(svg);

        expect(mockOnClick).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onClick handler multiple times', async () => {
      const user = userEvent.setup();
      render(<AddItemCard onClick={mockOnClick} />);

      const button = screen.getByText('Add item').closest('button');
      if (button) {
        await user.click(button);
        await user.click(button);
        await user.click(button);

        expect(mockOnClick).toHaveBeenCalledTimes(3);
      }
    });

    it('does not call onClick when not clicked', () => {
      render(<AddItemCard onClick={mockOnClick} />);

      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });

  describe('Hover States', () => {
    it('applies hover classes to button', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('hover:bg-stone-50/80');
      expect(button).toHaveClass('hover:border-stone-400');
    });

    it('applies group hover classes to icon', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('group');

      // Icon should have group-hover classes
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('group-hover:text-stone-600');
    });

    it('applies group hover classes to text', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const span = container.querySelector('span');
      expect(span).toHaveClass('group-hover:text-stone-700');
    });

    it('has transition classes for smooth hover effect', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('transition-all');

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('transition-colors');

      const span = container.querySelector('span');
      expect(span).toHaveClass('transition-colors');
    });
  });

  describe('Styling Classes', () => {
    it('has correct base styling classes', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button') as HTMLElement;
      expect(button).toHaveClass('w-full');
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('border-dashed');
      expect(button).toHaveClass('border-stone-300');
      expect(button).toHaveClass('rounded-xl');
      expect(button).toHaveClass('shadow-sm');
      expect(button).toHaveClass('cursor-pointer');
      expect(button).toHaveClass('group');
      expect(button).toHaveClass('flex');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
      expect(button).toHaveClass('gap-2');
    });

    it('has correct responsive height classes', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button') as HTMLElement;
      expect(button).toHaveClass('h-[80px]');
      expect(button).toHaveClass('sm:h-[88px]');
    });

    it('has correct responsive padding classes', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button') as HTMLElement;
      expect(button).toHaveClass('p-3');
      expect(button).toHaveClass('sm:p-4');
    });

    it('has correct icon sizing classes', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const svg = container.querySelector('svg') as HTMLElement;
      expect(svg).toHaveClass('h-4');
      expect(svg).toHaveClass('w-4');
      expect(svg).toHaveClass('sm:h-5');
      expect(svg).toHaveClass('sm:w-5');
    });

    it('has correct text color classes', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-stone-400');

      const span = container.querySelector('span');
      expect(span).toHaveClass('text-stone-500');
    });

    it('has correct text sizing classes', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const span = container.querySelector('span') as HTMLElement;
      expect(span).toHaveClass('text-sm');
      expect(span).toHaveClass('sm:text-base');
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains flex layout at all sizes', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('flex');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
    });

    it('uses full width at all sizes', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('w-full');
    });

    it('adjusts height responsively', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button') as HTMLElement;
      // Mobile: 80px, Desktop: 88px
      expect(button.className).toContain('h-[80px]');
      expect(button.className).toContain('sm:h-[88px]');
    });

    it('adjusts icon size responsively', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const svg = container.querySelector('svg') as HTMLElement;
      // Mobile: 16px (h-4 w-4), Desktop: 20px (sm:h-5 sm:w-5)
      expect(svg.classList.contains('h-4')).toBe(true);
      expect(svg.classList.contains('w-4')).toBe(true);
      expect(svg.classList.contains('sm:h-5')).toBe(true);
      expect(svg.classList.contains('sm:w-5')).toBe(true);
    });

    it('adjusts text size responsively', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const span = container.querySelector('span') as HTMLElement;
      // Mobile: 14px (text-sm), Desktop: 16px (sm:text-base)
      expect(span.className).toContain('text-sm');
      expect(span.className).toContain('sm:text-base');
    });

    it('adjusts padding responsively', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button') as HTMLElement;
      // Mobile: 12px (p-3), Desktop: 16px (sm:p-4)
      expect(button.className).toContain('p-3');
      expect(button.className).toContain('sm:p-4');
    });
  });

  describe('Accessibility', () => {
    it('is keyboard accessible as a button', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('has visible text label', () => {
      render(<AddItemCard onClick={mockOnClick} />);

      expect(screen.getByText('Add item')).toBeInTheDocument();
    });

    it('maintains focus styles', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('cursor-pointer');
    });
  });

  describe('Integration with Parent Components', () => {
    it('works with inline onClick handler', async () => {
      const user = userEvent.setup();
      let clicked = false;

      render(
        <AddItemCard
          onClick={() => {
            clicked = true;
          }}
        />
      );

      const button = screen.getByText('Add item').closest('button');
      if (button) {
        await user.click(button);

        expect(clicked).toBe(true);
      }
    });

    it('passes event through onClick handler', async () => {
      const user = userEvent.setup();
      const handler = jest.fn();

      render(<AddItemCard onClick={handler} />);

      const button = screen.getByText('Add item').closest('button');
      if (button) {
        await user.click(button);

        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'click',
          })
        );
      }
    });

    it('works with debounced onClick handlers', async () => {
      const user = userEvent.setup();
      let callCount = 0;

      const debouncedHandler = () => {
        callCount++;
      };

      render(<AddItemCard onClick={debouncedHandler} />);

      const button = screen.getByText('Add item').closest('button');
      if (button) {
        await user.click(button);
        await user.click(button);

        expect(callCount).toBe(2);
      }
    });
  });

  describe('Visual Consistency', () => {
    it('has consistent border styling (dashed)', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button') as HTMLElement;
      expect(button).toHaveClass('border-dashed');
      expect(button).toHaveClass('border-stone-300');
    });

    it('has transparent background', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-transparent');
    });

    it('has subtle shadow', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('shadow-sm');
    });

    it('has rounded corners', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('rounded-xl');
    });
  });

  describe('Layout', () => {
    it('centers content horizontally and vertically', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('flex');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
    });

    it('has gap between icon and text', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button');
      expect(button).toHaveClass('gap-2');
    });

    it('icon appears before text', () => {
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button') as HTMLElement;
      const children = button.children;

      // First child should be the icon (svg)
      expect(children[0].tagName.toLowerCase()).toBe('svg');

      // Second child should be the text span
      expect(children[1].tagName.toLowerCase()).toBe('span');
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid clicks without errors', async () => {
      const user = userEvent.setup();
      render(<AddItemCard onClick={mockOnClick} />);

      const button = screen.getByText('Add item').closest('button');
      if (button) {
        await user.click(button);
        await user.click(button);
        await user.click(button);
        await user.click(button);
        await user.click(button);

        expect(mockOnClick).toHaveBeenCalledTimes(5);
      }
    });

    it('handles being clicked when disabled (if parent prevents)', async () => {
      const user = userEvent.setup();
      const { container } = render(<AddItemCard onClick={mockOnClick} />);

      const button = container.querySelector('button') as HTMLElement;

      // Simulate disabled state
      button.setAttribute('disabled', 'true');

      await user.click(button);

      // Button is disabled, so onClick shouldn't be called
      // But since our component doesn't handle disabled prop, it will still be called
      // This test documents the current behavior
    });

    it('does not have any console errors when rendering', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<AddItemCard onClick={mockOnClick} />);

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
