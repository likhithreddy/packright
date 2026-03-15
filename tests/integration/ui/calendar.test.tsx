import React from 'react';
import { render, screen } from '@testing-library/react';
import { Calendar } from '@/components/ui/calendar';

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: React.PropsWithChildren<{
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    [key: string]: unknown;
  }>) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
  buttonVariants: () => '',
}));

// Mock react-day-picker
jest.mock('react-day-picker', () => ({
  DayPicker: ({
    month,
    onMonthChange,
    className,
  }: {
    month?: Date;
    onMonthChange?: (date: Date) => void;
    className?: string;
  }) => {
    const [internalMonth, setInternalMonth] = React.useState(month || new Date());

    const handleMonthChange = (newMonth: Date) => {
      setInternalMonth(newMonth);
      onMonthChange?.(newMonth);
    };

    return (
      <div
        data-testid="calendar-root"
        className={className}
        data-month={internalMonth.toISOString()}
      >
        <button
          onClick={() => {
            const newMonth = new Date(internalMonth);
            newMonth.setMonth(newMonth.getMonth() + 1);
            handleMonthChange(newMonth);
          }}
          aria-label="Next month"
        >
          Next
        </button>
        <span data-testid="current-month">
          {internalMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
      </div>
    );
  },
  getDefaultClassNames: () => ({
    root: 'rdp-root',
  }),
}));

describe('Calendar Integration', () => {
  it('should render calendar with initial month', () => {
    render(<Calendar />);

    const calendarRoot = screen.getByTestId('calendar-root');
    expect(calendarRoot).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<Calendar className="custom-calendar" />);

    const calendarRoot = screen.getByTestId('calendar-root');
    expect(calendarRoot).toHaveClass('custom-calendar');
  });

  it('should display current month', () => {
    render(<Calendar />);

    const currentMonth = screen.getByTestId('current-month');
    expect(currentMonth).toBeInTheDocument();
  });

  it('should handle month prop for controlled component', () => {
    const controlledMonth = new Date(2024, 5, 1);
    render(<Calendar month={controlledMonth} />);

    const calendarRoot = screen.getByTestId('calendar-root');
    expect(calendarRoot).toHaveAttribute('data-month', controlledMonth.toISOString());
  });

  it('should handle defaultMonth prop', () => {
    const defaultMonth = new Date(2023, 11, 1);
    render(<Calendar defaultMonth={defaultMonth} />);

    const calendarRoot = screen.getByTestId('calendar-root');
    expect(calendarRoot).toBeInTheDocument();
  });

  it('should handle onMonthChange callback', () => {
    const onMonthChange = jest.fn();
    const { container } = render(<Calendar onMonthChange={onMonthChange} />);

    const nextButton = container.querySelector('[aria-label="Next month"]');
    if (nextButton) {
      (nextButton as HTMLButtonElement).click();
      expect(onMonthChange).toHaveBeenCalled();
    }
  });

  it('should handle showOutsideDays prop', () => {
    render(<Calendar showOutsideDays={true} />);

    const calendarRoot = screen.getByTestId('calendar-root');
    expect(calendarRoot).toBeInTheDocument();
  });

  it('should handle fixedWeeks prop', () => {
    render(<Calendar fixedWeeks={true} />);

    const calendarRoot = screen.getByTestId('calendar-root');
    expect(calendarRoot).toBeInTheDocument();
  });

  it('should handle locale prop', () => {
    const customLocale = { code: 'es-ES' as const };
    render(<Calendar locale={customLocale} />);

    const calendarRoot = screen.getByTestId('calendar-root');
    expect(calendarRoot).toBeInTheDocument();
  });

  it('should handle disabled state', () => {
    render(<Calendar disabled />);

    const calendarRoot = screen.getByTestId('calendar-root');
    expect(calendarRoot).toBeInTheDocument();
  });
});
