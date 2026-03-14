import {
  Package,
  Shirt,
  Utensils,
  HeartPulse,
  Laptop,
  Book,
  Dumbbell,
  Plane,
  Zap,
  Home,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Essentials: Package,
  Clothing: Shirt,
  Food: Utensils,
  Health: HeartPulse,
  Electronics: Laptop,
  Documents: Book,
  Fitness: Dumbbell,
  Travel: Plane,
  Toiletries: Zap,
  Gear: Wrench,
  Misc: Home,
};

export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] || Package;
}
