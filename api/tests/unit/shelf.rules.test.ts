import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/lib/errors';
import {
  applyReadingChange,
  initialReadingState,
  progressPercent,
  type ReadingState,
} from '../../src/modules/shelf/shelf.rules';

const T0 = new Date('2026-10-01T00:00:00Z');
const T1 = new Date('2026-10-05T00:00:00Z');

const state = (overrides: Partial<ReadingState> = {}): ReadingState => ({
  status: 'want_to_read',
  currentPage: 0,
  totalPages: 300,
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

function expectValidationError(fn: () => unknown, field: string) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('VALIDATION_ERROR');
    expect((err as AppError).details?.[0]?.field).toBe(field);
    return;
  }
  throw new Error('Expected a validation error');
}

describe('initialReadingState', () => {
  it('want_to_read has no dates', () => {
    expect(initialReadingState('want_to_read', 300, T0)).toEqual(state());
  });

  it('reading records the start date', () => {
    expect(initialReadingState('reading', 300, T0)).toEqual(
      state({ status: 'reading', startedAt: T0 }),
    );
  });

  it('read records the finish date and completes progress', () => {
    expect(initialReadingState('read', 300, T0)).toEqual(
      state({ status: 'read', currentPage: 300, finishedAt: T0 }),
    );
  });

  it('read without known page count keeps progress at 0', () => {
    expect(initialReadingState('read', null, T0)).toMatchObject({
      status: 'read',
      currentPage: 0,
      totalPages: null,
      finishedAt: T0,
    });
  });
});

describe('applyReadingChange', () => {
  it('rejects a page above the total', () => {
    expectValidationError(
      () => applyReadingChange(state(), { currentPage: 301 }, T0),
      'currentPage',
    );
  });

  it('rejects tracking pages when the total is unknown', () => {
    expectValidationError(
      () => applyReadingChange(state({ totalPages: null }), { currentPage: 10 }, T0),
      'totalPages',
    );
  });

  it('accepts page 0 when the total is unknown', () => {
    expect(
      applyReadingChange(state({ totalPages: null }), { currentPage: 0 }, T0).currentPage,
    ).toBe(0);
  });

  it('rejects lowering the total below the current page', () => {
    expectValidationError(
      () =>
        applyReadingChange(state({ status: 'reading', currentPage: 200 }), { totalPages: 150 }, T0),
      'currentPage',
    );
  });

  it('automatically marks the book as read when the last page is reached', () => {
    const result = applyReadingChange(
      state({ status: 'reading', currentPage: 120, startedAt: T0 }),
      { currentPage: 300 },
      T1,
    );
    expect(result).toEqual(
      state({ status: 'read', currentPage: 300, startedAt: T0, finishedAt: T1 }),
    );
  });

  it('marks as read on the last page even if "reading" was sent along', () => {
    const result = applyReadingChange(
      state({ status: 'reading' }),
      { currentPage: 300, status: 'reading' },
      T1,
    );
    expect(result.status).toBe('read');
  });

  it('logging pages on a want_to_read book starts reading', () => {
    const result = applyReadingChange(state(), { currentPage: 15 }, T1);
    expect(result).toMatchObject({ status: 'reading', currentPage: 15, startedAt: T1 });
  });

  it('keeps the first start date when reading again', () => {
    const result = applyReadingChange(
      state({ status: 'want_to_read', startedAt: T0 }),
      { status: 'reading' },
      T1,
    );
    expect(result.startedAt).toEqual(T0);
  });

  it('switching to read completes the progress and records the finish date', () => {
    const result = applyReadingChange(
      state({ status: 'reading', currentPage: 50, startedAt: T0 }),
      { status: 'read' },
      T1,
    );
    expect(result).toEqual(
      state({ status: 'read', currentPage: 300, startedAt: T0, finishedAt: T1 }),
    );
  });

  it('re-reading a finished book clears the finish date and restarts progress', () => {
    const result = applyReadingChange(
      state({ status: 'read', currentPage: 300, startedAt: T0, finishedAt: T0 }),
      { status: 'reading' },
      T1,
    );
    expect(result).toEqual(state({ status: 'reading', currentPage: 0, startedAt: T0 }));
  });

  it('keeps the original finish date when an already read book is updated', () => {
    const result = applyReadingChange(
      state({ status: 'read', currentPage: 300, finishedAt: T0 }),
      { totalPages: 300 },
      T1,
    );
    expect(result.finishedAt).toEqual(T0);
  });

  it('lowering the page of a read book moves it back to reading', () => {
    const result = applyReadingChange(
      state({ status: 'read', currentPage: 300, startedAt: T0, finishedAt: T0 }),
      { currentPage: 100 },
      T1,
    );
    expect(result).toMatchObject({ status: 'reading', currentPage: 100, finishedAt: null });
  });
});

describe('progressPercent', () => {
  it('returns null when the total is unknown', () => {
    expect(progressPercent(10, null)).toBeNull();
  });

  it('rounds to an integer percentage', () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(300, 300)).toBe(100);
  });
});
