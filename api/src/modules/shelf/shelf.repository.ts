import type { Knex } from 'knex';
import type { Db } from '../../db/knex';
import { conflict } from '../../lib/errors';
import { SHELF_STATUSES, type ShelfStatus } from './shelf.rules';
import type { BookSnapshot, ShelfEntry, ShelfEntryValues, ShelfRepository } from './shelf.types';

interface ShelfRow {
  id: number;
  status: ShelfStatus;
  current_page: number;
  total_pages: number | null;
  rating: number | null;
  note: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
  work_id: string;
  title: string;
  authors: string[] | string;
  cover_id: number | null;
  first_publish_year: number | null;
  number_of_pages: number | null;
}

const MYSQL_DUPLICATE_ENTRY = 'ER_DUP_ENTRY';

function toEntry(row: ShelfRow): ShelfEntry {
  return {
    id: row.id,
    status: row.status,
    currentPage: row.current_page,
    totalPages: row.total_pages,
    rating: row.rating,
    note: row.note,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    book: {
      workId: row.work_id,
      title: row.title,
      // mysql2 parses JSON columns, but keep a fallback for drivers returning raw text.
      authors: typeof row.authors === 'string' ? JSON.parse(row.authors) : row.authors,
      coverId: row.cover_id,
      firstPublishYear: row.first_publish_year,
      numberOfPages: row.number_of_pages,
    },
  };
}

function toEntryColumns(values: ShelfEntryValues) {
  return {
    status: values.status,
    current_page: values.currentPage,
    total_pages: values.totalPages,
    rating: values.rating,
    note: values.note,
    started_at: values.startedAt,
    finished_at: values.finishedAt,
  };
}

export class KnexShelfRepository implements ShelfRepository {
  constructor(private readonly db: Db) {}

  private baseQuery(db: Knex = this.db) {
    return db('shelf_entries as e')
      .join('books as b', 'b.id', 'e.book_id')
      .select<ShelfRow[]>(
        'e.id',
        'e.status',
        'e.current_page',
        'e.total_pages',
        'e.rating',
        'e.note',
        'e.started_at',
        'e.finished_at',
        'e.created_at',
        'e.updated_at',
        'b.work_id',
        'b.title',
        'b.authors',
        'b.cover_id',
        'b.first_publish_year',
        'b.number_of_pages',
      );
  }

  async list(status?: ShelfStatus) {
    const query = this.baseQuery().orderBy([
      { column: 'e.updated_at', order: 'desc' },
      { column: 'e.id', order: 'desc' },
    ]);
    if (status) query.where('e.status', status);
    return (await query).map(toEntry);
  }

  async findById(id: number) {
    const row = await this.baseQuery().where('e.id', id).first();
    return row ? toEntry(row) : null;
  }

  async findByWorkId(workId: string) {
    const row = await this.baseQuery().where('b.work_id', workId).first();
    return row ? toEntry(row) : null;
  }

  async findWorkIdsOnShelf(workIds: string[]) {
    if (workIds.length === 0) return new Set<string>();
    const rows = await this.db('shelf_entries as e')
      .join('books as b', 'b.id', 'e.book_id')
      .whereIn('b.work_id', workIds)
      .select<{ work_id: string }[]>('b.work_id');
    return new Set(rows.map((row) => row.work_id));
  }

  async countByStatus() {
    const rows = await this.db('shelf_entries')
      .select('status')
      .count<{ status: ShelfStatus; count: number | string }[]>({ count: '*' })
      .groupBy('status');
    const counts = Object.fromEntries(SHELF_STATUSES.map((status) => [status, 0])) as Record<
      ShelfStatus,
      number
    >;
    for (const row of rows) counts[row.status] = Number(row.count);
    return counts;
  }

  async create(book: BookSnapshot, values: ShelfEntryValues, now: Date) {
    const id = await this.db.transaction(async (trx) => {
      // Refresh the metadata snapshot if the book row already exists.
      await trx('books')
        .insert({
          work_id: book.workId,
          title: book.title,
          authors: JSON.stringify(book.authors),
          cover_id: book.coverId,
          first_publish_year: book.firstPublishYear,
          number_of_pages: book.numberOfPages,
          created_at: now,
          updated_at: now,
        })
        .onConflict('work_id')
        .merge([
          'title',
          'authors',
          'cover_id',
          'first_publish_year',
          'number_of_pages',
          'updated_at',
        ]);
      const bookRow = await trx('books').where('work_id', book.workId).first<{ id: number }>('id');

      try {
        const [entryId] = await trx('shelf_entries').insert({
          book_id: bookRow!.id,
          ...toEntryColumns(values),
          created_at: now,
          updated_at: now,
        });
        return entryId as number;
      } catch (err) {
        if ((err as { code?: string }).code === MYSQL_DUPLICATE_ENTRY) {
          throw conflict('This book is already on your shelf');
        }
        throw err;
      }
    });
    return (await this.findById(id))!;
  }

  async update(id: number, apply: (entry: ShelfEntry) => ShelfEntryValues, now: Date) {
    return this.db.transaction(async (trx) => {
      const row = await this.baseQuery(trx).where('e.id', id).forUpdate().first();
      if (!row) return null;
      const values = apply(toEntry(row));
      await trx('shelf_entries')
        .where('id', id)
        .update({ ...toEntryColumns(values), updated_at: now });
      const updated = await this.baseQuery(trx).where('e.id', id).first();
      return toEntry(updated!);
    });
  }

  async delete(id: number) {
    const affected = await this.db('shelf_entries').where('id', id).delete();
    return affected > 0;
  }
}
