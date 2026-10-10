<script setup lang="ts">
const config = useRuntimeConfig().public;
useHead(() => ({ meta: config.googleSiteVerification ? [{ name: 'google-site-verification', content: config.googleSiteVerification }] : [] }));
</script>

<template>
  <NuxtLoadingIndicator color="var(--ink)" />
  <NuxtPage />
</template>
