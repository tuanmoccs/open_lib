import { createRouter, createWebHistory } from 'vue-router';
import SearchView from '@/views/SearchView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'search', component: SearchView },
    { path: '/shelf', name: 'shelf', component: () => import('@/views/ShelfView.vue') },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    // Opening/closing the detail modal (?book=) must not scroll the page.
    if (to.path === from.path) return false;
    return { top: 0 };
  },
});
