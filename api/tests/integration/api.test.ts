import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app';
import { BookService, type OpenLibraryGateway } from '../../src/modules/books/book.service';
import { ShelfService } from '../../src/modules/shelf/shelf.service';
import { InMemoryShelfRepository } from '../helpers/in-memory-shelf.repository';
import { silentLogger } from '../helpers/logger';

const NOW = new Date('2026-10-13T08:00:00Z');

function createOpenLibraryFake(): OpenLibraryGateway {
  return {
    search: vi.fn(async () => ({
      total: 45,
      docs: [
        { key: '/works/OL1W', title: 'Test Book', author_name: ['Jane Doe'], cover_i: 11 },
        { key: '/works/OL2W', title: 'Another Book', number_of_pages_median: 120 },
      ],
    })),
    getWork: vi.fn(async (workId: string) =>
      workId === 'OL404W'
        ? null
        : {
            key: `/works/${workId}`,
            title: 'Test Book',
            description: { value: 'A description' },
            subjects: ['Fiction'],
          },
    ),
    getWorkSummary: vi.fn(async (workId: string) => ({
      key: `/works/${workId}`,
      title: 'Test Book',
      author_name: ['Jane Doe'],
      first_publish_year: 2001,
      number_of_pages_median: workId === 'OL9W' ? undefined : 200,
    })),
    getCover: vi.fn(async (coverId: number) =>
      coverId === 11 ? { body: Buffer.from('jpg'), contentType: 'image/jpeg' } : null,
    ),
  };
}

function setup() {
  const openLibrary = createOpenLibraryFake();
  const repository = new InMemoryShelfRepository();
  const bookService = new BookService(openLibrary, repository);
  const shelfService = new ShelfService(repository, bookService, () => NOW);
  const app = createApp({
    logger: silentLogger,
    corsOrigins: [],
    trustProxy: 0,
    rateLimitPerMinute: 1000,
    healthCheck: async () => {},
    openLibrary,
    bookService,
    shelfService,
  });
  return { app, openLibrary };
}

let app: ReturnType<typeof setup>['app'];

beforeEach(() => {
  ({ app } = setup());
});

const addBook = (body: object) => request(app).post('/api/shelf').send(body);

describe('error format', () => {
  it('returns a uniform 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /api/unknown does not exist' },
    });
  });

  it('returns field details for validation errors', async () => {
    const res = await request(app).get('/api/books/search');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'q', message: 'Search keyword is required' }]);
  });
});

describe('GET /api/books/search', () => {
  it('maps results, paginates and flags books already on the shelf', async () => {
    await addBook({ workId: 'OL1W' });
    const res = await request(app).get('/api/books/search').query({ q: 'test', page: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, limit: 20, total: 45, totalPages: 3 });
    expect(res.body.items).toEqual([
      {
        workId: 'OL1W',
        title: 'Test Book',
        authors: ['Jane Doe'],
        coverId: 11,
        firstPublishYear: null,
        numberOfPages: null,
        inShelf: true,
      },
      expect.objectContaining({ workId: 'OL2W', numberOfPages: 120, inShelf: false }),
    ]);
  });
});

describe('GET /api/books/:workId', () => {
  it('returns the combined detail', async () => {
    const res = await request(app).get('/api/books/OL1W');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      workId: 'OL1W',
      description: 'A description',
      subjects: ['Fiction'],
      numberOfPages: 200,
      firstPublishYear: 2001,
      shelfEntry: null,
    });
  });

  it('returns 404 for unknown works', async () => {
    const res = await request(app).get('/api/books/OL404W');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/covers/:coverId', () => {
  it('proxies the image with cache headers', async () => {
    const res = await request(app).get('/api/covers/11');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toContain('max-age');
  });

  it('returns 404 when the cover does not exist', async () => {
    expect((await request(app).get('/api/covers/12')).status).toBe(404);
  });
});

describe('shelf', () => {
  it('adds a book with the chosen initial status', async () => {
    const res = await addBook({ workId: 'OL1W', status: 'reading' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      workId: 'OL1W',
      status: 'reading',
      currentPage: 0,
      totalPages: 200,
      progress: 0,
      startedAt: NOW.toISOString(),
      finishedAt: null,
    });
  });

  it('rejects duplicates with 409 Conflict', async () => {
    await addBook({ workId: 'OL1W' });
    const res = await addBook({ workId: 'OL1W' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('accepts a manual page count when Open Library has none', async () => {
    const res = await addBook({ workId: 'OL9W', totalPages: 150 });
    expect(res.body.totalPages).toBe(150);
  });

  it('auto-completes the book on the last page', async () => {
    const { body } = await addBook({ workId: 'OL1W', status: 'reading' });
    const res = await request(app).patch(`/api/shelf/${body.id}`).send({ currentPage: 200 });
    expect(res.body).toMatchObject({
      status: 'read',
      progress: 100,
      finishedAt: NOW.toISOString(),
    });
  });

  it('rejects a page above the total', async () => {
    const { body } = await addBook({ workId: 'OL1W' });
    const res = await request(app).patch(`/api/shelf/${body.id}`).send({ currentPage: 201 });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('currentPage');
  });

  it('rejects negative pages and out-of-range ratings', async () => {
    const { body } = await addBook({ workId: 'OL1W' });
    const res = await request(app)
      .patch(`/api/shelf/${body.id}`)
      .send({ currentPage: -1, rating: 6 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual([
      'currentPage',
      'rating',
    ]);
  });

  it('sets and clears rating and note', async () => {
    const { body } = await addBook({ workId: 'OL1W' });
    const rated = await request(app)
      .patch(`/api/shelf/${body.id}`)
      .send({ rating: 4, note: '  Nice  ' });
    expect(rated.body).toMatchObject({ rating: 4, note: 'Nice' });

    const cleared = await request(app)
      .patch(`/api/shelf/${body.id}`)
      .send({ rating: null, note: '' });
    expect(cleared.body).toMatchObject({ rating: null, note: null });
  });

  it('filters by status and reports stats', async () => {
    await addBook({ workId: 'OL1W', status: 'reading' });
    await addBook({ workId: 'OL2W', status: 'read' });
    await addBook({ workId: 'OL3W' });

    const reading = await request(app).get('/api/shelf').query({ status: 'reading' });
    expect(reading.body.items.map((e: { workId: string }) => e.workId)).toEqual(['OL1W']);

    const stats = await request(app).get('/api/shelf/stats');
    expect(stats.body).toEqual({ total: 3, want_to_read: 1, reading: 1, read: 1 });
  });

  it('deletes an entry and returns 404 afterwards', async () => {
    const { body } = await addBook({ workId: 'OL1W' });
    expect((await request(app).delete(`/api/shelf/${body.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/shelf/${body.id}`)).status).toBe(404);
  });
});
