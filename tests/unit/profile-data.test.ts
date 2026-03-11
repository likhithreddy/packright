import { AVATAR_COLORS, PACKING_STYLES } from '@/types/profile.types';

describe('Profile Data Constants', () => {
  it('has a valid set of avatar colors', () => {
    expect(AVATAR_COLORS.length).toBeGreaterThan(0);
    AVATAR_COLORS.forEach((color) => {
      expect(color.name).toBeDefined();
      expect(color.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('has a valid set of packing styles', () => {
    expect(PACKING_STYLES.length).toBeGreaterThan(0);
    expect(PACKING_STYLES).toContain('Regular Packer');
  });
});
