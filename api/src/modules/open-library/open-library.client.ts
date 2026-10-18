import { LRUCache } from 'lru-cache';
import { upstreamError } from '../../lib/errors';
import type { Logger } from '../../lib/logger';
import type {
  CoverImage,
  CoverSize,
  OlSearchDoc,
  OlSearchResponse,
  OlWork,
} from './open-library.types';

const SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'cover_i',
  'number_of_pages_median',
].join(',');

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;
const WORK_CACHE_TTL_MS = 60 * 60 * 1000;
const COVER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const COVER_CACHE_MAX_BYTES = 50 * 1024 * 1024;

export interface OpenLibraryClientOptions {
  baseUrl: string;
  coversUrl: string;
  timeoutMs: number;
  userAgent: string;
  logger: Logger;
  fetchImpl?: typeof fetch;
}

export interface SearchResult {
  total: number;
  docs: OlSearchDoc[];
}

class RetryableError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class OpenLibraryClient {
  private readonly fetchImpl: typeof fetch;
  // Values are wrapped so that "not found" (null) can be cached as well.
  private readonly jsonCache = new LRUCache<string, { value: unknown }>({ max: 500 });
  private readonly coverCache = new LRUCache<string, { value: CoverImage | null }>({
    maxSize: COVER_CACHE_MAX_BYTES,
    sizeCalculation: (entry) => Math.max(entry.value?.body.length ?? 0, 1),
    ttl: COVER_CACHE_TTL_MS,
  });

  constructor(private readonly options: OpenLibraryClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async search(query: string, page: number, limit: number): Promise<SearchResult> {
    const url = new URL('/search.json', this.options.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('fields', SEARCH_FIELDS);

    const data = await this.getJsonCached<OlSearchResponse>(url, SEARCH_CACHE_TTL_MS);
    return { total: data?.numFound ?? 0, docs: data?.docs ?? [] };
  }

  /** Search-index entry of a single work: authors, first publish year and page count live here. */
  async getWorkSummary(workId: string): Promise<OlSearchDoc | null> {
    const url = new URL('/search.json', this.options.baseUrl);
    url.searchParams.set('q', `key:/works/${workId}`);
    url.searchParams.set('limit', '1');
    url.searchParams.set('fields', SEARCH_FIELDS);

    const data = await this.getJsonCached<OlSearchResponse>(url, WORK_CACHE_TTL_MS);
    return data?.docs?.[0] ?? null;
  }

  async getWork(workId: string): Promise<OlWork | null> {
    const url = new URL(`/works/${encodeURIComponent(workId)}.json`, this.options.baseUrl);
    const work = await this.getJsonCached<OlWork>(url, WORK_CACHE_TTL_MS);
    // Merged works answer with a redirect record; follow it once.
    if (work?.type?.key === '/type/redirect' && work.location) {
      const target = new URL(`${work.location}.json`, this.options.baseUrl);
      return this.getJsonCached<OlWork>(target, WORK_CACHE_TTL_MS);
    }
    return work;
  }

  async getCover(coverId: number, size: CoverSize): Promise<CoverImage | null> {
    const cacheKey = `${coverId}-${size}`;
    const cached = this.coverCache.get(cacheKey);
    if (cached) return cached.value;

    const url = new URL(`/b/id/${coverId}-${size}.jpg`, this.options.coversUrl);
    // "?default=false" makes Open Library answer 404 instead of a blank placeholder image.
    url.searchParams.set('default', 'false');
    const response = await this.request(url, 'image/*');
    if (response === null) {
      this.coverCache.set(cacheKey, { value: null });
      return null;
    }

    const image: CoverImage = {
      body: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'image/jpeg',
    };
    this.coverCache.set(cacheKey, { value: image });
    return image;
  }

  private async getJsonCached<T>(url: URL, ttl: number): Promise<T | null> {
    const cacheKey = url.toString();
    const cached = this.jsonCache.get(cacheKey);
    if (cached) return cached.value as T | null;

    const response = await this.request(url, 'application/json');
    let value: T | null = null;
    if (response !== null) {
      try {
        value = (await response.json()) as T;
      } catch (err) {
        this.options.logger.warn({ err, url: cacheKey }, 'Open Library returned invalid JSON');
        throw upstreamError('Open Library returned an invalid response');
      }
    }
    this.jsonCache.set(cacheKey, { value }, { ttl });
    return value;
  }

  /**
   * GET with timeout and retry (exponential backoff) on network errors, 429 and 5xx.
   * Returns null for 404, throws UPSTREAM_ERROR when Open Library stays unavailable.
   */
  private async request(url: URL, accept: string): Promise<Response | null> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await this.fetchImpl(url, {
          headers: { Accept: accept, 'User-Agent': this.options.userAgent },
          signal: AbortSignal.timeout(this.options.timeoutMs),
        });
        if (response.status === 404) return null;
        if (response.status === 429 || response.status >= 500) {
          throw new RetryableError(`Open Library responded with HTTP ${response.status}`);
        }
        if (!response.ok) {
          throw upstreamError(`Open Library responded with HTTP ${response.status}`);
        }
        return response;
      } catch (err) {
        const retryable = err instanceof RetryableError || err instanceof TypeError || isAbort(err);
        if (!retryable) throw err;
        if (attempt >= MAX_RETRIES) {
          this.options.logger.warn({ err, url: url.toString() }, 'Open Library request failed');
          throw upstreamError('Open Library is currently unavailable, please try again later');
        }
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }
}

function isAbort(err: unknown) {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}
