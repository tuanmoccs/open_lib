<script setup lang="ts">
defineProps<{ value: number; label: string }>();
</script>

<template>
  <div
    class="h-2.5 w-full overflow-hidden rounded-full bg-stone-200"
    role="progressbar"
    :aria-valuenow="value"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-label="label"
  >
    <div
      class="h-full rounded-full transition-[width] duration-500"
      :class="value >= 100 ? 'bg-emerald-500' : 'bg-amber-600'"
      :style="{ width: `${value}%` }"
    ></div>
  </div>
</template>
