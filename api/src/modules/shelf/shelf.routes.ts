import { Router } from 'express';
import {
  addToShelfSchema,
  listShelfQuerySchema,
  shelfIdParamsSchema,
  updateShelfEntrySchema,
} from './shelf.schemas';
import type { ShelfService } from './shelf.service';

export function shelfRoutes(shelf: ShelfService) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { status } = listShelfQuerySchema.parse(req.query);
    res.json({ items: await shelf.list(status) });
  });

  router.get('/stats', async (_req, res) => {
    res.json(await shelf.stats());
  });

  router.post('/', async (req, res) => {
    const input = addToShelfSchema.parse(req.body ?? {});
    res.status(201).json(await shelf.add(input));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = shelfIdParamsSchema.parse(req.params);
    const input = updateShelfEntrySchema.parse(req.body ?? {});
    res.json(await shelf.update(id, input));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = shelfIdParamsSchema.parse(req.params);
    await shelf.remove(id);
    res.status(204).end();
  });

  return router;
}
