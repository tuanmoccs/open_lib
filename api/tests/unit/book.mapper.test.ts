import { describe, expect, it } from 'vitest';
import { parseDescription, parseYear, toBookSummary } from '../../src/modules/books/book.mapper';

describe('book mapper', () => {
  it('maps a search document', () => {
    expect(
      toBookSummary({
        key: '/works/OL1W',
        title: ' Dune ',
        author_name: ['Frank Herbert'],
        cover_i: 7,
        first_publish_year: 1965,
        number_of_pages_median: 608,
      }),
    ).toEqual({
      workId: 'OL1W',
      title: 'Dune',
      authors: ['Frank Herbert'],
      coverId: 7,
      firstPublishYear: 1965,
      numberOfPages: 608,
    });
  });

  it('treats invalid page counts as unknown and truncates long titles', () => {
    const book = toBookSummary({
      key: '/works/OL1W',
      title: 'x'.repeat(600),
      number_of_pages_median: 0,
    });
    expect(book.numberOfPages).toBeNull();
    expect(book.title).toHaveLength(500);
    expect(
      toBookSummary({ key: '/works/OL1W', number_of_pages_median: 10_000_000 }).numberOfPages,
    ).toBeNull();
  });

  it('reads both description formats', () => {
    expect(parseDescription('Plain')).toBe('Plain');
    expect(parseDescription({ value: ' Typed ' })).toBe('Typed');
    expect(parseDescription(undefined)).toBeNull();
  });

  it('extracts a year from free-form dates', () => {
    expect(parseYear('March 3, 1965')).toBe(1965);
    expect(parseYear('unknown')).toBeNull();
  });
});
