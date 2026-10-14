<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineProps<{ state?: string }>();
const bar = ref<HTMLElement | null>(null);
let observer: ResizeObserver | undefined;

// Đặt chiều cao thanh lên <html> để scroll-padding chừa đúng chỗ (ô đang focus không bị che) và toast nằm trên thanh.
onMounted(() => {
  const root = document.documentElement;
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
    root.style.setProperty('--admin-bar-height', `${Math.ceil(height)}px`);
  });
  if (bar.value) observer.observe(bar.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  document.documentElement.style.removeProperty('--admin-bar-height');
});
</script>

<template>
  <div ref="bar" class="rd-admin-bar">
    <p class="rd-admin-bar__state" role="status">{{ state }}</p>
    <div class="rd-admin-bar__actions"><slot /></div>
  </div>
</template>
