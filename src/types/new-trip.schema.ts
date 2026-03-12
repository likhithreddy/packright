import { z } from 'zod';

export const aiItemSchema = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  category: z.string().optional(),
});

export type AIItem = z.infer<typeof aiItemSchema>;

export const newTripSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long.'),
  destination: z.string().min(2, 'Destination must be at least 2 characters long.'),
  dateRange: z
    .object({
      from: z.date(),
      to: z.date(),
    })
    .refine((data) => data.from <= data.to, {
      message: 'End date cannot be before start date.',
      path: ['to'],
    }),
  aiPrompt: z.string().optional(),
  items: z.array(z.union([z.string(), aiItemSchema])).optional(),
});

export type NewTripInput = z.infer<typeof newTripSchema>;
