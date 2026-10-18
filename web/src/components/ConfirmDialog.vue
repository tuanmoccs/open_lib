<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import ModalDialog from './ModalDialog.vue';

defineProps<{ title: string; message: string; confirmLabel: string; busy?: boolean }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const { t } = useI18n();
</script>

<template>
  <ModalDialog :title="title" size="sm" @close="emit('cancel')">
    <div class="space-y-4 p-6">
      <h2 class="pr-8 text-lg font-semibold text-stone-900">{{ title }}</h2>
      <p class="text-sm text-stone-600">{{ message }}</p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" :disabled="busy" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </button>
        <button type="button" class="btn-danger" :disabled="busy" @click="emit('confirm')">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </ModalDialog>
</template>
