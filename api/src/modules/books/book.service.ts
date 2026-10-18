import { notFound } from '../../lib/errors';
import type { OpenLibraryClient } from '../open-library/open-library.client';
import { toShelfEntryDto } from '../shelf/shelf.dto';
import type { BookSnapshot, ShelfRepository } from '../shelf/shelf.types';
import { type BookDetail, toBookDetail, toBookSummary } from './book.mapper';

export const SEARCH_PAGE_SIZE = 20;

export type OpenLibraryGateway = Pick<
  OpenLibraryClient,
  'search' | 'getWork' | 'getWorkSummary' | 'getCover'
>;

export class BookService {
  constructor(
    private readonly openLibrary: OpenLibraryGateway,
    private readonly shelf: ShelfRepository,
  ) {}

  async search(query: string, page: number) {
    const { total, docs } = await this.openLibrary.search(query, page, SEARCH_PAGE_SIZE);
    const books = docs.filter((doc) => doc.key?.startsWith('/works/')).map(toBookSummary);
    const onShelf = await this.shelf.findWorkIdsOnShelf(books.map((book) => book.workId));

    return {
      items: books.map((book) => ({ ...book, inShelf: onShelf.has(book.workId) })),
      page,
      limit: SEARCH_PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / SEARCH_PAGE_SIZE),
    };
  }

  async getDetail(workId: string) {
    const [detail, entry] = await Promise.all([
      this.fetchDetail(workId),
      this.shelf.findByWorkId(workId),
    ]);
    return { ...detail, shelfEntry: entry ? toShelfEntryDto(entry) : null };
  }

  /** Book metadata stored with a shelf entry; always taken from Open Library, never from the client. */
  async getSnapshot(workId: string): Promise<BookSnapshot> {
    const { title, authors, coverId, firstPublishYear, numberOfPages } =
      await this.fetchDetail(workId);
    return { workId, title, authors, coverId, firstPublishYear, numberOfPages };
  }

  private async fetchDetail(workId: string): Promise<BookDetail> {
    const [work, summary] = await Promise.all([
      this.openLibrary.getWork(workId),
      this.openLibrary.getWorkSummary(workId),
    ]);
    if (!work) throw notFound(`Book ${workId} was not found on Open Library`);
    return toBookDetail(workId, work, summary);
  }
}
