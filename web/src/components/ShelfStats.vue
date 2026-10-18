<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ShelfStats } from '@/api/types';

const props = defineProps<{ stats: ShelfStats | null }>();
const { t } = useI18n();

const items = computed(() => [
  { key: 'total', label: t('shelf.stats.total'), value: props.stats?.total, icon: '📚' },
  { key: 'reading', label: t('shelf.stats.reading'), value: props.stats?.reading, icon: '📖' },
  { key: 'read', label: t('shelf.stats.read'), value: props.stats?.read, icon: '✅' },
]);
</script>

<template>
  <dl class="grid grid-cols-3 gap-3">
    <div v-for="item in items" :key="item.key" class="card flex items-center gap-3 p-4">
      <span class="hidden text-2xl sm:inline" aria-hidden="true">{{ item.icon }}</span>
      <div>
        <dt class="text-xs text-stone-500 sm:text-sm">{{ item.label }}</dt>
        <dd class="text-2xl font-bold text-stone-900">{{ item.value ?? '–' }}</dd>
      </div>
    </div>
  </dl>
</template>
