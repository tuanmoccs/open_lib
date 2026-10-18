<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { searchBooks } from '@/api/books';
import { ApiError, isCanceled } from '@/api/http';
import type { SearchItem, SearchResult } from '@/api/types';
import BookCard from '@/components/BookCard.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import StateMessage from '@/components/StateMessage.vue';
import { useDebounceFn } from '@/composables/useDebounceFn';
import { useErrorMessage } from '@/composables/useErrorMessage';
import { useShelfStore } from '@/stores/shelf';
import { useToastStore } from '@/stores/toast';

// The backend accepts at most 100 pages.
const MAX_PAGE = 100;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const shelf = useShelfStore();
const toast = useToastStore();
const errorMessage = useErrorMessage();

const routeQuery = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''));
const routePage = computed(() => {
  const page = Number(route.query.page);
  return Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
});

const input = ref(routeQuery.value);
const result = ref<SearchResult | null>(null);
const loading = ref(false);
const error = ref<unknown>(null);
const adding = ref(new Set<string>());

const totalPages = computed(() => Math.min(result.value?.totalPages ?? 0, MAX_PAGE));

function navigate(query: string, page = 1) {
  void router.replace({
    query: { ...route.query, q: query || undefined, page: page > 1 ? String(page) : undefined },
  });
}

const debouncedNavigate = useDebounceFn((value: string) => navigate(value.trim()), 500);

watch(input, (value) => {
  if (value.trim() !== routeQuery.value) debouncedNavigate.run(value);
});

function submit() {
  debouncedNavigate.cancel();
  if (input.value.trim() === routeQuery.value) {
    void load();
  } else {
    navigate(input.value.trim());
  }
}

let controller: AbortController | null = null;

async function load() {
  controller?.abort();
  if (!routeQuery.value) {
    result.value = null;
    error.value = null;
    loading.value = false;
    return;
  }

  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  error.value = null;
  try {
    result.value = await searchBooks(routeQuery.value, routePage.value, signal);
  } catch (err) {
    if (isCanceled(err)) return;
    error.value = err;
    result.value = null;
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

watch(
  [routeQuery, routePage],
  () => {
    // Keep the input in sync when navigating with back/forward.
    if (input.value.trim() !== routeQuery.value) input.value = routeQuery.value;
    void load();
  },
  { immediate: true },
);

function changePage(page: number) {
  navigate(routeQuery.value, page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openDetail(book: SearchItem) {
  void router.push({ query: { ...route.query, book: book.workId } });
}

async function quickAdd(book: SearchItem) {
  adding.value.add(book.workId);
  try {
    await shelf.add({ workId: book.workId, status: 'want_to_read' });
    toast.success(t('toast.added', { title: book.title }));
  } catch (err) {
    if (err instanceof ApiError && err.code === 'CONFLICT') {
      shelf.markOnShelf(book.workId);
      toast.info(t('toast.alreadyOnShelf'));
    } else {
      toast.error(errorMessage(err));
    }
  } finally {
    adding.value.delete(book.workId);
  }
}
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-3">
      <h1 class="text-2xl font-bold text-stone-900">{{ t('search.title') }}</h1>
      <form class="flex gap-2" role="search" @submit.prevent="submit">
        <label for="search-input" class="sr-only">{{ t('search.label') }}</label>
        <input
          id="search-input"
          v-model="input"
          type="search"
          class="input text-base"
          :placeholder="t('search.placeholder')"
          maxlength="200"
          autocomplete="off"
          autofocus
        />
        <button type="submit" class="btn-primary shrink-0 px-5">{{ t('search.submit') }}</button>
      </form>
    </div>

    <StateMessage v-if="!routeQuery" variant="info" :message="t('search.hint')" />

    <div
      v-else-if="loading"
      class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      role="status"
      :aria-label="t('common.loading')"
    >
      <div v-for="n in 10" :key="n" class="card animate-pulse p-3">
        <div class="aspect-[2/3] rounded-md bg-stone-200"></div>
        <div class="mt-3 h-4 w-3/4 rounded bg-stone-200"></div>
        <div class="mt-2 h-3 w-1/2 rounded bg-stone-200"></div>
        <div class="mt-4 h-9 rounded-lg bg-stone-200"></div>
      </div>
    </div>

    <StateMessage v-else-if="error" variant="error" :message="errorMessage(error)" @retry="load" />

    <StateMessage
      v-else-if="result && result.items.length === 0"
      variant="empty"
      :message="t('search.empty', { query: routeQuery })"
      :hint="t('search.emptyHint')"
    />

    <template v-else-if="result">
      <p class="text-sm text-stone-600">
        {{
          t('search.resultCount', {
            total: result.total.toLocaleString('vi-VN'),
            query: routeQuery,
          })
        }}
      </p>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <BookCard
          v-for="book in result.items"
          :key="book.workId"
          :book="book"
          :on-shelf="shelf.isOnShelf(book.workId, book.inShelf)"
          :adding="adding.has(book.workId)"
          @add="quickAdd(book)"
          @open="openDetail(book)"
        />
      </div>
      <PaginationBar :page="result.page" :total-pages="totalPages" @change="changePage" />
    </template>
  </section>
</template>
