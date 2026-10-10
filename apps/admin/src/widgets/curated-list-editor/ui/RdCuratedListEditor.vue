<script setup lang="ts">
import { CATEGORY_LABEL, PLACE_STATUS_LABEL } from '@ranhduong/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { CITY_SLUG } from '@/shared/config';
import { addPlace, filterCandidates, movePlace, removePlace } from '../model/places';
import { useCuratedListEditor } from '../model/use-curated-list-editor';

const props = defineProps<{ listId: string | null }>();
const emit = defineEmits<{ created: [id: string] }>();
const editor = useCuratedListEditor(props.listId, (id) => emit('created', id));
const { list, form, places, loading, loadError, errors, notice, busy, loginRequired, loginReturnTo, restorable, dirty, localKept } = editor;
const query = ref('');
const candidates = computed(() => filterCandidates(places.value, form.value.placeIds, query.value));
const selected = computed(() => form.value.placeIds.map((id) => ({ id, place: places.value.find((place) => place.id === id) })));
const publicUrl = computed(() => list.value ? `https://ranhduong.vn/${CITY_SLUG}/top/${list.value.slug}` : '');
const feedbackEl = ref<HTMLElement | null>(null);
watch(errors, async (messages) => {
  if (!messages.length) return;
  await nextTick();
  feedbackEl.value?.scrollIntoView({ block: 'center' });
  feedbackEl.value?.focus({ preventScroll: true });
});
</script>

