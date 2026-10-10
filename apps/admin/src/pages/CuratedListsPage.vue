<script setup lang="ts">
import type { AdminCuratedList } from '@ranhduong/contracts';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchCuratedLists } from '@/entities/curated-list/api/curated-lists';
import { toApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';
const lists = ref<AdminCuratedList[]>([]);
const loading = ref(true);
const failed = ref(false);
const loginRequired = ref(false);
async function load(): Promise<void> {
  loading.value = true;
  failed.value = false;
  loginRequired.value = false;
  try { lists.value = await fetchCuratedLists(CITY_SLUG); }
  catch (err) { failed.value = true; loginRequired.value = toApiFailure(err).status === 401; }
  finally { loading.value = false; }
}
void load();
</script>
<template>
  <div class="rd-curated-admin">
    <header class="rd-curated-admin__head"><h1>Danh sách gợi ý</h1><RouterLink class="rd-btn rd-btn--primary" to="/danh-sach/moi">Tạo danh sách</RouterLink></header>
    <p v-if="loading" aria-live="polite">Đang tải danh sách…</p>
    <div v-else-if="failed" class="rd-callout rd-callout--bad" role="alert">
      <p>Chưa tải được danh sách.</p><button type="button" class="rd-btn rd-btn--outline" @click="load">Thử lại</button>
      <RouterLink v-if="loginRequired" class="rd-curated-admin__link" :to="{ path: '/dang-nhap', query: { returnTo: '/danh-sach' } }">Đăng nhập lại</RouterLink>
    </div>
    <p v-else-if="!lists.length" class="rd-callout rd-callout--warn">Chưa có danh sách nào. Tạo một danh sách để gợi ý chỗ ghé theo chủ đề nhé.</p>
    <ul v-else class="rd-curated-admin__lists">
      <li v-for="list in lists" :key="list.id" class="rd-admin-section">
        <RouterLink class="rd-curated-admin__link" :to="`/danh-sach/${list.id}`">{{ list.title }}</RouterLink>
        <span :class="['rd-status', list.status === 'published' ? 'rd-status--ok' : 'rd-status--draft']">{{ list.status === 'published' ? 'Đang công khai' : 'Nháp' }} · {{ list.placeIds.length }} địa điểm</span>
        <p v-if="list.description" class="rd-curated-admin__description">{{ list.description }}</p>
        <a v-if="list.status === 'published'" class="rd-curated-admin__link" :href="`https://ranhduong.vn/${CITY_SLUG}/top/${list.slug}`" target="_blank" rel="noopener">Xem trên web ↗</a>
      </li>
    </ul>
  </div>
</template>
<style scoped>
.rd-curated-admin { display: flex; flex-direction: column; gap: var(--space-4); }
.rd-curated-admin__head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); }
h1 { margin: 0; font: 700 28px/1.2 var(--font-display); }
.rd-curated-admin__lists { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-4); }
.rd-curated-admin__link { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; overflow-wrap: anywhere; }
.rd-curated-admin__description { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
@media (min-width: 768px) { .rd-curated-admin__lists { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
