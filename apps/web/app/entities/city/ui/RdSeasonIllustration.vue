<script setup lang="ts">
defineProps<{ illustration: string }>();
</script>
<template>
  <svg class="rd-season-illustration" viewBox="0 0 96 96" fill="none" aria-hidden="true" focusable="false" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <g v-if="illustration === 'wild-sunflower'">
      <path d="M47 83V54M47 72C31 73 27 62 28 60c13-2 19 4 19 12ZM48 64c12-13 23-10 24-8-5 12-16 13-24 8Z" fill="var(--map-forest)" />
      <g fill="var(--accent)"><ellipse cx="48" cy="25" rx="7" ry="14" /><ellipse cx="48" cy="25" rx="7" ry="14" transform="rotate(45 48 40)" /><ellipse cx="48" cy="25" rx="7" ry="14" transform="rotate(90 48 40)" /><ellipse cx="48" cy="25" rx="7" ry="14" transform="rotate(135 48 40)" /><ellipse cx="48" cy="25" rx="7" ry="14" transform="rotate(180 48 40)" /><ellipse cx="48" cy="25" rx="7" ry="14" transform="rotate(225 48 40)" /><ellipse cx="48" cy="25" rx="7" ry="14" transform="rotate(270 48 40)" /><ellipse cx="48" cy="25" rx="7" ry="14" transform="rotate(315 48 40)" /></g><circle cx="48" cy="40" r="11" fill="var(--note)" />
    </g>
    <g v-else-if="illustration === 'cherry-blossom'">
      <path d="M17 83 72 18M35 62l-13-21M53 41l25 2" />
      <g fill="var(--accent)"><path d="M32 28c-10-11-22 1-9 11-15 3-9 19 5 12-2 15 15 15 16 1 12 9 21-5 8-12 15-6 7-20-5-11-2-15-19-14-15-1Z" /><path d="M64 9c-6-7-14 0-7 8-10 2-6 13 4 8-1 10 10 10 11 0 8 6 14-4 5-8 10-4 5-13-3-7-1-10-12-10-10-1Z" /></g><circle cx="34" cy="40" r="4" fill="var(--note)" /><circle cx="66" cy="17" r="3" fill="var(--note)" />
    </g>
    <g v-else-if="illustration === 'rain'"><path d="M19 41c-12-2-13-22 1-25 3-16 29-15 33 0 18-4 29 18 13 25H19Z" fill="var(--mist)" /><path d="m24 48-5 8m21-8-5 8m22-8-5 8" /><path d="M15 76a33 33 0 0 1 66 0c-7-5-15-5-22 0-7-5-15-5-22 0-7-5-15-5-22 0Z" fill="var(--accent)" /><path d="M48 44v40c0 9-12 9-12 1" /></g>
    <g v-else><path d="M22 15h49l5 64-49 4-5-68Z" fill="var(--paper-raised)" /><path d="m31 27 32-2m-31 14 30-2m-29 14 18-1m-17 13 25-2" /><path d="M21 23h10m-9 13h10m-9 13h10m-9 13h10m-9 13h10" /><circle cx="67" cy="68" r="13" fill="var(--accent)" /><path d="m62 68 4 4 7-9" /></g>
  </svg>
</template>
<style scoped>
.rd-season-illustration { width: var(--thumb); height: var(--thumb); flex: 0 0 var(--thumb); }
</style>
