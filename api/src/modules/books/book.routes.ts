import { Router } from 'express';
import { notFound } from '../../lib/errors';
import {
  coverParamsSchema,
  coverQuerySchema,
  searchQuerySchema,
  workParamsSchema,
} from './book.schemas';
import type { BookService, OpenLibraryGateway } from './book.service';

const COVER_CACHE_SECONDS = 7 * 24 * 60 * 60;

export function bookRoutes(books: BookService) {
  const router = Router();

  router.get('/search', async (req, res) => {
    const { q, page } = searchQuerySchema.parse(req.query);
    res.json(await books.search(q, page));
  });

  router.get('/:workId', async (req, res) => {
    const { workId } = workParamsSchema.parse(req.params);
    res.json(await books.getDetail(workId));
  });

  return router;
}

/** Cover images are proxied as well: the browser never talks to Open Library directly. */
export function coverRoutes(openLibrary: OpenLibraryGateway) {
  const router = Router();

  router.get('/:coverId', async (req, res) => {
    const { coverId } = coverParamsSchema.parse(req.params);
    const { size } = coverQuerySchema.parse(req.query);
    const image = await openLibrary.getCover(coverId, size);
    if (!image) throw notFound(`Cover ${coverId} was not found`);

    res
      .set('Content-Type', image.contentType)
      .set('Cache-Control', `public, max-age=${COVER_CACHE_SECONDS}, immutable`)
      .send(image.body);
  });

  return router;
}
