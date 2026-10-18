import { progressPercent } from './shelf.rules';
import type { ShelfEntry } from './shelf.types';

export function toShelfEntryDto(entry: ShelfEntry) {
  return {
    id: entry.id,
    workId: entry.book.workId,
    title: entry.book.title,
    authors: entry.book.authors,
    coverId: entry.book.coverId,
    firstPublishYear: entry.book.firstPublishYear,
    status: entry.status,
    currentPage: entry.currentPage,
    totalPages: entry.totalPages,
    progress: progressPercent(entry.currentPage, entry.totalPages),
    rating: entry.rating,
    note: entry.note,
    startedAt: entry.startedAt?.toISOString() ?? null,
    finishedAt: entry.finishedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export type ShelfEntryDto = ReturnType<typeof toShelfEntryDto>;
