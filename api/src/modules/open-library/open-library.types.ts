/** Subset of fields requested from https://openlibrary.org/search.json */
export interface OlSearchDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
}

export interface OlSearchResponse {
  numFound?: number;
  docs?: OlSearchDoc[];
}

/** Subset of fields of https://openlibrary.org/works/{id}.json */
export interface OlWork {
  key: string;
  title?: string;
  description?: string | { value?: string };
  subjects?: string[];
  covers?: number[];
  first_publish_date?: string;
  type?: { key?: string };
  /** Present when the work was merged into another one ("/type/redirect"). */
  location?: string;
}

export type CoverSize = 'S' | 'M' | 'L';

export interface CoverImage {
  body: Buffer;
  contentType: string;
}
