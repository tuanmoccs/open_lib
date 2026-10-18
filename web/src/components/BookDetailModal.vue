<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getBook } from '@/api/books';
import { ApiError, isCanceled } from '@/api/http';
import { SHELF_STATUSES, type BookDetail, type ShelfStatus } from '@/api/types';
import { useErrorMessage } from '@/composables/useErrorMessage';
import { useShelfStore } from '@/stores/shelf';
import { useToastStore } from '@/stores/toast';
import { joinAuthors } from '@/utils/format';
import BookCover from './BookCover.vue';
import ModalDialog from './ModalDialog.vue';
import StateMessage from './StateMessage.vue';

const DESCRIPTION_PREVIEW_LENGTH = 600;
const MAX_PAGES = 100_000;

const props = defineProps<{ workId: string }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const shelf = useShelfStore();
const toast = useToastStore();
const errorMessage = useErrorMessage();

const book = ref<BookDetail | null>(null);
const loading = ref(false);
const error = ref<unknown>(null);
const status = ref<ShelfStatus>('want_to_read');
const totalPages = ref<number | null>(null);
const saving = ref(false);
const expanded = ref(false);

const needsTotalPages = computed(() => book.value !== null && book.value.numberOfPages === null);
const totalPagesInvalid = computed(
  () =>
    typeof totalPages.value === 'number' &&
    (!Number.isInteger(totalPages.value) || totalPages.value < 1 || totalPages.value > MAX_PAGES),
);
const description = computed(() => {
  const text = book.value?.description ?? '';
  return expanded.value || text.length <= DESCRIPTION_PREVIEW_LENGTH
    ? text
    : `${text.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`;
});

let controller: AbortController | null = null;

async function load() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  error.value = null;
  expanded.value = false;
  try {
    book.value = await getBook(props.workId, signal);
  } catch (err) {
    if (isCanceled(err)) return;
    error.value = err;
  } finally {
    if (!signal.aborted) loading.value = false;
  }
}

watch(() => props.workId, load, { immediate: true });
onBeforeUnmount(() => controller?.abort());

async function addToShelf() {
  if (!book.value || totalPagesInvalid.value) return;
  saving.value = true;
  try {
    const entry = await shelf.add({
      workId: book.value.workId,
      status: status.value,
      ...(needsTotalPages.value && typeof totalPages.value === 'number'
        ? { totalPages: totalPages.value }
        : {}),
    });
    book.value = { ...book.value, shelfEntry: entry };
    toast.success(t('toast.added', { title: book.value.title }));
  } catch (err) {
    if (err instanceof ApiError && err.code === 'CONFLICT') {
      shelf.markOnShelf(book.value.workId);
      toast.info(t('toast.alreadyOnShelf'));
      void load();
    } else {
      toast.error(errorMessage(err));
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <ModalDialog :title="book?.title ?? t('detail.title')" @close="emit('close')">
    <div v-if="loading" class="p-6">
      <StateMessage variant="loading" />
    </div>

    <div v-else-if="error" class="p-6">
      <StateMessage variant="error" :message="errorMessage(error)" @retry="load" />
    </div>

    <div v-else-if="book" class="grid gap-6 p-6 sm:grid-cols-[200px_1fr]">
      <div class="mx-auto w-40 sm:w-full">
        <BookCover :cover-id="book.coverId" :title="book.title" size="L" />
      </div>

      <div class="min-w-0 space-y-4">
        <div class="pr-8">
          <h2 class="text-2xl leading-tight font-bold text-stone-900">{{ book.title }}</h2>
          <p class="mt-1 text-stone-600">
            {{ joinAuthors(book.authors, t('common.unknownAuthor')) }}
          </p>
        </div>

        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-stone-50 p-3">
            <dt class="text-stone-500">{{ t('detail.published') }}</dt>
            <dd class="font-semibold">{{ book.firstPublishYear ?? t('detail.unknown') }}</dd>
          </div>
          <div class="rounded-lg bg-stone-50 p-3">
            <dt class="text-stone-500">{{ t('detail.pages') }}</dt>
            <dd class="font-semibold">{{ book.numberOfPages ?? t('detail.unknown') }}</dd>
          </div>
        </dl>

        <div v-if="book.subjects.length > 0">
          <h3 class="mb-2 text-sm font-semibold text-stone-700">{{ t('detail.subjects') }}</h3>
          <ul class="flex flex-wrap gap-1.5">
            <li
              v-for="subject in book.subjects"
              :key="subject"
              class="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-900"
            >
              {{ subject }}
            </li>
          </ul>
        </div>

        <div>
          <h3 class="mb-1 text-sm font-semibold text-stone-700">{{ t('detail.description') }}</h3>
          <p
            v-if="book.description"
            class="text-sm leading-relaxed whitespace-pre-line text-stone-700"
          >
            {{ description }}
          </p>
          <p v-else class="text-sm text-stone-500 italic">{{ t('detail.noDescription') }}</p>
          <button
            v-if="(book.description?.length ?? 0) > DESCRIPTION_PREVIEW_LENGTH"
            type="button"
            class="mt-1 text-sm font-medium text-amber-800 hover:underline"
            @click="expanded = !expanded"
          >
            {{ expanded ? t('detail.showLess') : t('detail.showMore') }}
          </button>
        </div>

        <div
          v-if="book.shelfEntry"
          class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <span
            >✓ {{ t('detail.onShelf', { status: t(`status.${book.shelfEntry.status}`) }) }}</span
          >
          <RouterLink
            :to="{ name: 'shelf', query: { status: book.shelfEntry.status } }"
            class="btn-secondary"
          >
            {{ t('detail.goToShelf') }}
          </RouterLink>
        </div>

        <form
          v-else
          class="space-y-3 rounded-xl border border-stone-200 p-4"
          @submit.prevent="addToShelf"
        >
          <fieldset>
            <legend class="mb-2 text-sm font-semibold text-stone-700">
              {{ t('detail.initialStatus') }}
            </legend>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="option in SHELF_STATUSES"
                :key="option"
                class="cursor-pointer rounded-lg border border-stone-300 px-3 py-2 text-sm transition has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50 has-[:checked]:text-amber-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber-600"
              >
                <input
                  v-model="status"
                  type="radio"
                  name="initial-status"
                  :value="option"
                  class="sr-only"
                />
                {{ t(`status.${option}`) }}
              </label>
            </div>
          </fieldset>

          <div v-if="needsTotalPages">
            <label for="detail-total-pages" class="mb-1 block text-sm text-stone-700">
              {{ t('detail.totalPagesLabel') }}
            </label>
            <input
              id="detail-total-pages"
              v-model.number="totalPages"
              type="number"
              min="1"
              :max="MAX_PAGES"
              class="input max-w-40"
              :aria-invalid="totalPagesInvalid"
            />
            <p v-if="totalPagesInvalid" class="mt-1 text-xs text-red-600">
              {{ t('validation.totalPagesMin') }}
            </p>
          </div>

          <button type="submit" class="btn-primary" :disabled="saving || totalPagesInvalid">
            {{ t('detail.addToShelf') }}
          </button>
        </form>
      </div>
    </div>
  </ModalDialog>
</template>
