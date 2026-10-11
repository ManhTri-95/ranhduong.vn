<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AnalyticsConsent } from '~/shared/lib/analytics';
import { LEGAL_PAGES } from '~/shared/lib/legal-pages';
const config = useRuntimeConfig().public;
const route = useRoute();
const onLegalPage = computed(() => route.matched.some((match) => LEGAL_PAGES.some((page) => page.path === match.path)));
const choice = useState<AnalyticsConsent>('analytics-consent', () => 'unknown');
const editing = ref(false);
const setChoice = (value: AnalyticsConsent) => { choice.value = value; editing.value = false; };
</script>
<template>
  <ClientOnly>
    <aside v-if="config.indexable && config.umamiScriptUrl && config.umamiWebsiteId" id="analytics-settings" class="rd-consent" :class="{ 'rd-consent--panel': (choice === 'unknown' || editing) && !onLegalPage }" aria-label="Tuỳ chọn đo lượt truy cập">
      <section v-if="choice === 'unknown' || editing" class="rd-consent__panel" aria-labelledby="analytics-title">
        <h2 id="analytics-title">Giúp mình hiểu bạn dùng Rành Đường thế nào</h2>
        <p>Bạn có thể cho phép đo lượt truy cập để mình cải thiện trang. Mình không gửi tên, email, số điện thoại hay nội dung tìm kiếm. Bộ đếm lượt xem và bấm địa điểm không dùng cookie định danh.</p>
        <NuxtLink class="rd-consent__privacy" to="/quyen-rieng-tu">Đọc chính sách quyền riêng tư</NuxtLink>
        <div class="rd-consent__actions"><button class="rd-btn rd-btn--outline" type="button" @click="setChoice('denied')">Từ chối</button><button class="rd-btn rd-btn--accent" type="button" @click="setChoice('granted')">Cho phép</button><button v-if="editing" class="rd-btn rd-btn--outline" type="button" @click="editing = false">Đóng</button></div>
      </section>
      <button v-else class="rd-consent__settings" type="button" @click="editing = true">Tuỳ chọn đo lượt truy cập</button>
    </aside>
  </ClientOnly>
</template>
<style scoped>
.rd-consent { padding: var(--space-4) var(--space-5) calc(160px + env(safe-area-inset-bottom, 0px)); }
.rd-consent--panel { position: fixed; bottom: var(--space-2); left: var(--space-3); right: var(--space-3); z-index: 100; padding: 0; pointer-events: none; }
.rd-consent__panel { max-width: 540px; margin-left: auto; padding: var(--space-5); background: var(--paper-raised); border: var(--border-ink); border-radius: var(--radius-card); box-shadow: var(--shadow-float); pointer-events: auto; }
.rd-consent__panel h2 { margin: 0; font: 700 18px/1.5 var(--font-display); }
.rd-consent__panel p { font-size: 14px; line-height: 1.7; }
.rd-consent__privacy { display: inline-flex; align-items: center; min-height: var(--tap-min); margin-bottom: var(--space-2); font-size: 14px; }
.rd-consent__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-consent__settings { min-height: var(--tap-min); padding: var(--space-2) var(--space-3); background: var(--paper-raised); color: var(--ink); border: var(--border); border-radius: var(--radius-chip); font: inherit; font-size: 12px; pointer-events: auto; }
@media (min-width: 1024px) { .rd-consent { padding-bottom: var(--space-4); } .rd-consent--panel { padding: 0; } }
</style>
