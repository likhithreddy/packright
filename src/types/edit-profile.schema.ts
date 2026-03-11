import { z } from 'zod';

export const editProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  avatar_theme: z.string().min(1, 'Please select an avatar color'),
  packing_style: z.string().min(1, 'Please select a packing style'),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
