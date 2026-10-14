<script setup lang="ts">
import { toastControls, toastState } from '../lib/toast';
</script>

<template>
  <div class="rd-admin-toast-region" role="status" aria-live="polite">
    <Transition name="rd-admin-toast">
      <div
        v-if="toastState"
        :key="toastState.id"
        class="rd-admin-toast"
        @mouseenter="toastControls.pause"
        @mouseleave="toastControls.resume"
        @focusin="toastControls.pause"
        @focusout="toastControls.resume"
      >
        <p>{{ toastState.message }}</p>
        <button type="button" class="rd-icon-btn" aria-label="Đóng thông báo" @click="toastControls.dismiss">×</button>
      </div>
    </Transition>
  </div>
</template>
