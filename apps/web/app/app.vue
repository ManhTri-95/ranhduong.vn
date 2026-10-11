<script setup lang="ts">
import RdAnalyticsConsent from '~/features/analytics-consent/ui/RdAnalyticsConsent.vue';
const config = useRuntimeConfig().public;
useHead(() => ({ meta: config.googleSiteVerification ? [{ name: 'google-site-verification', content: config.googleSiteVerification }] : [] }));
</script>

<template>
  <NuxtLoadingIndicator color="var(--ink)" />
  <NuxtPage />
  <RdAnalyticsConsent />
</template>
