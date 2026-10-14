<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import RdAdminShell from '@/widgets/admin-shell/ui/RdAdminShell.vue';

const route = useRoute();
</script>

<template>
  <RouterView v-if="route.meta.public" />
  <RdAdminShell v-else><RouterView /></RdAdminShell>
</template>
