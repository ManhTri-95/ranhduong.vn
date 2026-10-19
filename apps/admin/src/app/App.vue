<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import RdAdminShell from '@/widgets/admin-shell/ui/RdAdminShell.vue';
import { chunkFailedTarget } from './chunk-recovery';

const route = useRoute();

function reload(): void {
  if (chunkFailedTarget.value) window.location.assign(chunkFailedTarget.value);
}
</script>

<template>
  <template v-if="route.meta.public">
    <div v-if="chunkFailedTarget" class="rd-callout rd-callout--bad" role="alert">
      <p>Chưa mở được trang này. Có thể trang quản trị vừa có bản mới hoặc mạng đang chập chờn.</p>
      <button type="button" class="rd-btn rd-btn--outline" @click="reload">Tải lại trang</button>
    </div>
    <RouterView />
  </template>
  <RdAdminShell v-else>
    <div v-if="chunkFailedTarget" class="rd-callout rd-callout--bad" role="alert">
      <p>Chưa mở được trang này. Có thể trang quản trị vừa có bản mới hoặc mạng đang chập chờn.</p>
      <button type="button" class="rd-btn rd-btn--outline" @click="reload">Tải lại trang</button>
    </div>
    <RouterView />
  </RdAdminShell>
</template>
