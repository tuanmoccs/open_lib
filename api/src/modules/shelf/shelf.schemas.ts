import { z } from 'zod';
import { workIdSchema } from '../books/book.schemas';
import { SHELF_STATUSES } from './shelf.rules';

export const MAX_PAGES = 100_000;
export const MAX_NOTE_LENGTH = 500;

const statusSchema = z.enum(SHELF_STATUSES, {
  error: `Status must be one of: ${SHELF_STATUSES.join(', ')}`,
});

const totalPagesSchema = z
  .number({ error: 'Total pages must be a number' })
  .int('Total pages must be an integer')
  .min(1, 'Total pages must be at least 1')
  .max(MAX_PAGES, `Total pages must be at most ${MAX_PAGES}`);

export const shelfIdParamsSchema = z.object({
  id: z.coerce
    .number({ error: 'Id must be a number' })
    .int('Id must be an integer')
    .positive('Id must be positive'),
});

export const listShelfQuerySchema = z.object({
  status: statusSchema.optional(),
});

export const addToShelfSchema = z.strictObject({
  workId: workIdSchema,
  status: statusSchema.default('want_to_read'),
  // Only needed when Open Library does not know the page count.
  totalPages: totalPagesSchema.optional(),
});

export const updateShelfEntrySchema = z
  .strictObject({
    status: statusSchema.optional(),
    currentPage: z
      .number({ error: 'Current page must be a number' })
      .int('Current page must be an integer')
      .min(0, 'Current page must be at least 0')
      .max(MAX_PAGES, `Current page must be at most ${MAX_PAGES}`)
      .optional(),
    totalPages: totalPagesSchema.optional(),
    rating: z
      .number({ error: 'Rating must be a number' })
      .int('Rating must be a whole number')
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5')
      .nullable()
      .optional(),
    note: z
      .string({ error: 'Note must be a string' })
      .trim()
      .max(MAX_NOTE_LENGTH, `Note must be at most ${MAX_NOTE_LENGTH} characters`)
      .nullable()
      .optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'At least one field must be provided',
  });

export type AddToShelfInput = z.infer<typeof addToShelfSchema>;
export type UpdateShelfEntryInput = z.infer<typeof updateShelfEntrySchema>;
