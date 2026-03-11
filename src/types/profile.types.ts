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
  { name: 'Deep Gold', value: '#C9922A' },
  { name: 'Neutral Gray', value: '#b3b3b3' },
  { name: 'Professional Blue', value: '#2E67A0' },
  { name: 'Soft Cyan', value: '#5AACCF' },
  { name: 'Light Blue', value: '#718699' },
  { name: 'Subtle Green', value: '#80C271' },
  { name: 'Warm Beige', value: '#e5c494' },
  { name: 'Subtle Red', value: '#f08080' },
  { name: 'Soft Purple', value: '#e78ac3' },
] as const;

export const PACKING_STYLES = [
  'Light Packer',
  'Regular Packer',
  'Heavy Packer',
  'Over Packer',
] as const;

export type PackingStyle = (typeof PACKING_STYLES)[number];
export type AvatarColor = (typeof AVATAR_COLORS)[number]['value'];
