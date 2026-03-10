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
  { name: 'Warm Brown', value: '#8B6914' },
  { name: 'Forest Green', value: '#2D5A27' },
  { name: 'Earthy Red', value: '#A0522D' },
  { name: 'Deep Teal', value: '#1A5C5C' },
  { name: 'Slate Blue', value: '#4A6C8C' },
  { name: 'Burnt Orange', value: '#CC5500' },
  { name: 'Moss', value: '#6B8E23' },
  { name: 'Plum', value: '#6D3A5C' },
] as const;

export const PACKING_STYLES = [
  'Light Packer',
  'Regular Packer',
  'Heavy Packer',
  'Over Packer',
] as const;

export type PackingStyle = (typeof PACKING_STYLES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number]['value'];
