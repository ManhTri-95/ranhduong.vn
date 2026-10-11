<script setup lang="ts">
import { computed } from 'vue';
import type { LegalPage } from '~/shared/lib/legal-pages';
import { usePageSeo } from '~/shared/lib/use-page-seo';

const props = defineProps<{ page: LegalPage }>();
const updatedOn = computed(() => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(props.page.lastmod)));
usePageSeo({
  path: () => props.page.path,
  title: () => `${props.page.title} · Rành Đường`,
  description: () => props.page.description,
  breadcrumbs: () => [{ name: 'Đà Lạt', path: '/da-lat' }, { name: props.page.title, path: props.page.path }],
});
</script>

<template>
  <main class="rd-legal">
    <nav aria-label="Về trang chủ"><NuxtLink class="rd-legal__home" to="/da-lat">Rành Đường · Về trang chủ</NuxtLink></nav>
    <header class="rd-legal__header">
      <h1 class="page-title">{{ page.title }}</h1>
      <p class="lead">{{ page.description }}</p>
      <p class="rd-legal__date">Cập nhật ngày <time :datetime="page.lastmod">{{ updatedOn }}</time></p>
    </header>
    <article class="rd-legal__content"><slot /></article>
  </main>
</template>

<style scoped>
.rd-legal { max-width: 720px; margin: 0 auto; padding: var(--space-5); }
.rd-legal__home { display: inline-flex; align-items: center; min-height: var(--tap-min); }
.rd-legal__header { display: grid; gap: var(--space-4); margin: var(--space-5) 0 var(--space-7); }
.rd-legal__date { margin: 0; font-size: 13px; color: var(--ink-soft); }
.rd-legal__content { font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
.rd-legal__content :deep(section) { margin-bottom: var(--space-7); scroll-margin-top: var(--space-5); }
.rd-legal__content :deep(h2) { margin: 0 0 var(--space-3); font: 700 22px/1.4 var(--font-display); }
.rd-legal__content :deep(p) { margin: 0 0 var(--space-3); }
.rd-legal__content :deep(ul) { padding-left: var(--space-5); }
.rd-legal__content :deep(li) { margin-bottom: var(--space-2); }
.rd-legal__content :deep(.rd-legal__link) { display: inline-flex; align-items: center; min-height: var(--tap-min); }
@media (min-width: 1024px) { .rd-legal { padding-block: var(--space-7); } }
</style>
