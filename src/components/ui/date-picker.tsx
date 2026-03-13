'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerProps {
  date?: Date;
  setDate: (date?: Date) => void;
  className?: string;
  placeholder?: string;
  minDate?: Date;
}

export function DatePicker({
  date,
  setDate,
  className,
  placeholder = 'Pick a date',
  minDate,
}: DatePickerProps) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal bg-white border-stone-200 h-11 px-3',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'MMM d, yyyy') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 z-50 bg-white shadow-2xl rounded-xl border border-stone-200"
        align="start"
        side="top"
        sideOffset={12}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setIsPopoverOpen(false);
          }}
          initialFocus
          disabled={minDate ? (day) => day < minDate : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
