'use client';

import * as React from 'react';
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { addYears, subYears } from 'date-fns';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  locale,
  formatters,
  components,
  fixedWeeks = true,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
  fixedWeeks?: boolean;
}) {
  const defaultClassNames = getDefaultClassNames();
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    props.month || props.defaultMonth || new Date()
  );

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
    props.onMonthChange?.(month);
  };

  const goToPreviousYear = () => {
    const newMonth = subYears(currentMonth, 1);
    handleMonthChange(newMonth);
  };

  const goToNextYear = () => {
    const newMonth = addYears(currentMonth, 1);
    handleMonthChange(newMonth);
  };

  return (
    <DayPicker
      month={currentMonth}
      onMonthChange={handleMonthChange}
      showOutsideDays={showOutsideDays}
      fixedWeeks={fixedWeeks}
      className={cn(
        'group/calendar bg-background p-3 [--cell-radius:var(--radius-md)] [--cell-size:36px] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-[280px]', defaultClassNames.root),
        months: cn('relative flex flex-col gap-4 md:flex-row', defaultClassNames.months),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_next
        ),
        month_caption: cn(
          'flex h-(--cell-size) w-full items-center justify-center px-10',
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn('relative rounded-(--cell-radius)', defaultClassNames.dropdown_root),
        dropdown: cn('absolute inset-0 bg-popover opacity-0', defaultClassNames.dropdown),
        caption_label: cn(
          'font-medium select-none',
          captionLayout === 'label'
            ? 'text-sm'
            : 'flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground',
          defaultClassNames.caption_label
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 rounded-(--cell-radius) text-[0.8rem] font-normal text-muted-foreground select-none',
          defaultClassNames.weekday
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        week_number_header: cn('w-(--cell-size) select-none', defaultClassNames.week_number_header),
        week_number: cn(
          'text-[0.8rem] text-muted-foreground select-none',
          defaultClassNames.week_number
        ),
        day: cn(
          'group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)',
          props.showWeekNumber
            ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-(--cell-radius)'
            : '[&:first-child[data-selected=true]_button]:rounded-l-(--cell-radius)',
          defaultClassNames.day
        ),
        range_start: cn(
          'relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted',
          defaultClassNames.range_start
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn(
          'relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted',
          defaultClassNames.range_end
        ),
        today: cn(
          'rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none',
          defaultClassNames.today
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside
        ),
        disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
        },
        Nav: ({ onPreviousClick, onNextClick, previousMonth, nextMonth }) => {
          return (
            <div className="absolute inset-x-0 top-0 flex w-full items-center justify-between px-3 h-(--cell-size)">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-(--cell-size) p-0 hover:bg-stone-100 transition-colors"
                  onClick={goToPreviousYear}
                  aria-label="Previous year"
                >
                  <ChevronsLeft className="size-4 text-stone-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-(--cell-size) p-0 hover:bg-stone-100 transition-colors"
                  disabled={!previousMonth}
                  onClick={onPreviousClick}
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon className="size-4 text-stone-600" />
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-(--cell-size) p-0 hover:bg-stone-100 transition-colors"
                  disabled={!nextMonth}
                  onClick={onNextClick}
                  aria-label="Next month"
                >
                  <ChevronRightIcon className="size-4 text-stone-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-(--cell-size) p-0 hover:bg-stone-100 transition-colors"
                  onClick={goToNextYear}
                  aria-label="Next year"
                >
                  <ChevronsRight className="size-4 text-stone-600" />
                </Button>
              </div>
            </div>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-70',
        modifiers.outside &&
          'opacity-50 pointer-events-none data-[selected=true]:bg-transparent data-[selected=true]:text-muted-foreground',
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
