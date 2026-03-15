import { render, screen } from '@testing-library/react';
import { ReadinessVisualizer } from '@/components/features/readiness-visualizer';

// Mock Progress component
jest.mock('@/components/ui/progress', () => ({
  Progress: ({
    value,
    className,
    indicatorClassName,
  }: {
    value: number;
    className?: string;
    indicatorClassName?: string;
  }) => (
    <div
      data-testid="progress"
      data-value={value}
      data-class-name={className}
      data-indicator-class-name={indicatorClassName}
    />
  ),
}));

describe('ReadinessVisualizer Integration', () => {
  it('should return null when percentage is null', () => {
    const { container } = render(<ReadinessVisualizer percentage={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render progress bar with 0% (red)', () => {
    render(<ReadinessVisualizer percentage={0} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '0');
    expect(progress).toHaveAttribute(
      'data-indicator-class-name',
      expect.stringContaining('bg-red-500')
    );
  });

  it('should render progress bar with 10% (red)', () => {
    render(<ReadinessVisualizer percentage={10} />);

    expect(screen.getByText('10%')).toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '10');
    expect(progress).toHaveAttribute(
      'data-indicator-class-name',
      expect.stringContaining('bg-red-500')
    );
  });

  it('should render progress bar with 19% (red)', () => {
    render(<ReadinessVisualizer percentage={19} />);

    expect(screen.getByText('19%')).toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '19');
    expect(progress).toHaveAttribute(
      'data-indicator-class-name',
      expect.stringContaining('bg-red-500')
    );
  });

  it('should render progress bar with 20% (yellow)', () => {
    render(<ReadinessVisualizer percentage={20} />);

    expect(screen.getByText('20%')).toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '20');
    expect(progress).toHaveAttribute(
      'data-indicator-class-name',
      expect.stringContaining('bg-yellow-500')
    );
  });

  it('should render progress bar with 50% (yellow)', () => {
    render(<ReadinessVisualizer percentage={50} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '50');
    expect(progress).toHaveAttribute(
      'data-indicator-class-name',
      expect.stringContaining('bg-yellow-500')
    );
  });

  it('should render progress bar with 99% (yellow)', () => {
    render(<ReadinessVisualizer percentage={99} />);

    expect(screen.getByText('99%')).toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '99');
    expect(progress).toHaveAttribute(
      'data-indicator-class-name',
      expect.stringContaining('bg-yellow-500')
    );
  });

  it('should render progress bar with 100% (green)', () => {
    render(<ReadinessVisualizer percentage={100} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-value', '100');
    expect(progress).toHaveAttribute(
      'data-indicator-class-name',
      expect.stringContaining('bg-emerald-500')
    );
  });

  it('should not show label when showLabel is false', () => {
    render(<ReadinessVisualizer percentage={50} showLabel={false} />);

    expect(screen.queryByText('Group Readiness')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    const progress = screen.getByTestId('progress');
    expect(progress).toBeInTheDocument();
  });

  it('should show label by default', () => {
    render(<ReadinessVisualizer percentage={50} />);

    expect(screen.getByText('Group Readiness')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ReadinessVisualizer percentage={50} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should apply red text color for percentages below 20%', () => {
    render(<ReadinessVisualizer percentage={10} />);

    const percentageText = screen.getByText('10%');
    expect(percentageText).toHaveClass('text-red-500');
  });

  it('should apply yellow text color for percentages between 20 and 99', () => {
    render(<ReadinessVisualizer percentage={50} />);

    const percentageText = screen.getByText('50%');
    expect(percentageText).toHaveClass('text-yellow-600');
  });

  it('should apply green text color for 100%', () => {
    render(<ReadinessVisualizer percentage={100} />);

    const percentageText = screen.getByText('100%');
    expect(percentageText).toHaveClass('text-emerald-600');
  });
});
