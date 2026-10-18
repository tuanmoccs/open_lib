<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { BookSummary } from '@/api/types';
import { joinAuthors } from '@/utils/format';
import BookCover from './BookCover.vue';

defineProps<{ book: BookSummary; onShelf: boolean; adding: boolean }>();
const emit = defineEmits<{ add: []; open: [] }>();
const { t } = useI18n();
</script>

<template>
  <article class="card group flex flex-col overflow-hidden transition hover:shadow-md">
    <button
      type="button"
      class="block p-3 pb-0 text-left focus-visible:outline-2 focus-visible:outline-amber-600"
      :aria-label="t('search.viewDetail', { title: book.title })"
      @click="emit('open')"
    >
      <BookCover :cover-id="book.coverId" :title="book.title" />
    </button>
    <div class="flex flex-1 flex-col gap-1 p-3">
      <h3 class="line-clamp-2 font-semibold leading-snug text-stone-900">
        <button type="button" class="text-left hover:text-amber-800" @click="emit('open')">
          {{ book.title }}
        </button>
      </h3>
      <p class="line-clamp-1 text-sm text-stone-600">
        {{ joinAuthors(book.authors, t('common.unknownAuthor')) }}
      </p>
      <p v-if="book.firstPublishYear" class="text-xs text-stone-500">
        {{ t('search.published', { year: book.firstPublishYear }) }}
      </p>
      <div class="mt-auto pt-2">
        <span
          v-if="onShelf"
          class="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
        >
          ✓ {{ t('search.added') }}
        </span>
        <button
          v-else
          type="button"
          class="btn-primary w-full"
          :disabled="adding"
          @click="emit('add')"
        >
          {{ t('search.addToShelf') }}
        </button>
      </div>
    </div>
  </article>
</template>
