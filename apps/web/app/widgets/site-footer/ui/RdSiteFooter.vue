<script setup lang="ts">
import { LEGAL_PAGES } from '~/shared/lib/legal-pages';
</script>

<template>
  <footer class="rd-footer">
    <div class="rd-footer__inner">
      <p>Rành Đường · Sổ tay Đà Lạt</p>
      <nav aria-label="Thông tin pháp lý">
        <NuxtLink v-for="page in LEGAL_PAGES" :key="page.path" :to="page.path">{{ page.title }}</NuxtLink>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.rd-footer { border-top: var(--border); padding: var(--space-5) var(--space-5) calc(160px + env(safe-area-inset-bottom, 0px)); }
.rd-footer__inner { max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.rd-footer p { margin: 0; font-size: 13px; color: var(--ink-soft); }
.rd-footer nav { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-5); }
.rd-footer a { display: inline-flex; align-items: center; min-height: var(--tap-min); font-size: 13px; }
.rd-footer a[aria-current='page'] { font-weight: 700; }
@media (min-width: 1024px) { .rd-footer { padding-bottom: var(--space-5); } }
</style>
