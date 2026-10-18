<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import BookDetailModal from '@/components/BookDetailModal.vue';
import ToastList from '@/components/ToastList.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// The book detail screen is a modal addressed by ?book=<workId>, so it can be opened
// from any page, shared as a link and closed with the browser back button.
const detailWorkId = computed(() => {
  const book = route.query.book;
  return typeof book === 'string' && /^OL\d+W$/.test(book) ? book : null;
});

function closeDetail() {
  const { book: _book, ...query } = route.query;
  void router.push({ query });
}
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

    <BookDetailModal v-if="detailWorkId" :work-id="detailWorkId" @close="closeDetail" />
    <ToastList />
  </div>
</template>
