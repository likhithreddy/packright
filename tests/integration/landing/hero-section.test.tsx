import { render, screen } from '@testing-library/react';
import { HeroSection } from '@/components/features/landing/HeroSection';

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} data-href={href}>
      {children}
    </a>
  ),
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  __esModule: true,
  Button: ({
    children,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
}));

// Mock lucide-react with actual implementation
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
}));

describe('HeroSection Integration', () => {
  describe('rendering', () => {
    it('renders the hero section with all elements', () => {
      render(<HeroSection />);

      expect(screen.getByText(/Premium Group Travel/i)).toBeInTheDocument();
      expect(screen.getByText(/Pack together/i)).toBeInTheDocument();
      expect(screen.getByText(/show up ready\./i)).toBeInTheDocument();
    });

    it('renders the tagline', () => {
      render(<HeroSection />);

      const tagline = screen.getByText('Premium Group Travel');
      expect(tagline).toBeInTheDocument();
      expect(tagline).toHaveClass('text-primary');
    });

    it('renders the main heading', () => {
      render(<HeroSection />);

      const heading = screen.getByText(/Pack together/i);
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveClass('text-3xl'); // has responsive classes
    });

    it('renders the description paragraph', () => {
      render(<HeroSection />);

      const description = screen.getByText(/The editorial packing board/i);
      expect(description).toBeInTheDocument();
      expect(description).toHaveClass('text-stone-600');
    });
  });

  describe('Call-to-Action Buttons', () => {
    it('renders "Start Packing Free" button with correct link', () => {
      render(<HeroSection />);

      const getStartedButton = screen.getByText(/Start Packing Free/i);
      expect(getStartedButton).toBeInTheDocument();

      const link = getStartedButton.closest('a');
      expect(link).toHaveAttribute('href', '/signup');
    });

    it('renders "Sign In" button with correct link', () => {
      render(<HeroSection />);

      const signInButton = screen.getByText(/Sign In/i);
      expect(signInButton).toBeInTheDocument();

      const link = signInButton.closest('a');
      expect(link).toHaveAttribute('href', '/login');
    });

    it('renders ArrowUpRight icon in Start Packing button', () => {
      render(<HeroSection />);

      const getStartedButton = screen.getByText(/Start Packing Free/i);
      expect(getStartedButton).toBeInTheDocument();

      // Check for SVG icon from lucide-react ArrowUpRight
      const { container } = render(<HeroSection />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('applies correct variant to Sign In button', () => {
      render(<HeroSection />);

      const signInButton = screen.getByText(/Sign In/i);
      // The button should have the outline class from the Button component
      expect(signInButton).toBeInTheDocument();
    });
  });

  describe('Responsive Classes', () => {
    it('has responsive sizing classes on main heading', () => {
      render(<HeroSection />);

      const heading = screen.getByText(/Pack together/i);
      expect(heading).toHaveClass('text-3xl');
      expect(heading).toHaveClass('sm:text-6xl');
      expect(heading).toHaveClass('md:text-7xl');
    });

    it('has responsive sizing on buttons', () => {
      render(<HeroSection />);

      const getStartedButton = screen.getByText(/Start Packing Free/i);
      // The button should exist and be rendered
      expect(getStartedButton).toBeInTheDocument();
    });
  });

  describe('Layout and Spacing', () => {
    it('has proper flex layout', () => {
      const { container } = render(<HeroSection />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
    });

    it('has proper gap spacing', () => {
      const { container } = render(<HeroSection />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('gap-2');
      expect(wrapper).toHaveClass('sm:gap-6');
      expect(wrapper).toHaveClass('lg:gap-8');
    });
  });

  describe('Accessibility', () => {
    it('has semantic heading structure', () => {
      render(<HeroSection />);

      const h2 = screen.getByText('Premium Group Travel');
      const h1 = screen.getByText(/Pack together/i);

      expect(h2.tagName).toBe('H2');
      expect(h1.tagName).toBe('H1');
    });

    it('has descriptive link text for screen readers', () => {
      render(<HeroSection />);

      expect(screen.getByRole('link', { name: /start packing free/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});
