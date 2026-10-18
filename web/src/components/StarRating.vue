<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ modelValue: number | null; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();
const { t } = useI18n();
const hovered = ref<number | null>(null);

function select(star: number) {
  // Clicking the current rating again clears it.
  emit('update:modelValue', star === props.modelValue ? null : star);
}
</script>

<template>
  <div
    class="flex items-center gap-0.5"
    role="group"
    :aria-label="t('shelf.rating')"
    @mouseleave="hovered = null"
  >
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      class="rounded p-0.5 text-xl leading-none transition disabled:cursor-not-allowed"
      :class="star <= (hovered ?? modelValue ?? 0) ? 'text-amber-500' : 'text-stone-300'"
      :aria-label="t('shelf.ratingStar', { count: star })"
      :aria-pressed="modelValue === star"
      :disabled="disabled"
      @mouseenter="hovered = star"
      @click="select(star)"
    >
      ★
    </button>
    <button
      v-if="modelValue !== null"
      type="button"
      class="ml-1 text-xs text-stone-500 underline-offset-2 hover:underline"
      :disabled="disabled"
      @click="emit('update:modelValue', null)"
    >
      {{ t('shelf.clearRating') }}
    </button>
  </div>
</template>