<template>
  <div class="rd-curated-editor">
    <RouterLink class="rd-curated-editor__back" to="/danh-sach">← Danh sách gợi ý</RouterLink>
    <h1 class="rd-curated-editor__title">{{ list ? 'Sửa danh sách' : 'Tạo danh sách' }}</h1>
    <p v-if="loading" aria-live="polite">Đang tải danh sách…</p>
    <div v-else-if="loadError" class="rd-callout rd-callout--bad" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" class="rd-btn rd-btn--outline" @click="editor.load">Thử lại</button>
      <RouterLink v-if="loginRequired" class="rd-curated-editor__back" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại</RouterLink>
    </div>
    <form v-else class="rd-curated-editor__form" @submit.prevent>
      <div v-if="restorable" class="rd-callout rd-callout--warn">
        <p>Có nội dung chưa lưu trên máy này.</p>
        <div class="rd-curated-editor__actions">
          <button class="rd-btn rd-btn--outline" type="button" @click="editor.restore">Khôi phục</button>
          <button class="rd-btn rd-btn--outline" type="button" @click="editor.discardLocal">Bỏ bản trên máy</button>
        </div>
      </div>
      <div v-if="errors.length" ref="feedbackEl" class="rd-callout rd-callout--bad" tabindex="-1" role="alert">
        <p v-for="message in errors" :key="message">{{ message }}</p>
        <RouterLink v-if="loginRequired" class="rd-curated-editor__back" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại để lưu tiếp</RouterLink>
      </div>
      <p v-if="notice" class="rd-callout rd-callout--ok" role="status">{{ notice }}</p>
      <fieldset class="rd-admin-section" :disabled="busy">
        <legend class="rd-admin-section__title">Thông tin danh sách</legend>
        <label class="rd-field"><span class="rd-field__label">Tiêu đề</span><input v-model="form.title" class="rd-input" maxlength="200" required></label>
        <label class="rd-field"><span class="rd-field__label">Mô tả</span><textarea v-model="form.description" class="rd-input" maxlength="2000" rows="4" /></label>
        <p v-if="list" class="rd-field__hint">{{ list.status === 'published' ? 'Đang công khai' : 'Bản nháp' }} · Đường dẫn giữ nguyên khi sửa tiêu đề.</p>
        <a v-if="list?.status === 'published'" class="rd-curated-editor__back" :href="publicUrl" target="_blank" rel="noopener">Xem trên web ↗</a>
      </fieldset>
      <fieldset class="rd-admin-section" :disabled="busy">
        <legend class="rd-admin-section__title">Địa điểm và thứ tự ({{ selected.length }}/50)</legend>
        <p class="rd-field__hint">Dùng nút Lên và Xuống để sắp thứ tự trên web. Mỗi địa điểm chỉ thêm một lần.</p>
        <ol v-if="selected.length" class="rd-curated-editor__selected">
          <li v-for="({ id, place }, index) in selected" :key="id" class="rd-curated-editor__row">
            <div class="rd-curated-editor__name"><strong>{{ index + 1 }}. {{ place?.name ?? 'Địa điểm không còn tồn tại' }}</strong>
              <span v-if="place && place.status !== 'active'" class="rd-field__error">{{ PLACE_STATUS_LABEL[place.status] }} · Bỏ chỗ này trước khi công khai.</span>
              <span v-else-if="!place" class="rd-field__error">Bỏ chỗ này trước khi lưu.</span>
            </div>
            <div class="rd-curated-editor__actions">
              <button type="button" class="rd-btn rd-btn--outline" :disabled="index === 0" :aria-label="`Đưa ${place?.name ?? 'địa điểm'} lên`" @click="form.placeIds = movePlace(form.placeIds, index, -1)">↑ Lên</button>
              <button type="button" class="rd-btn rd-btn--outline" :disabled="index === selected.length - 1" :aria-label="`Đưa ${place?.name ?? 'địa điểm'} xuống`" @click="form.placeIds = movePlace(form.placeIds, index, 1)">↓ Xuống</button>
              <button type="button" class="rd-btn rd-btn--outline" :aria-label="`Bỏ ${place?.name ?? 'địa điểm'} khỏi danh sách`" @click="form.placeIds = removePlace(form.placeIds, id)">Bỏ</button>
            </div>
          </li>
        </ol>
        <p v-else class="rd-field__hint">Chưa chọn địa điểm. Tìm và thêm ở dưới nhé.</p>
        <label class="rd-field"><span class="rd-field__label">Tìm địa điểm đang hiển thị</span><input v-model="query" class="rd-input" type="search" placeholder="Gõ tên, có dấu hoặc không dấu"></label>
        <p class="rd-field__hint" aria-live="polite">{{ candidates.length }} địa điểm có thể thêm.</p>
        <ul class="rd-curated-editor__candidates">
          <li v-for="place in candidates" :key="place.id" class="rd-curated-editor__row">
            <div class="rd-curated-editor__name"><strong>{{ place.name }}</strong><span class="rd-field__hint">{{ CATEGORY_LABEL[place.category] }}</span></div>
            <button type="button" class="rd-btn rd-btn--outline" :disabled="selected.length >= 50" :aria-label="`Thêm ${place.name}`" @click="form.placeIds = addPlace(form.placeIds, place.id)">Thêm</button>
          </li>
        </ul>
      </fieldset>
      <footer class="rd-curated-editor__footer">
        <p class="rd-field__hint" role="status">{{ dirty ? (localKept ? 'Có thay đổi chưa lưu lên máy chủ, đã giữ trên máy này.' : 'Có thay đổi chưa lưu lên máy chủ.') : 'Nội dung đã lưu sẽ hiện trên web trong tối đa một giờ.' }}</p>
        <div class="rd-curated-editor__actions">
          <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="editor.save('draft')">{{ list?.status === 'published' ? 'Chuyển về nháp' : 'Lưu nháp' }}</button>
          <button type="button" class="rd-btn rd-btn--primary" :disabled="busy || !selected.length" @click="editor.save('published')">{{ busy ? 'Đang lưu…' : (list?.status === 'published' ? 'Lưu và công khai' : 'Công khai danh sách') }}</button>
        </div>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.rd-curated-editor { max-width: 1000px; display: flex; flex-direction: column; gap: var(--space-4); padding-bottom: var(--space-6); }
.rd-curated-editor__title { margin: 0; font: 700 28px/1.2 var(--font-display); }
.rd-curated-editor__back { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; overflow-wrap: anywhere; }
.rd-curated-editor__form { display: flex; flex-direction: column; gap: var(--space-4); }
.rd-curated-editor__selected, .rd-curated-editor__candidates { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.rd-curated-editor__candidates { max-height: 420px; overflow-y: auto; }
.rd-curated-editor__row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: var(--border-hair) solid var(--line); flex-wrap: wrap; }
.rd-curated-editor__name { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; flex: 1 1 180px; overflow-wrap: anywhere; }
.rd-curated-editor__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-curated-editor__actions .rd-btn { min-height: var(--tap-min); padding: 0 var(--space-3); }
.rd-curated-editor__footer { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) 0; }
fieldset { min-width: 0; margin: 0; }
</style>
