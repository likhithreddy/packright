import { render, screen } from '@testing-library/react';
import { FeatureCard } from '@/components/features/landing/FeatureCard';
import { Package } from 'lucide-react';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
}));

describe('FeatureCard Integration', () => {
  const defaultProps = {
    icon: Package,
    title: 'Test Feature',
    description: 'This is a test feature description.',
  };

  describe('rendering', () => {
    it('renders the feature card with all elements', () => {
      render(<FeatureCard {...defaultProps} />);

      expect(screen.getByText('Test Feature')).toBeInTheDocument();
      expect(screen.getByText('This is a test feature description.')).toBeInTheDocument();
    });

    it('renders the icon container', () => {
      const { container } = render(<FeatureCard {...defaultProps} />);

      const iconContainer = container.querySelector('.bg-primary\\/10');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).toHaveClass('text-primary');
    });

    it('renders the icon itself', () => {
      const { container } = render(<FeatureCard {...defaultProps} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has proper card styling', () => {
      const { container } = render(<FeatureCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('shadow-sm');
      expect(card).toHaveClass('border');
    });

    it('has responsive rounded corners', () => {
      const { container } = render(<FeatureCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('sm:rounded-2xl');
    });

    it('has hover effect', () => {
      const { container } = render(<FeatureCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('hover:border-border/80');
    });

    it('has proper icon container sizing', () => {
      const { container } = render(<FeatureCard {...defaultProps} />);

      const iconContainer = container.querySelector('.bg-primary\\/10');
      expect(iconContainer).toHaveClass('h-8');
      expect(iconContainer).toHaveClass('w-8');
      expect(iconContainer).toHaveClass('sm:h-10');
      expect(iconContainer).toHaveClass('sm:w-10');
    });
  });

  describe('content display', () => {
    it('displays the title correctly', () => {
      render(<FeatureCard {...defaultProps} />);

      const title = screen.getByText('Test Feature');
      expect(title).toHaveClass('text-secondary-foreground');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('text-base');
      expect(title).toHaveClass('sm:text-lg');
    });

    it('displays the description correctly', () => {
      render(<FeatureCard {...defaultProps} />);

      const description = screen.getByText('This is a test feature description.');
      expect(description).toHaveClass('text-muted-foreground');
      expect(description).toHaveClass('text-xs');
      expect(description).toHaveClass('sm:text-sm');
    });

    it('handles long descriptions', () => {
      const longDescription =
        'This is a very long feature description that should wrap properly and display in multiple lines without breaking the card layout or causing overflow issues.';

      render(<FeatureCard {...defaultProps} description={longDescription} />);

      const description = screen.getByText(longDescription);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('leading-relaxed');
    });
  });

  describe('layout', () => {
    it('has proper flex layout', () => {
      const { container } = render(<FeatureCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('flex');
      expect(card).toHaveClass('flex-col');
      expect(card).toHaveClass('gap-2');
    });

    it('has proper padding', () => {
      const { container } = render(<FeatureCard {...defaultProps} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('p-4');
      expect(card).toHaveClass('sm:p-5');
      expect(card).toHaveClass('lg:p-6');
    });
  });

  describe('different icons', () => {
    it('renders correctly with Package icon', () => {
      const { container } = render(<FeatureCard {...defaultProps} icon={Package} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders correctly with CheckCircle icon', () => {
      const { CheckCircle } = require('lucide-react');
      const { container } = render(<FeatureCard {...defaultProps} icon={CheckCircle} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders correctly with Users icon', () => {
      const { Users } = require('lucide-react');
      const { container } = render(<FeatureCard {...defaultProps} icon={Users} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty title', () => {
      render(<FeatureCard {...defaultProps} title="" />);

      const title = screen.getByRole('heading');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('');
    });

    it('handles empty description', () => {
      const { container } = render(<FeatureCard {...defaultProps} description="" />);

      const description = container.querySelector('p');
      expect(description).toBeInTheDocument();
      expect(description).toHaveTextContent('');
    });

    it('handles very long title', () => {
      const longTitle =
        'This is an extremely long feature title that should still display properly within the card layout without causing any overflow or alignment issues.';

      render(<FeatureCard {...defaultProps} title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has semantic heading structure', () => {
      render(<FeatureCard {...defaultProps} />);

      const title = screen.getByRole('heading');
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent('Test Feature');
    });

    it('has proper color contrast', () => {
      render(<FeatureCard {...defaultProps} />);

      const title = screen.getByText('Test Feature');
      expect(title).toHaveClass('text-secondary-foreground');

      const description = screen.getByText('This is a test feature description.');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });
});
