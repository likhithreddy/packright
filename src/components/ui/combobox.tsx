'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowNew?: boolean;
  newLabelFormat?: (value: string) => string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  allowNew = false,
  newLabelFormat = (v) => `Add new "${v}"`,
  className,
  disabled = false,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const comboboxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter options based on search value
  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    const lowerSearch = searchValue.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lowerSearch));
  }, [options, searchValue]);

  // Check if there's an exact match
  const hasExactMatch = React.useMemo(() => {
    return options.some((opt) => opt.value.toLowerCase() === searchValue.toLowerCase());
  }, [options, searchValue]);

  // Determine if we should show the "Add new" option
  const shouldShowNewOption = allowNew && searchValue && !hasExactMatch;

  // Get display value
  const displayValue = React.useMemo(() => {
    const selectedOption = options.find((opt) => opt.value === value);
    return selectedOption?.label || value || '';
  }, [options, value]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleToggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  return (
    <div ref={comboboxRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleToggleOpen}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm transition-colors',
          'focus-visible:outline-none',
          'hover:bg-stone-50',
          disabled && 'cursor-not-allowed opacity-50',
          isOpen && 'ring-2 ring-stone-200'
        )}
      >
        <span className={cn('truncate', !displayValue && 'text-stone-500')}>
          {displayValue || placeholder}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-stone-200 bg-white py-1 shadow-lg">
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={handleInputChange}
            placeholder="Search..."
            className="w-full border-0 border-b border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-0"
            autoComplete="off"
          />

          {filteredOptions.length === 0 && !shouldShowNewOption && (
            <div className="px-3 py-2 text-sm text-stone-500">No options found</div>
          )}

          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors w-full',
                'hover:bg-stone-100',
                value === option.value && 'bg-stone-100'
              )}
            >
              <span className="flex-1 truncate text-left">{option.label}</span>
              {value === option.value && <Check className="h-4 w-4 shrink-0 text-stone-700" />}
            </button>
          ))}

          {shouldShowNewOption && (
            <button
              type="button"
              onClick={() => handleSelect(searchValue)}
              className={cn(
                'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors w-full',
                'hover:bg-stone-100 bg-stone-50'
              )}
            >
              <span className="flex-1 truncate text-left text-stone-700">
                {newLabelFormat(searchValue)}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
