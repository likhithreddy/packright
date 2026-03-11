export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_theme: string | null;
  packing_style: string | null;
  created_at: string;
  updated_at: string;
}

export const AVATAR_COLORS = [
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Slate', value: '#475569' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Amber', value: '#D97706' },
  { name: 'Rose', value: '#E11D48' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Gray', value: '#4B5563' },
  { name: 'Violet', value: '#7C3AED' },
] as const;

export const PACKING_STYLES = [
  'Light Packer',
  'Regular Packer',
  'Heavy Packer',
  'Over Packer',
] as const;

export type PackingStyle = (typeof PACKING_STYLES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number]['value'];
