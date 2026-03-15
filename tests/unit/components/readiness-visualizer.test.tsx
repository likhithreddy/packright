import { render, screen } from '@testing-library/react';
import { ReadinessVisualizer } from '@/components/features/readiness-visualizer';

// Mock the Progress component
jest.mock('@/components/ui/progress', () => ({
  Progress: ({
    value,
    'aria-label': ariaLabel,
    'aria-valuetext': ariaValuetext,
    className,
    indicatorClassName,
  }: {
    value?: number;
    'aria-label'?: string;
    'aria-valuetext'?: string;
    className?: string;
    indicatorClassName?: string;
  }) => (
    <div
      data-testid="progress-bar"
      data-value={value}
      data-aria-label={ariaLabel}
      data-aria-valuetext={ariaValuetext}
      data-progress-class={className}
      data-indicator-class={indicatorClassName}
    />
  ),
}));

describe('ReadinessVisualizer', () => {
  describe('null percentage', () => {
    it('returns null when percentage is null', () => {
      const { container } = render(<ReadinessVisualizer percentage={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('red threshold (< 20%)', () => {
    it('displays red progress bar for 0%', () => {
      render(<ReadinessVisualizer percentage={0} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-value', '0');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-red-500')
      );
    });

    it('displays red progress bar for 10%', () => {
      render(<ReadinessVisualizer percentage={10} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-red-500')
      );
    });

    it('displays red progress bar for 19%', () => {
      render(<ReadinessVisualizer percentage={19} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-red-500')
      );
    });

    it('displays red percentage text', () => {
      render(<ReadinessVisualizer percentage={15} />);
      expect(screen.getByText('15%')).toHaveClass('text-red-500');
    });
  });

  describe('yellow threshold (20-99%)', () => {
    it('displays yellow progress bar for 20%', () => {
      render(<ReadinessVisualizer percentage={20} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-yellow-500')
      );
    });

    it('displays yellow progress bar for 50%', () => {
      render(<ReadinessVisualizer percentage={50} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-yellow-500')
      );
    });

    it('displays yellow progress bar for 99%', () => {
      render(<ReadinessVisualizer percentage={99} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-yellow-500')
      );
    });

    it('displays yellow percentage text', () => {
      render(<ReadinessVisualizer percentage={75} />);
      expect(screen.getByText('75%')).toHaveClass('text-yellow-600');
    });
  });

  describe('green threshold (100%)', () => {
    it('displays green progress bar for 100%', () => {
      render(<ReadinessVisualizer percentage={100} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-emerald-500')
      );
    });

    it('displays green percentage text', () => {
      render(<ReadinessVisualizer percentage={100} />);
      expect(screen.getByText('100%')).toHaveClass('text-emerald-600');
    });
  });

  describe('label visibility', () => {
    it('shows label by default', () => {
      render(<ReadinessVisualizer percentage={50} />);
      expect(screen.getByText('Group Readiness')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('hides label when showLabel is false', () => {
      render(<ReadinessVisualizer percentage={50} showLabel={false} />);
      expect(screen.queryByText('Group Readiness')).not.toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('shows label when showLabel is true', () => {
      render(<ReadinessVisualizer percentage={50} showLabel={true} />);
      expect(screen.getByText('Group Readiness')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('sets aria-label on progress bar', () => {
      render(<ReadinessVisualizer percentage={50} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-aria-label', 'Group packing readiness');
    });

    it('sets aria-valuetext with percentage', () => {
      render(<ReadinessVisualizer percentage={50} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute('data-aria-valuetext', '50% packed');
    });
  });

  describe('custom className', () => {
    it('applies custom className to wrapper', () => {
      const { container } = render(
        <ReadinessVisualizer percentage={50} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('boundary conditions', () => {
    it('handles percentage at exactly 20 (yellow threshold)', () => {
      render(<ReadinessVisualizer percentage={20} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-yellow-500')
      );
    });

    it('handles percentage at exactly 100 (green threshold)', () => {
      render(<ReadinessVisualizer percentage={100} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-emerald-500')
      );
    });

    it('handles percentage at exactly 19 (red threshold)', () => {
      render(<ReadinessVisualizer percentage={19} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveAttribute(
        'data-indicator-class',
        expect.stringContaining('bg-red-500')
      );
    });
  });
});
