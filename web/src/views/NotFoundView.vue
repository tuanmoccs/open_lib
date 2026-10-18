<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section class="flex flex-col items-center gap-4 py-20 text-center">
    <p class="text-6xl font-bold text-amber-700">404</p>
    <h1 class="text-xl font-semibold">{{ t('notFound.title') }}</h1>
    <RouterLink to="/" class="btn-primary">{{ t('notFound.back') }}</RouterLink>
  </section>
</template>
