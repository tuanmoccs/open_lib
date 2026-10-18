<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import {
  SHELF_STATUSES,
  type ShelfEntry,
  type ShelfStatus,
  type UpdateShelfEntryInput,
} from '@/api/types';
import { useErrorMessage } from '@/composables/useErrorMessage';
import { useShelfStore } from '@/stores/shelf';
import { useToastStore } from '@/stores/toast';
import { formatDate, joinAuthors } from '@/utils/format';
import BookCover from './BookCover.vue';
import ConfirmDialog from './ConfirmDialog.vue';
import ProgressBar from './ProgressBar.vue';
import StarRating from './StarRating.vue';

const MAX_NOTE_LENGTH = 500;
const MAX_PAGES = 100_000;

const props = defineProps<{ entry: ShelfEntry }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const shelf = useShelfStore();
const toast = useToastStore();
const errorMessage = useErrorMessage();

const pageInput = ref<number | ''>(props.entry.currentPage);
const totalInput = ref<number | ''>('');
const noteInput = ref(props.entry.note ?? '');
const busy = ref(false);
const confirmingRemove = ref(false);

watch(
  () => props.entry,
  (entry) => {
    pageInput.value = entry.currentPage;
    noteInput.value = entry.note ?? '';
  },
);

const pageError = computed(() => {
  const total = props.entry.totalPages;
  const value = pageInput.value;
  if (total === null || value === '') return null;
  return Number.isInteger(value) && value >= 0 && value <= total
    ? null
    : t('validation.pageRange', { max: total });
});
const totalError = computed(() => {
  const value = totalInput.value;
  if (value === '') return null;
  return Number.isInteger(value) && value >= 1 && value <= MAX_PAGES
    ? null
    : t('validation.totalPagesMin');
});
const pageChanged = computed(
  () => pageInput.value !== '' && pageInput.value !== props.entry.currentPage,
);
const noteChanged = computed(() => noteInput.value.trim() !== (props.entry.note ?? ''));

async function save(input: UpdateShelfEntryInput) {
  const previousStatus = props.entry.status;
  busy.value = true;
  try {
    const updated = await shelf.update(props.entry.id, input);
    // The backend switches to "read" by itself when the last page is reached.
    if (input.status === undefined && previousStatus !== 'read' && updated.status === 'read') {
      toast.success(t('toast.autoCompleted', { title: updated.title }));
    } else {
      toast.success(t('toast.updated'));
    }
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    busy.value = false;
  }
}

function savePage() {
  if (pageError.value || !pageChanged.value || pageInput.value === '') return;
  void save({ currentPage: pageInput.value });
}

function saveTotalPages() {
  if (totalError.value || totalInput.value === '') return;
  void save({ totalPages: totalInput.value });
  totalInput.value = '';
}

function changeStatus(event: Event) {
  const status = (event.target as HTMLSelectElement).value as ShelfStatus;
  if (status !== props.entry.status) void save({ status });
}

function saveNote() {
  if (!noteChanged.value) return;
  void save({ note: noteInput.value.trim() || null });
}

async function remove() {
  busy.value = true;
  try {
    await shelf.remove(props.entry);
    toast.success(t('toast.removed', { title: props.entry.title }));
  } catch (err) {
    toast.error(errorMessage(err));
  } finally {
    busy.value = false;
    confirmingRemove.value = false;
  }
}

function openDetail() {
  void router.push({ query: { ...route.query, book: props.entry.workId } });
}
</script>

