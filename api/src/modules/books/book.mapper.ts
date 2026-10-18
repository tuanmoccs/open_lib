import type { OlSearchDoc, OlWork } from '../open-library/open-library.types';
import { MAX_PAGES } from '../shelf/shelf.schemas';
import type { BookSnapshot } from '../shelf/shelf.types';

const MAX_SUBJECTS = 15;
// Matches the books.title column size.
const MAX_TITLE_LENGTH = 500;

function cleanTitle(title: string | undefined): string | null {
  const trimmed = title?.trim();
  return trimmed ? trimmed.slice(0, MAX_TITLE_LENGTH) : null;
}

/** Upstream page counts can be 0 or absurd; treat those as unknown. */
function cleanPageCount(pages: number | undefined): number | null {
  return pages !== undefined && Number.isInteger(pages) && pages >= 1 && pages <= MAX_PAGES
    ? pages
    : null;
}

export function workIdFromKey(key: string): string {
  return key.replace(/^\/works\//, '');
}

export function toBookSummary(doc: OlSearchDoc): BookSnapshot {
  return {
    workId: workIdFromKey(doc.key),
    title: cleanTitle(doc.title) ?? 'Untitled',
    authors: doc.author_name ?? [],
    coverId: doc.cover_i ?? null,
    firstPublishYear: doc.first_publish_year ?? null,
    numberOfPages: cleanPageCount(doc.number_of_pages_median),
  };
}

/** Work descriptions are either a plain string or a { type, value } text object. */
export function parseDescription(description: OlWork['description']): string | null {
  const text = typeof description === 'string' ? description : description?.value;
  return text?.trim() || null;
}

export function parseYear(date: string | undefined): number | null {
  const match = date?.match(/\b(\d{4})\b/);
  return match ? Number(match[1]) : null;
}

export function toBookDetail(workId: string, work: OlWork, summary: OlSearchDoc | null) {
  const base = summary ? toBookSummary(summary) : null;
  return {
    workId,
    title: cleanTitle(work.title) ?? base?.title ?? 'Untitled',
    authors: base?.authors ?? [],
    coverId: work.covers?.find((id) => id > 0) ?? base?.coverId ?? null,
    firstPublishYear: base?.firstPublishYear ?? parseYear(work.first_publish_date),
    numberOfPages: base?.numberOfPages ?? null,
    description: parseDescription(work.description),
    subjects: (work.subjects ?? []).slice(0, MAX_SUBJECTS),
  };
}

export type BookDetail = ReturnType<typeof toBookDetail>;
