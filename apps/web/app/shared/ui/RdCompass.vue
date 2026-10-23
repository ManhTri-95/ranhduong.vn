<template>
  <svg class="rd-compass" viewBox="0 0 100 100" fill="none" aria-hidden="true">
    <circle cx="50" cy="50" r="43" stroke="currentColor" stroke-width="0.8" />
    <circle cx="50" cy="50" r="36" stroke="currentColor" stroke-width="0.5" stroke-dasharray="1 5" />
    <path d="M50 4v12m0 68v12M4 50h12m68 0h12M18 18l9 9m46 46 9 9M18 82l9-9m46-46 9-9" stroke="currentColor" stroke-width="1" />
    <path class="rd-compass__needle" d="m50 20 8 30-8 30-8-30Z" fill="currentColor" />
    <path class="rd-compass__needle" d="m20 50 30-8 30 8-30 8Z" stroke="currentColor" stroke-width="1" />
    <circle cx="50" cy="50" r="4" fill="var(--paper)" stroke="currentColor" />
  </svg>
</template>

<style scoped>
.rd-compass { display: block; width: 100%; height: 100%; }
.rd-compass__needle { transform-origin: center; transform: rotate(-25deg); }
</style>
