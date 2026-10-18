import { API_BASE_URL, http } from './http';
import type { BookDetail, SearchResult } from './types';

export async function searchBooks(query: string, page: number, signal?: AbortSignal) {
  const { data } = await http.get<SearchResult>('/books/search', {
    params: { q: query, page },
    signal,
  });
  return data;
}

export async function getBook(workId: string, signal?: AbortSignal) {
  const { data } = await http.get<BookDetail>(`/books/${encodeURIComponent(workId)}`, { signal });
  return data;
}

/** Covers are served through the backend proxy, never directly from Open Library. */
export function coverUrl(coverId: number | null, size: 'S' | 'M' | 'L' = 'M') {
  return coverId ? `${API_BASE_URL}/covers/${coverId}?size=${size}` : null;
}
