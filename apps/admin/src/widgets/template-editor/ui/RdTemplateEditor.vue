<script setup lang="ts">
import { TemplateDragPayload, WEEK_DAYS } from '@ranhduong/contracts';
import { slugify } from '@ranhduong/geo';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, RouterLink } from 'vue-router';
import { CITY_SLUG } from '@/shared/config';
import { useTemplateEditor } from '../model/use-template-editor';
import RdTemplatePicker from './RdTemplatePicker.vue';
import RdTemplateTimeline from './RdTemplateTimeline.vue';
import RdTemplatePreview from './RdTemplatePreview.vue';

const props = defineProps<{ templateId: string | null }>();
const emit = defineEmits<{ created: [id: string] }>();
const editor = useTemplateEditor(props.templateId, (id) => emit('created', id));
const { template, form, places, analysis, loading, loadError, errors, notice, busy, loginRequired, loginReturnTo, restorable, dirty, localKept } = editor;
const panel = ref<'library' | 'timeline' | 'preview'>('timeline');
const errorCount = computed(() => analysis.value.issues.filter((issue) => issue.level === 'error').length);
const warningCount = computed(() => analysis.value.issues.filter((issue) => issue.level === 'warning').length);
const slug = computed(() => template.value?.slug ?? slugify(form.value.title));
const publicUrl = computed(() => `https://ranhduong.vn/${CITY_SLUG}/lich-trinh/${slug.value || 'ten-lich-trinh'}`);
const feedbackEl = ref<HTMLElement | null>(null);
function confirmLeave(): boolean { return !dirty.value || localKept.value || window.confirm('Chưa lưu được nội dung trên máy này. Rời trang sẽ mất thay đổi, bạn vẫn muốn rời đi?'); }
onBeforeRouteLeave(confirmLeave);
onBeforeRouteUpdate((to, from) => to.params.id === from.params.id || confirmLeave());
function beforeUnload(event: BeforeUnloadEvent): void { if (dirty.value && !localKept.value) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload));
watch(errors, async (messages) => {
  if (!messages.length) return;
  await nextTick(); feedbackEl.value?.scrollIntoView({ block: 'center' }); feedbackEl.value?.focus({ preventScroll: true });
});
function drop(event: DragEvent, day: number, index: number): void {
  if (busy.value) return;
  try {
    const parsed = TemplateDragPayload.safeParse(JSON.parse(event.dataTransfer?.getData('application/x-rd-itinerary') ?? ''));
    if (!parsed.success) return;
    if (parsed.data.kind === 'stop') editor.move(parsed.data.key, day, index);
    else {
      const placeId = parsed.data.placeId;
      const place = places.value.find((p) => p.id === placeId);
      if (!place || !['active', 'draft'].includes(place.status) || !form.value.days[day] || form.value.days[day]!.stops.length >= 20) return;
      editor.add(day, place.id);
      const added = form.value.days[day]?.stops.at(-1);
      if (added) editor.move(added.key, day, index);
    }
  } catch { /* Foreign drag data is ignored. */ }
}
function removeDay(day: number): void {
  if (form.value.days[day]?.stops.length && !window.confirm(`Bỏ ngày ${day + 1} và các điểm dừng trong ngày này?`)) return;
  editor.removeDay(day);
}
</script>
<template>
  <div class="rd-template-editor">
    <RouterLink class="rd-template-editor__link" to="/lich-trinh">← Lịch trình mẫu</RouterLink>
    <h1>{{ template ? 'Sửa lịch trình mẫu' : 'Tạo lịch trình mẫu' }}</h1>
    <p v-if="loading" aria-live="polite">Đang tải lịch trình…</p>
    <div v-else-if="loadError" class="rd-callout rd-callout--bad" role="alert"><p>{{ loadError }}</p><button type="button" class="rd-btn rd-btn--outline" @click="editor.load">Thử lại</button><RouterLink v-if="loginRequired" class="rd-template-editor__link" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại</RouterLink></div>
    <form v-else class="rd-template-editor__form" @submit.prevent>
      <div v-if="restorable" class="rd-callout rd-callout--warn"><p>Có nội dung chưa lưu trên máy này.</p><div class="rd-template-editor__actions"><button type="button" class="rd-btn rd-btn--outline" @click="editor.restore">Khôi phục</button><button type="button" class="rd-btn rd-btn--outline" @click="editor.discardLocal">Bỏ bản trên máy</button></div></div>
      <div v-if="errors.length" ref="feedbackEl" class="rd-callout rd-callout--bad" tabindex="-1" role="alert"><p v-for="message in errors" :key="message">{{ message }}</p><RouterLink v-if="loginRequired" class="rd-template-editor__link" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại để lưu tiếp</RouterLink></div>
      <p v-if="notice" class="rd-callout rd-callout--ok" role="status">{{ notice }}</p>
      <fieldset class="rd-admin-section" :disabled="busy">
        <legend class="rd-admin-section__title">Thông tin lịch trình · {{ form.days.length }} ngày</legend>
        <span :class="['rd-status', template?.status === 'published' ? 'rd-status--ok' : 'rd-status--draft']">{{ template?.status === 'published' ? 'Đang công khai' : 'Bản nháp' }}</span>
        <label class="rd-field"><span class="rd-field__label">Tên lịch trình</span><input v-model="form.title" class="rd-input" maxlength="200" required></label>
        <label class="rd-field"><span class="rd-field__label">Mô tả</span><textarea v-model="form.description" class="rd-input" maxlength="4000" rows="3" /></label>
        <div class="rd-template-editor__metadata">
          <label class="rd-field"><span class="rd-field__label">Ngày đầu là</span><select v-model.number="form.startWeekday" class="rd-input"><option v-for="weekday in WEEK_DAYS" :key="weekday.day" :value="weekday.day">{{ weekday.label }}</option></select><span class="rd-field__hint">Dùng để kiểm tra giờ mở cửa. Các ngày sau nối tiếp.</span></label>
          <label class="rd-field"><span class="rd-field__label">Mùa phù hợp</span><input v-model="form.season" class="rd-input" maxlength="100" placeholder="Ví dụ: mùa mai anh đào"></label>
          <label class="rd-field"><span class="rd-field__label">Phong cách</span><input v-model="form.style" class="rd-input" maxlength="100" placeholder="Ví dụ: cà phê và thiên nhiên"></label>
          <label class="rd-field"><span class="rd-field__label">Phương tiện</span><select v-model="form.transport" class="rd-input"><option value="motorbike">Xe máy</option><option value="car">Ô tô</option><option value="taxi">Taxi</option></select></label>
          <label class="rd-field"><span class="rd-field__label">Nhịp độ</span><select v-model="form.pace" class="rd-input"><option value="relaxed">Thong thả</option><option value="packed">Đi nhiều</option></select></label>
          <label class="rd-field"><span class="rd-field__label">Slug</span><input class="rd-input" :value="slug" readonly><span class="rd-field__hint">Tự tạo khi lưu lần đầu; giữ nguyên khi sửa tên.</span></label>
        </div>
        <details><summary class="rd-template-editor__link">Tiêu đề và mô tả trên Google</summary><label class="rd-field"><span class="rd-field__label">Tiêu đề Google (để trống dùng tên lịch trình)</span><input v-model="form.seoTitle" class="rd-input" maxlength="200"></label><label class="rd-field"><span class="rd-field__label">Mô tả Google (để trống dùng mô tả lịch trình)</span><textarea v-model="form.seoDescription" class="rd-input" maxlength="500" rows="2" /></label></details>
      </fieldset>
      <div :class="['rd-callout', errorCount ? 'rd-callout--bad' : warningCount ? 'rd-callout--warn' : 'rd-callout--ok']" role="status"><strong>{{ errorCount }} lỗi · {{ warningCount }} nhắc nhở</strong><p>{{ errorCount ? 'Sửa hết lỗi trước khi công khai. Nháp vẫn lưu được.' : 'Có thể công khai. Kiểm tra các nhắc nhở và bản xem trước trước khi lưu.' }}</p><button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="editor.refreshPlaces">Kiểm lại dữ liệu địa điểm</button><p class="rd-field__hint">Giờ đi tự tính từ thời gian dừng và di chuyển ước lượng, làm tròn 5 phút. Sửa tay sẽ giữ giờ bạn chọn.</p></div>
      <div class="rd-template-editor__tabs" role="group" aria-label="Phần soạn lịch trình"><button type="button" class="rd-btn rd-btn--outline" :aria-pressed="panel === 'library'" @click="panel = 'library'">Kho địa điểm</button><button type="button" class="rd-btn rd-btn--outline" :aria-pressed="panel === 'timeline'" @click="panel = 'timeline'">Lịch trình</button><button type="button" class="rd-btn rd-btn--outline" :aria-pressed="panel === 'preview'" @click="panel = 'preview'">Xem trước</button></div>
      <div class="rd-template-editor__columns">
        <div :class="['rd-template-editor__panel', { 'is-selected': panel === 'library' }]"><RdTemplatePicker :places="places" :days="form.days" :busy="busy" @add="editor.add" /></div>
        <div :class="['rd-template-editor__panel', { 'is-selected': panel === 'timeline' }]"><RdTemplateTimeline :days="form.days" :places="places" :analysis="analysis" :busy="busy" @start="(day, value) => { form.days[day]!.startTime = value; }" @stop="editor.setStop" @move="editor.move" @remove="editor.remove" @replace="editor.replace" @drop="drop" @remove-day="removeDay" @add-day="editor.addDay" /></div>
        <div :class="['rd-template-editor__panel', { 'is-selected': panel === 'preview' }]"><RdTemplatePreview :form="form" :analysis="analysis" :places="places" :url="publicUrl" /></div>
      </div>
      <footer class="rd-template-editor__footer"><p class="rd-field__hint" role="status">{{ dirty ? (localKept ? 'Có thay đổi chưa lưu lên máy chủ, đã giữ trên máy này.' : 'Có thay đổi chưa lưu lên máy chủ.') : 'Lịch trình đã lưu sẽ dùng dữ liệu giờ mở cửa hiện tại khi công khai.' }}</p><div class="rd-template-editor__actions"><button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="editor.save('draft')">{{ template?.status === 'published' ? 'Chuyển về nháp' : 'Lưu nháp' }}</button><button type="button" class="rd-btn rd-btn--primary" :disabled="busy || !analysis.canPublish || !form.title.trim()" @click="editor.save('published')">{{ busy ? 'Đang lưu…' : template?.status === 'published' ? 'Lưu và công khai' : 'Công khai lịch trình' }}</button></div></footer>
    </form>
  </div>
