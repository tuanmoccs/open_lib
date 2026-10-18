<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import ToastList from '@/components/ToastList.vue';

const { t } = useI18n();
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2 font-semibold text-stone-900">
          <span class="text-2xl" aria-hidden="true">📚</span>
          <span class="hidden sm:inline">{{ t('app.name') }}</span>
        </RouterLink>
        <nav class="flex gap-1 text-sm font-medium">
          <RouterLink
            to="/"
            class="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100"
            exact-active-class="bg-amber-50 text-amber-800"
          >
            {{ t('app.nav.search') }}
          </RouterLink>
          <RouterLink
            to="/shelf"
            class="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100"
            active-class="bg-amber-50 text-amber-800"
          >
            {{ t('app.nav.shelf') }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
      <RouterView />
    </main>

    <footer class="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
      {{ t('app.footer') }}
    </footer>

    <ToastList />
  </div>
</template>
