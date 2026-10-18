import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import * as shelfApi from '@/api/shelf';
import type {
  AddToShelfInput,
  ShelfEntry,
  ShelfStats,
  ShelfStatus,
  UpdateShelfEntryInput,
} from '@/api/types';

export const useShelfStore = defineStore('shelf', () => {
  const entries = ref<ShelfEntry[]>([]);
  const stats = ref<ShelfStats | null>(null);
  const loading = ref(false);
  const error = ref<unknown>(null);
  /** Work ids added or removed during this session, so search results stay in sync without refetching. */
  const shelfOverrides = reactive(new Map<string, boolean>());

  let listRequest = 0;

  async function loadEntries(status: ShelfStatus) {
    const request = ++listRequest;
    loading.value = true;
    error.value = null;
    try {
      const items = await shelfApi.listShelf(status);
      if (request === listRequest) entries.value = items;
    } catch (err) {
      if (request === listRequest) error.value = err;
    } finally {
      if (request === listRequest) loading.value = false;
    }
  }

  async function loadStats() {
    stats.value = await shelfApi.getShelfStats();
  }

  async function add(input: AddToShelfInput) {
    const entry = await shelfApi.addToShelf(input);
    shelfOverrides.set(entry.workId, true);
    void loadStats().catch(() => undefined);
    return entry;
  }

  async function update(id: number, input: UpdateShelfEntryInput) {
    const updated = await shelfApi.updateShelfEntry(id, input);
    const index = entries.value.findIndex((entry) => entry.id === id);
    const previous = entries.value[index];
    if (index !== -1) entries.value[index] = updated;
    // The backend may change the status on its own (e.g. last page reached), so compare results.
    if (!previous || previous.status !== updated.status) {
      void loadStats().catch(() => undefined);
    }
    return updated;
  }

  async function remove(entry: ShelfEntry) {
    await shelfApi.removeShelfEntry(entry.id);
    entries.value = entries.value.filter((item) => item.id !== entry.id);
    shelfOverrides.set(entry.workId, false);
    void loadStats().catch(() => undefined);
  }

  function markOnShelf(workId: string) {
    shelfOverrides.set(workId, true);
  }

  /** Server value from the search result, overridden by changes made in this session. */
  function isOnShelf(workId: string, serverValue: boolean) {
    return shelfOverrides.get(workId) ?? serverValue;
  }

  return {
    entries,
    stats,
    loading,
    error,
    loadEntries,
    loadStats,
    add,
    update,
    remove,
    markOnShelf,
    isOnShelf,
  };
});
