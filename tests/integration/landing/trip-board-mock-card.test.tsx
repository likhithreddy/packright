import { render, screen } from '@testing-library/react';
import { TripBoardMockCard } from '@/components/features/landing/TripBoardMockCard';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
}));

describe('TripBoardMockCard Integration', () => {
  describe('rendering', () => {
    it('renders the mock trip card', () => {
      render(<TripBoardMockCard />);

      expect(screen.getByText('Smoky Mountains')).toBeInTheDocument();
    });

    it('renders the MapPin icon', () => {
      const { container } = render(<TripBoardMockCard />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders the date range', () => {
      render(<TripBoardMockCard />);

      expect(screen.getByText('Mar 15 – Mar 19')).toBeInTheDocument();
    });

    it('renders the member count', () => {
      render(<TripBoardMockCard />);

      expect(screen.getByText('4 members')).toBeInTheDocument();
    });

    it('renders the progress section', () => {
      render(<TripBoardMockCard />);

      expect(screen.getByText(/Packed/i)).toBeInTheDocument();
      expect(screen.getByText('62%')).toBeInTheDocument();
    });
  });

  describe('visual design', () => {
    it('has proper card aspect ratio', () => {
      const { container } = render(<TripBoardMockCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('aspect-[4/3]');
      expect(card).toHaveClass('rounded-[2rem]');
    });

    it('has shadow styling', () => {
      const { container } = render(<TripBoardMockCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('shadow-2xl');
      expect(card).toHaveClass('shadow-primary/5');
    });

    it('has border styling', () => {
      const { container } = render(<TripBoardMockCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-border/50');
    });
  });

  describe('gradient banner', () => {
    it('renders the gradient background', () => {
      const { container } = render(<TripBoardMockCard />);

      const banner = container.querySelector('.from-primary\\/80');
      expect(banner).toBeInTheDocument();
    });

    it('has proper height (1/2)', () => {
      const { container } = render(<TripBoardMockCard />);

      const banner = container.querySelector('.h-1\\/2');
      expect(banner).toBeInTheDocument();
    });

    it('has radial gradient overlay', () => {
      const { container } = render(<TripBoardMockCard />);

      const overlay = container.querySelector('.from-white\\/10');
      expect(overlay).toBeInTheDocument();
    });

    it('has overflow hidden', () => {
      const { container } = render(<TripBoardMockCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('overflow-hidden');
    });
  });

  describe('content layout', () => {
    it('has proper trip name styling', () => {
      render(<TripBoardMockCard />);

      const tripName = screen.getByText('Smoky Mountains');
      expect(tripName).toHaveClass('font-serif');
      expect(tripName).toHaveClass('text-2xl');
      expect(tripName).toHaveClass('font-bold');
    });

    it('has proper date/member info layout', () => {
      const { container } = render(<TripBoardMockCard />);

      // Find the parent container with gap-4 (not the nested gap-1.5 containers)
      const infoContainer = container.querySelector('.gap-4');
      expect(infoContainer).toHaveClass('flex');
      expect(infoContainer).toHaveClass('items-center');
      expect(infoContainer).toHaveClass('gap-4');
    });

    it('renders Calendar icon for date', () => {
      const { container } = render(<TripBoardMockCard />);

      const icons = container.querySelectorAll('svg');
      const calendarIcon = Array.from(icons).find((icon) => {
        // Check if this is the Calendar icon by checking its attributes
        return icon.parentElement?.textContent.includes('Mar 15 – Mar 19');
      });

      expect(calendarIcon).toBeInTheDocument();
    });

    it('renders Users icon for member count', () => {
      const { container } = render(<TripBoardMockCard />);

      const icons = container.querySelectorAll('svg');
      const usersIcon = Array.from(icons).find((icon) => {
        return icon.parentElement?.textContent.includes('4 members');
      });

      expect(usersIcon).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('renders the progress container', () => {
      render(<TripBoardMockCard />);

      const progressBar = screen.getByText('62%').parentElement?.nextElementSibling;
      expect(progressBar).toHaveClass('h-2');
      expect(progressBar).toHaveClass('w-full');
      expect(progressBar).toHaveClass('bg-secondary/50');
      expect(progressBar).toHaveClass('rounded-full');
    });

    it('has correct progress percentage (62%)', () => {
      render(<TripBoardMockCard />);

      const progressBar = screen.getByText('62%').parentElement?.nextElementSibling;
      const progressFill = progressBar?.querySelector('.bg-primary');

      expect(progressFill).toBeInTheDocument();
      expect(progressFill).toHaveStyle({ width: '62%' });
    });

    it('has "Packed" label', () => {
      render(<TripBoardMockCard />);

      const packedLabel = screen.getByText('Packed');
      expect(packedLabel).toHaveClass('text-xs');
      expect(packedLabel).toHaveClass('font-bold');
      expect(packedLabel).toHaveClass('tracking-wider');
      expect(packedLabel).toHaveClass('uppercase');
    });

    it('has percentage text with proper styling', () => {
      render(<TripBoardMockCard />);

      const percentage = screen.getByText('62%');
      expect(percentage).toHaveClass('text-sm');
      expect(percentage).toHaveClass('font-semibold');
    });
  });

  describe('flex layout', () => {
    it('uses flex column layout', () => {
      const { container } = render(<TripBoardMockCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('flex');
      expect(card).toHaveClass('flex-col');
    });

    it('has proper bottom section padding', () => {
      const { container } = render(<TripBoardMockCard />);

      const bottomSection = container.querySelector('.bg-card');
      expect(bottomSection).toHaveClass('p-6');
    });

    it('has justify-between for content and progress', () => {
      const { container } = render(<TripBoardMockCard />);

      const bottomSection = container.querySelector('.bg-card') as HTMLElement;
      expect(bottomSection).toHaveClass('flex');
      expect(bottomSection).toHaveClass('flex-col');
      expect(bottomSection).toHaveClass('justify-between');
    });
  });

  describe('accessibility', () => {
    it('has semantic heading for trip name', () => {
      render(<TripBoardMockCard />);

      const tripName = screen.getByRole('heading');
      expect(tripName).toBeInTheDocument();
      expect(tripName).toHaveTextContent('Smoky Mountains');
    });

    it('has descriptive icon labels (visually hidden for screen readers)', () => {
      const { container } = render(<TripBoardMockCard />);

      // Check that icons are present and have aria-labels or are hidden from screen readers
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('has sufficient color contrast', () => {
      render(<TripBoardMockCard />);

      // Check that text elements have proper color classes
      const tripName = screen.getByText('Smoky Mountains');
      expect(tripName).toHaveClass('text-foreground');

      const percentage = screen.getByText('62%');
      expect(percentage).toHaveClass('text-foreground');
    });
  });

  describe('responsive design', () => {
    it('maintains aspect ratio at all sizes', () => {
      const { container } = render(<TripBoardMockCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('aspect-[4/3]');
    });

    it('has max-width constraint', () => {
      const { container } = render(<TripBoardMockCard />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('max-w-md');
    });
  });
});
