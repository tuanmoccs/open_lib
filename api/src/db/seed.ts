import type { ShelfStatus } from '../modules/shelf/shelf.rules';
import type { Db } from './knex';

interface SampleBook {
  workId: string;
  title: string;
  authors: string[];
  coverId: number;
  firstPublishYear: number;
  pages: number;
  status: ShelfStatus;
  currentPage: number;
  rating: number | null;
  note: string | null;
  startedDaysAgo: number | null;
  finishedDaysAgo: number | null;
}

// Metadata taken from the Open Library search API so covers and details resolve correctly.
const SAMPLE_BOOKS: SampleBook[] = [
  {
    workId: 'OL27482W',
    title: 'The Hobbit',
    authors: ['J.R.R. Tolkien'],
    coverId: 14627509,
    firstPublishYear: 1937,
    pages: 310,
    status: 'read',
    currentPage: 310,
    rating: 5,
    note: 'A cosy adventure. Worth re-reading every few years.',
    startedDaysAgo: 40,
    finishedDaysAgo: 25,
  },
  {
    workId: 'OL1168083W',
    title: 'Nineteen Eighty-Four',
    authors: ['George Orwell'],
    coverId: 9267242,
    firstPublishYear: 1949,
    pages: 318,
    status: 'read',
    currentPage: 318,
    rating: 4,
    note: 'Bleak but brilliant.',
    startedDaysAgo: 30,
    finishedDaysAgo: 18,
  },
  {
    workId: 'OL796465W',
    title: 'O Alquimista',
    authors: ['Paulo Coelho'],
    coverId: 7414780,
    firstPublishYear: 1988,
    pages: 197,
    status: 'read',
    currentPage: 197,
    rating: 4,
    note: null,
    startedDaysAgo: 16,
    finishedDaysAgo: 12,
  },
  {
    workId: 'OL17075811W',
    title: 'Sapiens',
    authors: ['Yuval Noah Harari'],
    coverId: 8634250,
    firstPublishYear: 2011,
    pages: 456,
    status: 'reading',
    currentPage: 210,
    rating: null,
    note: 'Chapter on the agricultural revolution is great.',
    startedDaysAgo: 10,
    finishedDaysAgo: null,
  },
  {
    workId: 'OL66554W',
    title: 'Pride and Prejudice',
    authors: ['Jane Austen'],
    coverId: 14348537,
    firstPublishYear: 1813,
    pages: 351,
    status: 'reading',
    currentPage: 120,
    rating: null,
    note: null,
    startedDaysAgo: 6,
    finishedDaysAgo: null,
  },
  {
    workId: 'OL17930368W',
    title: 'Atomic Habits',
    authors: ['James Clear'],
    coverId: 12539702,
    firstPublishYear: 2016,
    pages: 323,
    status: 'reading',
    currentPage: 45,
    rating: null,
    note: null,
    startedDaysAgo: 2,
    finishedDaysAgo: null,
  },
  {
    workId: 'OL893414W',
    title: 'Dune',
    authors: ['Frank Herbert'],
    coverId: 11481354,
    firstPublishYear: 1965,
    pages: 608,
    status: 'want_to_read',
    currentPage: 0,
    rating: null,
    note: 'Recommended by a friend.',
    startedDaysAgo: null,
    finishedDaysAgo: null,
  },
  {
    workId: 'OL3140822W',
    title: 'To Kill a Mockingbird',
    authors: ['Harper Lee'],
    coverId: 14351077,
    firstPublishYear: 1960,
    pages: 320,
    status: 'want_to_read',
    currentPage: 0,
    rating: null,
    note: null,
    startedDaysAgo: null,
    finishedDaysAgo: null,
  },
  {
    workId: 'OL468431W',
    title: 'The Great Gatsby',
    authors: ['F. Scott Fitzgerald'],
    coverId: 10590366,
    firstPublishYear: 1920,
    pages: 185,
    status: 'want_to_read',
    currentPage: 0,
    rating: null,
    note: null,
    startedDaysAgo: null,
    finishedDaysAgo: null,
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inserts sample data only when the shelf is empty, so restarts never duplicate or overwrite data. */
export async function seedSampleData(db: Db, now = new Date()): Promise<number> {
  const daysAgo = (days: number | null) =>
    days === null ? null : new Date(now.getTime() - days * DAY_MS);

  return db.transaction(async (trx) => {
    const [row] = await trx('shelf_entries').count<{ count: number | string }[]>({ count: '*' });
    if (Number(row?.count ?? 0) > 0) return 0;

    for (const [index, book] of SAMPLE_BOOKS.entries()) {
      // Older activity first so the most recent entries show at the top of the shelf.
      const touchedAt = new Date(now.getTime() - (SAMPLE_BOOKS.length - index) * 60_000);
      await trx('books')
        .insert({
          work_id: book.workId,
          title: book.title,
          authors: JSON.stringify(book.authors),
          cover_id: book.coverId,
          first_publish_year: book.firstPublishYear,
          number_of_pages: book.pages,
          created_at: touchedAt,
          updated_at: touchedAt,
        })
        .onConflict('work_id')
        .ignore();
      const { id } = await trx('books').where('work_id', book.workId).first<{ id: number }>('id');

      await trx('shelf_entries').insert({
        book_id: id,
        status: book.status,
        current_page: book.currentPage,
        total_pages: book.pages,
        rating: book.rating,
        note: book.note,
        started_at: daysAgo(book.startedDaysAgo),
        finished_at: daysAgo(book.finishedDaysAgo),
        created_at: touchedAt,
        updated_at: touchedAt,
      });
    }
    return SAMPLE_BOOKS.length;
  });
}
