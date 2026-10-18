<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

withDefaults(defineProps<{ title: string; size?: 'sm' | 'lg' }>(), { size: 'lg' });
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

const panel = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  document.addEventListener('keydown', onKeydown);
  document.body.style.overflow = 'hidden';
  await nextTick();
  panel.value?.focus();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
  previouslyFocused?.focus();
});
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-40 flex items-end justify-center bg-stone-900/50 p-0 sm:items-center sm:p-4"
      @click.self="emit('close')"
    >
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        class="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl focus:outline-none sm:rounded-2xl"
        :class="size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-3xl'"
      >
        <button
          type="button"
          class="absolute top-3 right-3 z-10 rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          :aria-label="t('common.close')"
          @click="emit('close')"
        >
          ✕
        </button>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
