<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { SHELF_STATUSES, type ShelfStatus } from '@/api/types';
import ShelfEntryCard from '@/components/ShelfEntryCard.vue';
import ShelfStats from '@/components/ShelfStats.vue';
import StateMessage from '@/components/StateMessage.vue';
import { useErrorMessage } from '@/composables/useErrorMessage';
import { useShelfStore } from '@/stores/shelf';

const DEFAULT_STATUS: ShelfStatus = 'reading';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const shelf = useShelfStore();
const errorMessage = useErrorMessage();

const activeStatus = computed<ShelfStatus>(() => {
  const status = route.query.status;
  return SHELF_STATUSES.includes(status as ShelfStatus) ? (status as ShelfStatus) : DEFAULT_STATUS;
});

// Entries whose status changed (e.g. auto-completed) leave the current tab immediately.
const visibleEntries = computed(() =>
  shelf.entries.filter((entry) => entry.status === activeStatus.value),
);

function selectTab(status: ShelfStatus) {
  void router.replace({ query: { ...route.query, status } });
}

function loadEntries() {
  void shelf.loadEntries(activeStatus.value);
}

watch(activeStatus, loadEntries, { immediate: true });
onMounted(() => {
  void shelf.loadStats().catch(() => undefined);
});
</script>

<template>
  <section class="space-y-6">
    <h1 class="text-2xl font-bold text-stone-900">{{ t('shelf.title') }}</h1>

    <ShelfStats :stats="shelf.stats" />

    <div
      role="tablist"
      :aria-label="t('shelf.tabs')"
      class="flex gap-1 overflow-x-auto border-b border-stone-200"
    >
      <button
        v-for="status in SHELF_STATUSES"
        :id="`tab-${status}`"
        :key="status"
        type="button"
        role="tab"
        :aria-selected="status === activeStatus"
        aria-controls="shelf-panel"
        class="-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition"
        :class="
          status === activeStatus
            ? 'border-amber-700 text-amber-800'
            : 'border-transparent text-stone-500 hover:text-stone-800'
        "
        @click="selectTab(status)"
      >
        {{ t(`status.${status}`) }}
        <span
          v-if="shelf.stats"
          class="rounded-full px-2 py-0.5 text-xs"
          :class="status === activeStatus ? 'bg-amber-100' : 'bg-stone-100'"
        >
          {{ shelf.stats[status] }}
        </span>
      </button>
    </div>

    <div id="shelf-panel" role="tabpanel" :aria-labelledby="`tab-${activeStatus}`">
      <StateMessage v-if="shelf.loading" variant="loading" />
      <StateMessage
        v-else-if="shelf.error"
        variant="error"
        :message="errorMessage(shelf.error)"
        @retry="loadEntries"
      />
      <StateMessage
        v-else-if="visibleEntries.length === 0"
        variant="empty"
        :message="t(`shelf.empty.${activeStatus}`)"
      >
        <RouterLink to="/" class="btn-primary">{{ t('shelf.findBooks') }}</RouterLink>
      </StateMessage>
      <div v-else class="grid gap-4 lg:grid-cols-2">
        <ShelfEntryCard v-for="entry in visibleEntries" :key="entry.id" :entry="entry" />
      </div>
    </div>
  </section>
</template>
