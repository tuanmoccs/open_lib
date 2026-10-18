import type { ReadingState, ShelfStatus } from './shelf.rules';

/** Book metadata copied from Open Library when the book is added to the shelf. */
export interface BookSnapshot {
  workId: string;
  title: string;
  authors: string[];
  coverId: number | null;
  firstPublishYear: number | null;
  numberOfPages: number | null;
}

export interface ShelfEntry extends ReadingState {
  id: number;
  book: BookSnapshot;
  rating: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ShelfEntryValues = ReadingState & Pick<ShelfEntry, 'rating' | 'note'>;

export type ShelfStats = Record<ShelfStatus, number> & { total: number };

export interface ShelfRepository {
  list(status?: ShelfStatus): Promise<ShelfEntry[]>;
  findById(id: number): Promise<ShelfEntry | null>;
  findByWorkId(workId: string): Promise<ShelfEntry | null>;
  findWorkIdsOnShelf(workIds: string[]): Promise<Set<string>>;
  countByStatus(): Promise<Record<ShelfStatus, number>>;
  /** Throws CONFLICT when the book is already on the shelf. */
  create(book: BookSnapshot, values: ShelfEntryValues, now: Date): Promise<ShelfEntry>;
  update(id: number, values: ShelfEntryValues, now: Date): Promise<ShelfEntry | null>;
  delete(id: number): Promise<boolean>;
}
