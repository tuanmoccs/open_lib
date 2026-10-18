<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ page: number; totalPages: number }>();
const emit = defineEmits<{ change: [page: number] }>();
const { t } = useI18n();

const WINDOW = 2;

/** Page numbers around the current one, with gaps (null) collapsed into an ellipsis. */
const pages = computed<(number | null)[]>(() => {
  const result: (number | null)[] = [];
  for (let p = 1; p <= props.totalPages; p++) {
    const nearCurrent = Math.abs(p - props.page) <= WINDOW;
    if (p === 1 || p === props.totalPages || nearCurrent) {
      result.push(p);
    } else if (result[result.length - 1] !== null) {
      result.push(null);
    }
  }
  return result;
});

function go(page: number) {
  if (page >= 1 && page <= props.totalPages && page !== props.page) emit('change', page);
}
</script>

<template>
  <nav
    v-if="totalPages > 1"
    :aria-label="t('pagination.label')"
    class="flex flex-wrap items-center justify-center gap-1.5"
  >
    <button type="button" class="btn-secondary" :disabled="page <= 1" @click="go(page - 1)">
      ‹ <span class="hidden sm:inline">{{ t('pagination.previous') }}</span>
    </button>
    <template v-for="(p, index) in pages" :key="p ?? `gap-${index}`">
      <span v-if="p === null" class="px-1 text-stone-400" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="min-w-9"
        :class="p === page ? 'btn-primary' : 'btn-secondary'"
        :aria-current="p === page ? 'page' : undefined"
        :aria-label="t('pagination.page', { page: p })"
        @click="go(p)"
      >
        {{ p }}
      </button>
    </template>
    <button
      type="button"
      class="btn-secondary"
      :disabled="page >= totalPages"
      @click="go(page + 1)"
    >
      <span class="hidden sm:inline">{{ t('pagination.next') }}</span> ›
    </button>
  </nav>
</template>
