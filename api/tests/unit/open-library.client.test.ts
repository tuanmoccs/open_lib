import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/lib/errors';
import { OpenLibraryClient } from '../../src/modules/open-library/open-library.client';
import { silentLogger } from '../helpers/logger';

function createClient(fetchImpl: typeof fetch) {
  return new OpenLibraryClient({
    baseUrl: 'https://openlibrary.test',
    coversUrl: 'https://covers.openlibrary.test',
    timeoutMs: 1000,
    userAgent: 'test-agent',
    logger: silentLogger,
    fetchImpl,
  });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('OpenLibraryClient', () => {
  it('sends query, page, limit and field list to search.json', async () => {
    const fetchImpl = vi.fn(async (_input: string | URL | Request) =>
      json({ numFound: 1, docs: [{ key: '/works/OL1W' }] }),
    );
    const result = await createClient(fetchImpl as typeof fetch).search('dune', 2, 20);

    expect(result).toEqual({ total: 1, docs: [{ key: '/works/OL1W' }] });
    const url = new URL(String(fetchImpl.mock.calls[0]![0]));
    expect(url.pathname).toBe('/search.json');
    expect(url.searchParams.get('q')).toBe('dune');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('fields')).toContain('cover_i');
  });

  it('caches identical requests', async () => {
    const fetchImpl = vi.fn(async () => json({ numFound: 0, docs: [] }));
    const client = createClient(fetchImpl);
    await client.search('dune', 1, 20);
    await client.search('dune', 1, 20);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns null when the work does not exist', async () => {
    const fetchImpl = vi.fn(async () => new Response('not found', { status: 404 }));
    await expect(createClient(fetchImpl).getWork('OL1W')).resolves.toBeNull();
  });

  it('follows redirect records of merged works', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) =>
      String(input).includes('OL1W')
        ? json({ key: '/works/OL1W', type: { key: '/type/redirect' }, location: '/works/OL2W' })
        : json({ key: '/works/OL2W', title: 'Target' }),
    );
    const work = await createClient(fetchImpl as typeof fetch).getWork('OL1W');
    expect(work?.title).toBe('Target');
  });

  it('retries on 5xx and succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(json({ key: '/works/OL1W', title: 'Dune' }));
    const work = await createClient(fetchImpl).getWork('OL1W');
    expect(work?.title).toBe('Dune');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws UPSTREAM_ERROR after the retries are exhausted', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const error = await createClient(fetchImpl)
      .getWork('OL1W')
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('UPSTREAM_ERROR');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
