import { render } from '@testing-library/react';
import { getCategoryIcon, CATEGORY_ICONS } from '@/lib/utils/category-icons';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Package: function PackageIcon() {
    return <div data-testid="package-icon">Package</div>;
  },
  Shirt: function ShirtIcon() {
    return <div data-testid="shirt-icon">Shirt</div>;
  },
  Utensils: function UtensilsIcon() {
    return <div data-testid="utensils-icon">Utensils</div>;
  },
  HeartPulse: function HeartPulseIcon() {
    return <div data-testid="heartpulse-icon">HeartPulse</div>;
  },
  Laptop: function LaptopIcon() {
    return <div data-testid="laptop-icon">Laptop</div>;
  },
  Book: function BookIcon() {
    return <div data-testid="book-icon">Book</div>;
  },
  Dumbbell: function DumbbellIcon() {
    return <div data-testid="dumbbell-icon">Dumbbell</div>;
  },
  Plane: function PlaneIcon() {
    return <div data-testid="plane-icon">Plane</div>;
  },
  Zap: function ZapIcon() {
    return <div data-testid="zap-icon">Zap</div>;
  },
  Home: function HomeIcon() {
    return <div data-testid="home-icon">Home</div>;
  },
  Wrench: function WrenchIcon() {
    return <div data-testid="wrench-icon">Wrench</div>;
  },
}));

describe('getCategoryIcon', () => {
  describe('Known Categories', () => {
    it('returns Package icon for Essentials category', () => {
      const Icon = getCategoryIcon('Essentials');
      expect(Icon).toBeDefined();
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="package-icon"]')).toBeInTheDocument();
    });

    it('returns Shirt icon for Clothing category', () => {
      const Icon = getCategoryIcon('Clothing');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="shirt-icon"]')).toBeInTheDocument();
    });

    it('returns Utensils icon for Food category', () => {
      const Icon = getCategoryIcon('Food');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="utensils-icon"]')).toBeInTheDocument();
    });

    it('returns HeartPulse icon for Health category', () => {
      const Icon = getCategoryIcon('Health');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="heartpulse-icon"]')).toBeInTheDocument();
    });

    it('returns Laptop icon for Electronics category', () => {
      const Icon = getCategoryIcon('Electronics');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="laptop-icon"]')).toBeInTheDocument();
    });

    it('returns Book icon for Documents category', () => {
      const Icon = getCategoryIcon('Documents');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="book-icon"]')).toBeInTheDocument();
    });

    it('returns Dumbbell icon for Fitness category', () => {
      const Icon = getCategoryIcon('Fitness');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="dumbbell-icon"]')).toBeInTheDocument();
    });

    it('returns Plane icon for Travel category', () => {
      const Icon = getCategoryIcon('Travel');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="plane-icon"]')).toBeInTheDocument();
    });

    it('returns Zap icon for Toiletries category', () => {
      const Icon = getCategoryIcon('Toiletries');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="zap-icon"]')).toBeInTheDocument();
    });

    it('returns Wrench icon for Gear category', () => {
      const Icon = getCategoryIcon('Gear');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="wrench-icon"]')).toBeInTheDocument();
    });

    it('returns Home icon for Misc category', () => {
      const Icon = getCategoryIcon('Misc');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="home-icon"]')).toBeInTheDocument();
    });
  });

  describe('Unknown Categories', () => {
    it('returns Package icon (default) for unknown category', () => {
      const Icon = getCategoryIcon('UnknownCategory');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="package-icon"]')).toBeInTheDocument();
    });

    it('returns Package icon for empty string category', () => {
      const Icon = getCategoryIcon('');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="package-icon"]')).toBeInTheDocument();
    });

    it('returns Package icon for case-sensitive mismatch', () => {
      const Icon = getCategoryIcon('essentials'); // lowercase
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="package-icon"]')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in category name', () => {
      const Icon = getCategoryIcon('Food & Drink');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="package-icon"]')).toBeInTheDocument();
    });

    it('handles very long category names', () => {
      const longCategory = 'A'.repeat(100);
      const Icon = getCategoryIcon(longCategory);
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="package-icon"]')).toBeInTheDocument();
    });

    it('handles category with numbers', () => {
      const Icon = getCategoryIcon('Category123');
      const { container } = render(<Icon />);
      expect(container.querySelector('[data-testid="package-icon"]')).toBeInTheDocument();
    });
  });
});

describe('CATEGORY_ICONS constant', () => {
  it('contains all expected category mappings', () => {
    expect(CATEGORY_ICONS).toBeDefined();
    expect(typeof CATEGORY_ICONS).toBe('object');
  });

  it('has correct number of categories', () => {
    const categories = Object.keys(CATEGORY_ICONS);
    expect(categories.length).toBe(11);
  });

  it('includes Essentials key', () => {
    expect(CATEGORY_ICONS.Essentials).toBeDefined();
  });

  it('includes Clothing key', () => {
    expect(CATEGORY_ICONS.Clothing).toBeDefined();
  });

  it('includes Food key', () => {
    expect(CATEGORY_ICONS.Food).toBeDefined();
  });

  it('includes Health key', () => {
    expect(CATEGORY_ICONS.Health).toBeDefined();
  });

  it('includes Electronics key', () => {
    expect(CATEGORY_ICONS.Electronics).toBeDefined();
  });

  it('includes Documents key', () => {
    expect(CATEGORY_ICONS.Documents).toBeDefined();
  });

  it('includes Fitness key', () => {
    expect(CATEGORY_ICONS.Fitness).toBeDefined();
  });

  it('includes Travel key', () => {
    expect(CATEGORY_ICONS.Travel).toBeDefined();
  });

  it('includes Toiletries key', () => {
    expect(CATEGORY_ICONS.Toiletries).toBeDefined();
  });

  it('includes Gear key', () => {
    expect(CATEGORY_ICONS.Gear).toBeDefined();
  });

  it('includes Misc key', () => {
    expect(CATEGORY_ICONS.Misc).toBeDefined();
  });
});