</template>
<style scoped>
.rd-template-editor, .rd-template-editor__form { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.rd-template-editor { padding-bottom: var(--space-6); }
h1 { margin: 0; font: 700 28px/1.2 var(--font-display); }
.rd-template-editor__link { display: inline-flex; align-items: center; min-height: var(--tap-min); font-weight: 600; cursor: pointer; overflow-wrap: anywhere; }
.rd-template-editor__metadata { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.rd-template-editor__actions, .rd-template-editor__tabs { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-template-editor__actions .rd-btn, .rd-template-editor__tabs .rd-btn { padding: 0 var(--space-3); min-height: var(--tap-min); }
.rd-template-editor__tabs [aria-pressed='true'] { background: var(--ink); color: var(--paper-raised); }
.rd-template-editor__panel { display: none; min-width: 0; }
.rd-template-editor__panel.is-selected { display: block; }
.rd-template-editor__footer { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4) 0; }
fieldset { min-width: 0; margin: 0; }
@media (max-width: 479px) { .rd-template-editor__metadata { grid-template-columns: minmax(0, 1fr); } }
@media (min-width: 1200px) { .rd-template-editor__tabs { display: none; } .rd-template-editor__columns { display: grid; grid-template-columns: minmax(230px, .9fr) minmax(340px, 1.4fr) minmax(250px, 1fr); gap: var(--space-4); align-items: start; } .rd-template-editor__panel { display: block; } }
</style>
