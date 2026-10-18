export const SHELF_STATUSES = ['want_to_read', 'reading', 'read'] as const;
export type ShelfStatus = (typeof SHELF_STATUSES)[number];

export interface BookSummary {
  workId: string;
  title: string;
  authors: string[];
  coverId: number | null;
  firstPublishYear: number | null;
  numberOfPages: number | null;
}

export interface SearchItem extends BookSummary {
  inShelf: boolean;
}

export interface SearchResult {
  items: SearchItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ShelfEntry {
  id: number;
  workId: string;
  title: string;
  authors: string[];
  coverId: number | null;
  firstPublishYear: number | null;
  status: ShelfStatus;
  currentPage: number;
  totalPages: number | null;
  progress: number | null;
  rating: number | null;
  note: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookDetail extends BookSummary {
  description: string | null;
  subjects: string[];
  shelfEntry: ShelfEntry | null;
}

export interface ShelfStats {
  total: number;
  want_to_read: number;
  reading: number;
  read: number;
}

export interface AddToShelfInput {
  workId: string;
  status: ShelfStatus;
  totalPages?: number;
}

export interface UpdateShelfEntryInput {
  status?: ShelfStatus;
  currentPage?: number;
  totalPages?: number;
  rating?: number | null;
  note?: string | null;
}
