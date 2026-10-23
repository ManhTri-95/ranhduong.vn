<script setup lang="ts">
import { computed } from 'vue';
import RdAnalyticsConsent from '~/features/analytics-consent/ui/RdAnalyticsConsent.vue';
import RdSiteFooter from '~/widgets/site-footer/ui/RdSiteFooter.vue';
const config = useRuntimeConfig().public;
const route = useRoute();
// Trang toàn màn hình (bản đồ) tự đặt footer trong bottom sheet, không để footer dưới khung bản đồ.
const fullscreen = computed(() => route.meta.fullscreen === true);
const footerCitySlug = computed(() => typeof route.params.city === 'string' ? route.params.city : undefined);
useHead(() => ({ meta: config.googleSiteVerification ? [{ name: 'google-site-verification', content: config.googleSiteVerification }] : [] }));
</script>

<template>
  <NuxtLoadingIndicator color="var(--ink)" />
  <NuxtPage />
  <RdSiteFooter v-if="!fullscreen" :city-slug="footerCitySlug" />
  <RdAnalyticsConsent :hide-settings="fullscreen" />
</template>
