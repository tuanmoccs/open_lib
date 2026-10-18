import { validationError } from '../../lib/errors';

export const SHELF_STATUSES = ['want_to_read', 'reading', 'read'] as const;
export type ShelfStatus = (typeof SHELF_STATUSES)[number];

/** The part of a shelf entry that is governed by the reading-progress business rules. */
export interface ReadingState {
  status: ShelfStatus;
  currentPage: number;
  totalPages: number | null;
  startedAt: Date | null;
  finishedAt: Date | null;
}

export interface ReadingStateChange {
  status?: ShelfStatus;
  currentPage?: number;
  totalPages?: number | null;
}

/**
 * Applies a change to the reading state and enforces the business rules:
 * - 0 <= currentPage <= totalPages (a page can only be tracked once totalPages is known)
 * - currentPage reaching totalPages (by changing either value) automatically marks the book as "read"
 * - correcting totalPages of a "read" book keeps it complete
 * - logging a page below totalPages (without an explicit status) marks the book as "reading"
 * - switching to "read" moves currentPage to the last page
 * - startedAt is recorded the first time the book becomes "reading" and never overwritten
 * - finishedAt is recorded when the book becomes "read" and cleared when it leaves "read"
 * - leaving "read" for re-reading (without a new page) restarts progress from page 0
 */
export function applyReadingChange(
  current: ReadingState,
  change: ReadingStateChange,
  now: Date,
): ReadingState {
  const totalPages = change.totalPages !== undefined ? change.totalPages : current.totalPages;
  let currentPage = change.currentPage ?? current.currentPage;
  let status = change.status ?? current.status;

  // A finished book stays complete when its page count is corrected (up or down).
  const keepsReadComplete =
    current.status === 'read' && change.status === undefined && change.currentPage === undefined;
  if (keepsReadComplete && totalPages !== null) currentPage = totalPages;

  if (change.currentPage !== undefined && change.currentPage > 0 && totalPages === null) {
    throw validationError('Total pages of this book is unknown; set totalPages first', [
      { field: 'totalPages', message: 'Required before tracking the current page' },
    ]);
  }
  if (totalPages !== null && currentPage > totalPages) {
    throw validationError(`Current page must be between 0 and ${totalPages}`, [
      {
        field: 'currentPage',
        message: `Must be less than or equal to total pages (${totalPages})`,
      },
    ]);
  }

  const leavingRead = current.status === 'read' && change.status !== undefined && status !== 'read';
  if (leavingRead && change.currentPage === undefined && currentPage === totalPages) {
    currentPage = 0;
  }

  const pagesChanged = change.currentPage !== undefined || change.totalPages !== undefined;
  if (totalPages !== null) {
    if (change.status === 'read') {
      currentPage = totalPages;
    } else if (keepsReadComplete) {
      // currentPage was already aligned with totalPages above.
    } else if (pagesChanged && currentPage === totalPages) {
      status = 'read';
    } else if (change.currentPage !== undefined && change.status === undefined && currentPage > 0) {
      // Logging pages on a "want to read" / "read" book means it is being read (again).
      status = 'reading';
    }
  }

  let { startedAt, finishedAt } = current;
  if (status === 'reading' && startedAt === null) {
    startedAt = now;
  }
  if (status === 'read') {
    if (current.status !== 'read' || finishedAt === null) finishedAt = now;
  } else {
    finishedAt = null;
  }

  return { status, currentPage, totalPages, startedAt, finishedAt };
}

/** Reading state of a book that is being added to the shelf. */
export function initialReadingState(
  status: ShelfStatus,
  totalPages: number | null,
  now: Date,
): ReadingState {
  return applyReadingChange(
    { status: 'want_to_read', currentPage: 0, totalPages, startedAt: null, finishedAt: null },
    { status },
    now,
  );
}

export function progressPercent(currentPage: number, totalPages: number | null): number | null {
  if (!totalPages) return null;
  return Math.min(100, Math.round((currentPage / totalPages) * 100));
}
