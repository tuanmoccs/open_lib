import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const TOAST_DURATION_MS = 4000;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);
  let nextId = 1;

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  function show(type: ToastType, message: string) {
    const id = nextId++;
    toasts.value.push({ id, type, message });
    setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }

  return {
    toasts,
    dismiss,
    success: (message: string) => show('success', message),
    error: (message: string) => show('error', message),
    info: (message: string) => show('info', message),
  };
});
