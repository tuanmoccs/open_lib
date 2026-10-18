<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  variant: 'loading' | 'empty' | 'error' | 'info';
  message?: string;
  hint?: string;
}>();
defineEmits<{ retry: [] }>();

const { t } = useI18n();
const icons = { loading: '', empty: '🔍', error: '⚠️', info: '📚' } as const;
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center"
    :role="variant === 'error' ? 'alert' : 'status'"
  >
    <span
      v-if="variant === 'loading'"
      class="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-700"
      aria-hidden="true"
    ></span>
    <span v-else class="text-4xl" aria-hidden="true">{{ icons[variant] }}</span>
    <p class="font-medium text-stone-700">{{ message ?? t('common.loading') }}</p>
    <p v-if="hint" class="text-sm text-stone-500">{{ hint }}</p>
    <button v-if="variant === 'error'" type="button" class="btn-secondary" @click="$emit('retry')">
      {{ t('common.retry') }}
    </button>
    <slot />
  </div>
</template>
