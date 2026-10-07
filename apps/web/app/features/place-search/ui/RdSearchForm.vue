<script setup lang="ts">
import { useId } from 'vue';

// Form GET thường: chạy được cả khi JS chưa tải xong; S13 thêm gợi ý khi đang gõ.
defineProps<{ action: string; query?: string }>();
const inputId = useId();
</script>

<template>
  <form class="rd-search" role="search" :action="action" method="get">
    <label class="rd-search__label" :for="inputId">Tìm kiếm</label>
    <div class="rd-search__field field">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        :id="inputId"
        name="q"
        type="search"
        :value="query"
        placeholder="Quán cà phê, đồi chè, ăn sáng…"
        maxlength="100"
        enterkeyhint="search"
        autocomplete="off"
      >
      <button class="submit" type="submit" aria-label="Tìm">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  </form>
</template>

<style scoped>
/* Ô nhập của design system tắt outline; hiện vòng focus trên cả khung. */
.field:focus-within { outline: 3px solid var(--ink); outline-offset: 2px; }
.submit { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 var(--tap-min); height: var(--tap-min); margin-right: calc(-1 * var(--space-3)); border: 0; border-radius: var(--radius-pill); background: transparent; color: var(--ink); cursor: pointer; }
.submit:focus-visible { outline: 3px solid var(--ink); outline-offset: -3px; }
</style>
