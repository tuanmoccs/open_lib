import { conflict, notFound } from '../../lib/errors';
import type { BookService } from '../books/book.service';
import { toShelfEntryDto } from './shelf.dto';
import { applyReadingChange, initialReadingState, type ShelfStatus } from './shelf.rules';
import type { AddToShelfInput, UpdateShelfEntryInput } from './shelf.schemas';
import type { ShelfRepository, ShelfStats } from './shelf.types';

export class ShelfService {
  constructor(
    private readonly repository: ShelfRepository,
    private readonly books: Pick<BookService, 'getSnapshot'>,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async list(status?: ShelfStatus) {
    const entries = await this.repository.list(status);
    return entries.map(toShelfEntryDto);
  }

  async stats(): Promise<ShelfStats> {
    const counts = await this.repository.countByStatus();
    return { ...counts, total: counts.want_to_read + counts.reading + counts.read };
  }

  async add(input: AddToShelfInput) {
    // Fail fast before calling Open Library; the unique key still guards concurrent requests.
    if (await this.repository.findByWorkId(input.workId)) {
      throw conflict('This book is already on your shelf');
    }

    const book = await this.books.getSnapshot(input.workId);
    const now = this.clock();
    const state = initialReadingState(input.status, input.totalPages ?? book.numberOfPages, now);
    const entry = await this.repository.create(book, { ...state, rating: null, note: null }, now);
    return toShelfEntryDto(entry);
  }

  async update(id: number, input: UpdateShelfEntryInput) {
    const entry = await this.repository.findById(id);
    if (!entry) throw notFound(`Shelf entry ${id} does not exist`);

    const now = this.clock();
    const state = applyReadingChange(
      entry,
      { status: input.status, currentPage: input.currentPage, totalPages: input.totalPages },
      now,
    );
    const updated = await this.repository.update(
      id,
      {
        ...state,
        rating: input.rating !== undefined ? input.rating : entry.rating,
        note: input.note !== undefined ? input.note || null : entry.note,
      },
      now,
    );
    if (!updated) throw notFound(`Shelf entry ${id} does not exist`);
    return toShelfEntryDto(updated);
  }

  async remove(id: number) {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw notFound(`Shelf entry ${id} does not exist`);
  }
}