<template>
  <article class="card flex flex-col gap-4 p-4 sm:flex-row">
    <button
      type="button"
      class="w-24 shrink-0 self-start sm:w-28"
      :aria-label="t('search.viewDetail', { title: entry.title })"
      @click="openDetail"
    >
      <BookCover :cover-id="entry.coverId" :title="entry.title" />
    </button>

    <div class="min-w-0 flex-1 space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="font-semibold text-stone-900">
            <button type="button" class="text-left hover:text-amber-800" @click="openDetail">
              {{ entry.title }}
            </button>
          </h3>
          <p class="text-sm text-stone-600">
            {{ joinAuthors(entry.authors, t('common.unknownAuthor')) }}
          </p>
          <p class="mt-1 flex flex-wrap gap-x-3 text-xs text-stone-500">
            <span v-if="entry.startedAt">
              {{ t('shelf.startedAt', { date: formatDate(entry.startedAt) }) }}
            </span>
            <span v-if="entry.finishedAt">
              {{ t('shelf.finishedAt', { date: formatDate(entry.finishedAt) }) }}
            </span>
          </p>
        </div>
        <div>
          <label :for="`status-${entry.id}`" class="sr-only">{{ t('shelf.status') }}</label>
          <select
            :id="`status-${entry.id}`"
            class="input py-1.5"
            :value="entry.status"
            :disabled="busy"
            @change="changeStatus"
          >
            <option v-for="status in SHELF_STATUSES" :key="status" :value="status">
              {{ t(`status.${status}`) }}
            </option>
          </select>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium text-stone-700">{{ t('shelf.progress') }}</span>
          <span v-if="entry.totalPages !== null" class="text-stone-600">
            {{ t('shelf.progressValue', { current: entry.currentPage, total: entry.totalPages }) }}
            · <strong>{{ entry.progress }}%</strong>
          </span>
          <span v-else class="text-stone-500">{{ t('shelf.progressUnknown') }}</span>
        </div>
        <ProgressBar :value="entry.progress ?? 0" :label="t('shelf.progress')" />

        <form
          v-if="entry.totalPages !== null"
          class="flex flex-wrap items-start gap-2"
          @submit.prevent="savePage"
        >
          <label :for="`page-${entry.id}`" class="self-center text-sm text-stone-600">
            {{ t('shelf.currentPage') }}
          </label>
          <div>
            <input
              :id="`page-${entry.id}`"
              v-model.number="pageInput"
              type="number"
              min="0"
              :max="entry.totalPages"
              class="input w-28 py-1.5"
              :aria-invalid="pageError !== null"
              :disabled="busy"
            />
            <p v-if="pageError" class="mt-1 text-xs text-red-600">{{ pageError }}</p>
          </div>
          <button
            type="submit"
            class="btn-secondary py-1.5"
            :disabled="busy || !pageChanged || pageError !== null"
          >
            {{ t('shelf.updatePage') }}
          </button>
        </form>

        <form v-else class="flex flex-wrap items-start gap-2" @submit.prevent="saveTotalPages">
          <label :for="`total-${entry.id}`" class="self-center text-sm text-stone-600">
            {{ t('shelf.totalPages') }}
          </label>
          <div>
            <input
              :id="`total-${entry.id}`"
              v-model.number="totalInput"
              type="number"
              min="1"
              :max="MAX_PAGES"
              class="input w-28 py-1.5"
              :aria-invalid="totalError !== null"
              :disabled="busy"
            />
            <p v-if="totalError" class="mt-1 text-xs text-red-600">{{ totalError }}</p>
          </div>
          <button
            type="submit"
            class="btn-secondary py-1.5"
            :disabled="busy || totalInput === '' || totalError !== null"
          >
            {{ t('common.save') }}
          </button>
        </form>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-stone-700">{{ t('shelf.rating') }}</span>
        <StarRating
          :model-value="entry.rating"
          :disabled="busy"
          @update:model-value="(rating) => save({ rating })"
        />
      </div>

      <form class="space-y-2" @submit.prevent="saveNote">
        <label :for="`note-${entry.id}`" class="block text-sm font-medium text-stone-700">
          {{ t('shelf.note') }}
        </label>
        <textarea
          :id="`note-${entry.id}`"
          v-model="noteInput"
          rows="2"
          :maxlength="MAX_NOTE_LENGTH"
          class="input resize-y"
          :placeholder="t('shelf.notePlaceholder')"
          :disabled="busy"
        ></textarea>
        <div class="flex items-center justify-between">
          <span class="text-xs text-stone-500">
            {{ t('shelf.noteCounter', { count: noteInput.length, max: MAX_NOTE_LENGTH }) }}
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn text-red-700 hover:bg-red-50"
              :disabled="busy"
              @click="confirmingRemove = true"
            >
              {{ t('shelf.remove') }}
            </button>
            <button type="submit" class="btn-secondary" :disabled="busy || !noteChanged">
              {{ t('shelf.saveNote') }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <ConfirmDialog
      v-if="confirmingRemove"
      :title="t('shelf.confirmRemoveTitle')"
      :message="t('shelf.confirmRemoveMessage', { title: entry.title })"
      :confirm-label="t('common.delete')"
      :busy="busy"
      @confirm="remove"
      @cancel="confirmingRemove = false"
    />
  </article>
</template>
