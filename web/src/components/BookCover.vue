<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { coverUrl } from '@/api/books';

const props = withDefaults(
  defineProps<{ coverId: number | null; title: string; size?: 'S' | 'M' | 'L' }>(),
  { size: 'M' },
);

const { t } = useI18n();
const failed = ref(false);
const src = computed(() => (failed.value ? null : coverUrl(props.coverId, props.size)));

watch(
  () => props.coverId,
  () => (failed.value = false),
);
</script>

<template>
  <div class="relative aspect-[2/3] overflow-hidden rounded-md bg-stone-200">
    <img
      v-if="src"
      :src="src"
      :alt="t('common.coverAlt', { title })"
      loading="lazy"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <div
      v-else
      class="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-amber-100 to-stone-200 p-2 text-center"
      role="img"
      :aria-label="t('common.noCover')"
    >
      <span class="text-3xl" aria-hidden="true">📖</span>
      <span class="line-clamp-3 text-xs font-medium text-stone-600">{{ title }}</span>
    </div>
  </div>
</template>
