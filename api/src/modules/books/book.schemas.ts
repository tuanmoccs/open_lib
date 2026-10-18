import { z } from 'zod';

export const workIdSchema = z
  .string()
  .regex(/^OL\d+W$/, 'Must be an Open Library work id such as OL27482W');

export const searchQuerySchema = z.object({
  q: z
    .string({ error: 'Search keyword is required' })
    .trim()
    .min(1, 'Search keyword is required')
    .max(200, 'Search keyword must be at most 200 characters'),
  page: z.coerce
    .number({ error: 'Page must be a number' })
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(100, 'Page must be at most 100')
    .default(1),
});

export const workParamsSchema = z.object({ workId: workIdSchema });

export const coverParamsSchema = z.object({
  coverId: z.coerce
    .number({ error: 'Cover id must be a number' })
    .int('Cover id must be an integer')
    .positive('Cover id must be positive'),
});

export const coverQuerySchema = z.object({
  size: z.enum(['S', 'M', 'L'], { error: 'Size must be one of S, M, L' }).default('M'),
});
