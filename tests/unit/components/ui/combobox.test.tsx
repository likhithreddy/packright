import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';

describe('Combobox Unit Tests', () => {
  const defaultOptions: ComboboxOption[] = [
    { value: 'essentials', label: 'Essentials' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'toiletries', label: 'Toiletries' },
    { value: 'documents', label: 'Documents' },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Searchable Functionality', () => {
    it('opens dropdown when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
      }
    });

    it('filters options based on search input', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      // Open dropdown
      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Ele');

        // Should only show Electronics
        await waitFor(() => {
          expect(screen.getByText('Electronics')).toBeInTheDocument();
          expect(screen.queryByText('Essentials')).not.toBeInTheDocument();
          expect(screen.queryByText('Clothing')).not.toBeInTheDocument();
        });
      }
    });

    it('performs case-insensitive search', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'ELE');

        // Should still show Electronics (case insensitive)
        await waitFor(() => {
          expect(screen.getByText('Electronics')).toBeInTheDocument();
        });
      }
    });

    it('shows all options when search is empty', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        // All options should be visible
        await waitFor(() => {
          expect(screen.getByText('Essentials')).toBeInTheDocument();
          expect(screen.getByText('Clothing')).toBeInTheDocument();
          expect(screen.getByText('Electronics')).toBeInTheDocument();
          expect(screen.getByText('Toiletries')).toBeInTheDocument();
          expect(screen.getByText('Documents')).toBeInTheDocument();
        });
      }
    });

    it('shows "No options found" when search has no matches', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'xyz');

        await waitFor(() => {
          expect(screen.getByText('No options found')).toBeInTheDocument();
        });
      }
    });

    it('clears search when dropdown is closed', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Ele');

        // Close by clicking outside
        await user.click(document.body);

        // Reopen - search should be cleared
        await user.click(trigger);

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/Search/i)).toHaveValue('');
        });
      }
    });
  });

  describe('"Add new" Option', () => {
    it('shows "Add new" option when allowNew is true and search has no exact match', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          allowNew
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Custom');

        await waitFor(() => {
          expect(screen.getByText(/Add new "Custom"/i)).toBeInTheDocument();
        });
      }
    });

    it('does NOT show "Add new" option when allowNew is false', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          allowNew={false}
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Custom');

        await waitFor(() => {
          expect(screen.queryByText(/Add new "Custom"/i)).not.toBeInTheDocument();
          expect(screen.getByText('No options found')).toBeInTheDocument();
        });
      }
    });

    it('does NOT show "Add new" option when there is an exact match', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          allowNew
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Essentials');

        await waitFor(() => {
          expect(screen.queryByText(/Add new "Essentials"/i)).not.toBeInTheDocument();
          expect(screen.getByText('Essentials')).toBeInTheDocument();
        });
      }
    });

    it('uses custom newLabelFormat when provided', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          allowNew
          newLabelFormat={(v) => `Create "${v}"`}
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'New Category');

        await waitFor(() => {
          expect(screen.getByText('Create "New Category"')).toBeInTheDocument();
          expect(screen.queryByText(/Add new/i)).not.toBeInTheDocument();
        });
      }
    });

    it('calls onChange with custom value when "Add new" option is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          allowNew
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Custom Category');

        const addNewButton = screen.getByText(/Add new "Custom Category"/i);
        await user.click(addNewButton);

        expect(mockOnChange).toHaveBeenCalledWith('Custom Category');
      }
    });
  });

  describe('Text-Left Alignment', () => {
    it('applies text-left class to option labels', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        // Check that option labels have text-left class
        await waitFor(() => {
          // Only check the dropdown options (the ones with text-left class)
          const options = screen.getAllByText(
            /Essentials|Clothing|Electronics|Toiletries|Documents/
          );
          const dropdownOptions = options.filter((opt) => opt.classList.contains('text-left'));
          dropdownOptions.forEach((option) => {
            expect(option).toHaveClass('text-left');
          });
          // Should have 5 dropdown options with text-left class
          expect(dropdownOptions.length).toBe(5);
        });
      }
    });

    it('applies text-left class to "Add new" option', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          allowNew
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Custom');

        await waitFor(() => {
          const addNewOption = screen.getByText(/Add new "Custom"/i);
          // The span has text-left class
          expect(addNewOption).toHaveClass('text-left');
        });
      }
    });

    it('trigger text has truncate class', () => {
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i);
      expect(trigger).toHaveClass('truncate');
    });
  });

  describe('Full Row Hover Highlight', () => {
    it('applies hover:bg-stone-100 class to options', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        await waitFor(() => {
          // The hover class is on the button element, not the span
          const options = screen.getAllByText(/Essentials|Clothing|Electronics/);
          options.forEach((option) => {
            // Check the parent button element for the hover class
            const parentButton = option.closest('button');
            expect(parentButton).toHaveClass('hover:bg-stone-100');
          });
        });
      }
    });

    it('applies hover:bg-stone-100 class to "Add new" option', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          allowNew
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Custom');

        await waitFor(() => {
          const addNewOption = screen.getByText(/Add new "Custom"/i);
          const parentButton = addNewOption.closest('button');
          expect(parentButton).toHaveClass('hover:bg-stone-100');
        });
      }
    });

    it('option button has w-full class for full width', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        await waitFor(() => {
          const options = screen.getAllByText(/Essentials|Clothing|Electronics/);
          options.forEach((option) => {
            const parentButton = option.closest('button');
            expect(parentButton).toHaveClass('w-full');
          });
        });
      }
    });

    it('"Add new" option button has w-full class', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          allowNew
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        await user.type(searchInput, 'Custom');

        await waitFor(() => {
          const addNewOption = screen.getByText(/Add new "Custom"/i);
          const parentButton = addNewOption.closest('button');
          expect(parentButton).toHaveClass('w-full');
        });
      }
    });

    it('highlights selected option with bg-stone-100', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value="essentials"
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText('Essentials').closest('button');
      if (trigger) {
        await user.click(trigger);

        await waitFor(() => {
          // Get all elements with "Essentials" text
          const essentialsOptions = screen.getAllByText('Essentials');
          // The one in the dropdown should have the bg-stone-100 parent
          const dropdownOption = essentialsOptions.find((opt) =>
            opt.classList.contains('text-left')
          );
          expect(dropdownOption?.parentElement).toHaveClass('bg-stone-100');
        });
      }
    });
  });

  describe('Selection Behavior', () => {
    it('displays selected value in trigger', () => {
      render(
        <Combobox
          options={defaultOptions}
          value="essentials"
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      expect(screen.getByText('Essentials')).toBeInTheDocument();
    });

    it('calls onChange when option is selected', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const essentialsOption = screen.getByText('Essentials');
        await user.click(essentialsOption);

        expect(mockOnChange).toHaveBeenCalledWith('essentials');
      }
    });

    it('closes dropdown after selection', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const essentialsOption = screen.getByText('Essentials');
        await user.click(essentialsOption);

        await waitFor(() => {
          expect(screen.queryByPlaceholderText(/Search/i)).not.toBeInTheDocument();
        });
      }
    });

    it('shows checkmark for selected option', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value="essentials"
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText('Essentials').closest('button');
      if (trigger) {
        await user.click(trigger);

        await waitFor(() => {
          // Get all elements with "Essentials" text
          const essentialsOptions = screen.getAllByText('Essentials');
          // The one in the dropdown should have a checkmark as sibling
          const dropdownOption = essentialsOptions.find((opt) =>
            opt.classList.contains('text-left')
          );
          expect(
            dropdownOption?.parentElement?.querySelector('svg.lucide-check')
          ).toBeInTheDocument();
        });
      }
    });
  });

  describe('Disabled State', () => {
    it('disables trigger when disabled prop is true', () => {
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          disabled
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      expect(trigger).toBeDisabled();
    });

    it('applies disabled styling classes', () => {
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          disabled
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      expect(trigger).toHaveClass('cursor-not-allowed');
      expect(trigger).toHaveClass('opacity-50');
    });

    it('does not open dropdown when disabled', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          disabled
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        expect(screen.queryByPlaceholderText(/Search/i)).not.toBeInTheDocument();
      }
    });
  });

  describe('Dropdown Positioning', () => {
    it('dropdown has absolute positioning', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const dropdown = screen.getByPlaceholderText(/Search/i).closest('.absolute');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveClass('z-50');
      }
    });

    it('dropdown has mt-1 for margin top', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const dropdown = screen.getByPlaceholderText(/Search/i).closest('.mt-1');
        expect(dropdown).toBeInTheDocument();
      }
    });

    it('dropdown has max-h-60 for max height', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const dropdown = screen.getByPlaceholderText(/Search/i).closest('.max-h-60');
        expect(dropdown).toBeInTheDocument();
      }
    });

    it('dropdown has w-full for full width', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const dropdown = screen.getByPlaceholderText(/Search/i).closest('.w-full');
        expect(dropdown).toBeInTheDocument();
      }
    });
  });

  describe('Visual Styling', () => {
    it('trigger has border classes', () => {
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      expect(trigger).toHaveClass('border');
      expect(trigger).toHaveClass('border-stone-300');
    });

    it('trigger has hover class', () => {
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      expect(trigger).toHaveClass('hover:bg-stone-50');
    });

    it('trigger has ring class when open', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        expect(trigger).toHaveClass('ring-2');
        expect(trigger).toHaveClass('ring-stone-200');
      }
    });

    it('dropdown has shadow-lg', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const dropdown = screen.getByPlaceholderText(/Search/i).closest('.shadow-lg');
        expect(dropdown).toBeInTheDocument();
      }
    });

    it('dropdown has rounded-md border', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const dropdown = screen.getByPlaceholderText(/Search/i).closest('.rounded-md');
        expect(dropdown).toBeInTheDocument();
        expect(dropdown).toHaveClass('border');
        expect(dropdown).toHaveClass('border-stone-200');
      }
    });
  });

  describe('Chevron Icon Rotation', () => {
    it('chevron rotates when dropdown is open', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        // Initially not rotated
        const chevron = trigger.querySelector('svg');
        expect(chevron).not.toHaveClass('rotate-180');

        await user.click(trigger);

        // Should be rotated after opening
        expect(chevron).toHaveClass('rotate-180');
      }
    });

    it('chevron has transition-transform class', () => {
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      const chevron = trigger?.querySelector('svg');
      expect(chevron).toHaveClass('transition-transform');
    });
  });

  describe('Focus Management', () => {
    it('focuses search input when dropdown opens', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        await waitFor(() => {
          const searchInput = screen.getByPlaceholderText(/Search/i);
          expect(searchInput).toHaveFocus();
        });
      }
    });

    it('trigger has focus-visible:outline-none class', () => {
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      expect(trigger).toHaveClass('focus-visible:outline-none');
    });

    it('search input has focus:outline-none class', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        const searchInput = screen.getByPlaceholderText(/Search/i);
        expect(searchInput).toHaveClass('focus:outline-none');
      }
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to wrapper', () => {
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
          className="custom-class"
        />
      );

      const wrapper = screen.getByText(/Select/i).closest('.custom-class');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Click Outside to Close', () => {
    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(
        <Combobox
          options={defaultOptions}
          value=""
          onChange={mockOnChange}
          placeholder="Select..."
        />
      );

      const trigger = screen.getByText(/Select/i).closest('button');
      if (trigger) {
        await user.click(trigger);

        expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();

        // Click outside
        await user.click(document.body);

        await waitFor(() => {
          expect(screen.queryByPlaceholderText(/Search/i)).not.toBeInTheDocument();
        });
      }
    });
  });
});
