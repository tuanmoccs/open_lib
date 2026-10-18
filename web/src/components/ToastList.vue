<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useToastStore } from '@/stores/toast';

const toastStore = useToastStore();
const { t } = useI18n();

const styles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
} as const;
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    aria-live="polite"
  >
    <TransitionGroup
      enter-from-class="translate-y-2 opacity-0"
      enter-active-class="transition duration-200"
      leave-to-class="opacity-0"
      leave-active-class="transition duration-150"
    >
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-md"
        :class="styles[toast.type]"
        :role="toast.type === 'error' ? 'alert' : 'status'"
      >
        <p class="flex-1">{{ toast.message }}</p>
        <button
          type="button"
          class="opacity-60 hover:opacity-100"
          :aria-label="t('common.close')"
          @click="toastStore.dismiss(toast.id)"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
