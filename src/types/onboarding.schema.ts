import { z } from 'zod';

export const onboardingSchema = z.object({
    full_name: z
        .string()
        .min(3, 'Full name must be at least 3 characters')
        .max(50, 'Name must be at most 50 characters'),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    avatar_theme: z.string().min(1, 'Please select an avatar color'),
    packing_style: z.string().min(1, 'Please select a packing style'),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
