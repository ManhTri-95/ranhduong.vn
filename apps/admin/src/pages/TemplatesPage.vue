<script setup lang="ts">
import type { AdminTemplate } from '@ranhduong/contracts';
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { fetchTemplates } from '@/entities/itinerary/api/templates';
import { toApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';
const templates = ref<AdminTemplate[]>([]);
const loading = ref(true);
const failed = ref(false);
const loginRequired = ref(false);
async function load(): Promise<void> {
  loading.value = true; failed.value = false; loginRequired.value = false;
  try { templates.value = await fetchTemplates(CITY_SLUG); }
  catch (err) { failed.value = true; loginRequired.value = toApiFailure(err).status === 401; }
  finally { loading.value = false; }
}
void load();
</script>
<template>
  <div class="rd-template-admin">
    <header class="rd-template-admin__head"><h1>Lịch trình mẫu</h1><RouterLink class="rd-btn rd-btn--primary" to="/lich-trinh/moi">Tạo lịch trình</RouterLink></header>
    <p v-if="loading" aria-live="polite">Đang tải lịch trình…</p>
    <div v-else-if="failed" class="rd-callout rd-callout--bad" role="alert"><p>Chưa tải được lịch trình.</p><button type="button" class="rd-btn rd-btn--outline" @click="load">Thử lại</button><RouterLink v-if="loginRequired" class="rd-template-admin__link" :to="{ path: '/dang-nhap', query: { returnTo: '/lich-trinh' } }">Đăng nhập lại</RouterLink></div>
    <p v-else-if="!templates.length" class="rd-callout rd-callout--warn">Chưa có lịch trình mẫu. Chọn địa điểm theo từng ngày để tạo một lịch trình nhé.</p>
    <ul v-else class="rd-template-admin__items"><li v-for="item in templates" :key="item.id" class="rd-admin-section"><RouterLink class="rd-template-admin__link" :to="`/lich-trinh/${item.id}`">{{ item.title }}</RouterLink><span :class="['rd-status', item.status === 'published' ? 'rd-status--ok' : 'rd-status--draft']">{{ item.status === 'published' ? 'Đang công khai' : 'Nháp' }} · {{ item.days.length }} ngày</span><p v-if="item.description">{{ item.description }}</p><p class="rd-field__hint">{{ item.analysis.issues.filter(i => i.level === 'error').length }} lỗi · {{ item.analysis.issues.filter(i => i.level === 'warning').length }} nhắc nhở theo dữ liệu hiện tại</p></li></ul>
  </div>
</template>
<style scoped>
.rd-template-admin { display: flex; flex-direction: column; gap: var(--space-4); }
.rd-template-admin__head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3); }
h1 { margin: 0; font: 700 28px/1.2 var(--font-display); }
.rd-template-admin__items { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-4); }
.rd-template-admin__link { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; overflow-wrap: anywhere; }
.rd-template-admin__items p { margin: 0; white-space: pre-line; overflow-wrap: anywhere; }
@media (min-width: 768px) { .rd-template-admin__items { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
