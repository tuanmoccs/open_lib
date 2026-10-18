import { conflict } from '../../src/lib/errors';
import type { ShelfStatus } from '../../src/modules/shelf/shelf.rules';
import type {
  BookSnapshot,
  ShelfEntry,
  ShelfEntryValues,
  ShelfRepository,
} from '../../src/modules/shelf/shelf.types';

/** Test double with the same contract as KnexShelfRepository. */
export class InMemoryShelfRepository implements ShelfRepository {
  private entries = new Map<number, ShelfEntry>();
  private nextId = 1;

  async list(status?: ShelfStatus) {
    return [...this.entries.values()].filter((entry) => !status || entry.status === status);
  }

  async findById(id: number) {
    return this.entries.get(id) ?? null;
  }

  async findByWorkId(workId: string) {
    return [...this.entries.values()].find((entry) => entry.book.workId === workId) ?? null;
  }

  async findWorkIdsOnShelf(workIds: string[]) {
    const onShelf = new Set([...this.entries.values()].map((entry) => entry.book.workId));
    return new Set(workIds.filter((id) => onShelf.has(id)));
  }

  async countByStatus() {
    const counts: Record<ShelfStatus, number> = { want_to_read: 0, reading: 0, read: 0 };
    for (const entry of this.entries.values()) counts[entry.status]++;
    return counts;
  }

  async create(book: BookSnapshot, values: ShelfEntryValues, now: Date) {
    if (await this.findByWorkId(book.workId)) throw conflict('This book is already on your shelf');
    const entry: ShelfEntry = {
      id: this.nextId++,
      book,
      ...values,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  async update(id: number, values: ShelfEntryValues, now: Date) {
    const entry = this.entries.get(id);
    if (!entry) return null;
    const updated = { ...entry, ...values, updatedAt: now };
    this.entries.set(id, updated);
    return updated;
  }

  async delete(id: number) {
    return this.entries.delete(id);
  }
}
