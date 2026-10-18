import { http } from './http';
import type {
  AddToShelfInput,
  ShelfEntry,
  ShelfStats,
  ShelfStatus,
  UpdateShelfEntryInput,
} from './types';

export async function listShelf(status?: ShelfStatus) {
  const { data } = await http.get<{ items: ShelfEntry[] }>('/shelf', { params: { status } });
  return data.items;
}

export async function getShelfStats() {
  const { data } = await http.get<ShelfStats>('/shelf/stats');
  return data;
}

export async function addToShelf(input: AddToShelfInput) {
  const { data } = await http.post<ShelfEntry>('/shelf', input);
  return data;
}

export async function updateShelfEntry(id: number, input: UpdateShelfEntryInput) {
  const { data } = await http.patch<ShelfEntry>(`/shelf/${id}`, input);
  return data;
}

export async function removeShelfEntry(id: number) {
  await http.delete(`/shelf/${id}`);
}
