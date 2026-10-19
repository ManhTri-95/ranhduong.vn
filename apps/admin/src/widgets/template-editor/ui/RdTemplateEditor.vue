<script setup lang="ts">
import { TemplateDragPayload, TripInterest, TripWith, TRIP_INTEREST_LABEL, TRIP_WITH_LABEL, WEEK_DAYS, type ItineraryStatus } from '@ranhduong/contracts';
import { slugify } from '@ranhduong/geo';
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { CITY_SLUG } from '@/shared/config';
import { useConfirm } from '@/shared/lib/confirm';
import { listReturnLocation } from '@/shared/lib/list-return';
import { formatLocalTime } from '@/shared/lib/time';
import { useToast } from '@/shared/lib/toast';
import { isSameRecordId, useUnsavedGuard } from '@/shared/lib/unsaved-guard';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import RdFormSection from '@/shared/ui/RdFormSection.vue';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import RdSkeleton from '@/shared/ui/RdSkeleton.vue';
import RdStickyActions from '@/shared/ui/RdStickyActions.vue';
import { firstIssueTarget, issueCounts, publishBlocker as blockerFor, publishConfirm, templateMeta } from '../model/summary';
import { useTemplateEditor } from '../model/use-template-editor';
import RdTemplatePicker from './RdTemplatePicker.vue';
import RdTemplatePreview from './RdTemplatePreview.vue';
import RdTemplateTimeline from './RdTemplateTimeline.vue';

const props = defineProps<{ templateId: string | null }>();
const emit = defineEmits<{ created: [id: string] }>();
const editor = useTemplateEditor(props.templateId, (id) => emit('created', id));
const { template, form, places, analysis, loading, loadError, errors, notice, busy, loginRequired, loginReturnTo, restorable, restorableSavedAt, dirty, localKept } = editor;
const confirm = useConfirm();
const toast = useToast();

// Cùng quy tắc cũ: chỉ hỏi khi có thay đổi mà không giữ được trên máy; tạo xong (/moi thành /{id}) thì không hỏi.
useUnsavedGuard({ dirty: () => dirty.value, kept: () => localKept.value, skip: (to) => isSameRecordId(to, editor.id.value) });

/** Dưới 1024px: một panel mỗi lúc; từ 1024px: lịch trình luôn hiện, cột phải đổi giữa kho và xem trước. */
const panel = ref<'timeline' | 'library' | 'preview'>('timeline');
const sidePanel = ref<'library' | 'preview'>('library');
const expandedKey = ref<string | null>(null);
/** Lịch trình mới thì mở sẵn khung thông tin; đã có thì gập lại. */
const infoOpen = ref(props.templateId === null);
watch(loading, (value) => {
  if (!value) infoOpen.value = template.value === null;
});

const counts = computed(() => issueCounts(analysis.value));
const slug = computed(() => template.value?.slug ?? slugify(form.value.title));
const publicUrl = computed(() => `https://ranhduong.vn/${CITY_SLUG}/lich-trinh/${slug.value || 'ten-lich-trinh'}`);
const isPublished = computed(() => template.value?.status === 'published');
const title = computed(() => (loading.value ? 'Đang tải lịch trình…' : form.value.title.trim() || (template.value ? 'Lịch trình mẫu' : 'Lịch trình mới')));
const crumbs = [{ label: 'Lịch trình mẫu', to: listReturnLocation('templates') }];
const publishBlocker = computed(() => blockerFor(form.value.title, analysis.value));
const saveState = computed(() => {
  if (busy.value) return 'Đang lưu…';
  // Lý do nút công khai đang tắt hiện ngay trên thanh (spec 8.7), không chỉ trong tooltip.
  const blocker = publishBlocker.value ? ` Chưa công khai được: ${publishBlocker.value}.` : '';
  if (dirty.value) return (localKept.value ? 'Có thay đổi chưa lưu (đã giữ trên máy này).' : 'Có thay đổi chưa lưu.') + blocker;
  return (template.value ? 'Đã lưu. Khi công khai, lịch trình dùng giờ mở cửa hiện tại của địa điểm.' : '') + blocker;
});

const feedbackEl = ref<HTMLElement | null>(null);
watch(errors, async (messages) => {
  if (!messages.length) return;
  await nextTick();
  feedbackEl.value?.scrollIntoView({ block: 'center' });
  feedbackEl.value?.focus({ preventScroll: true });
});
watch(notice, (message) => {
  if (message) toast.show(message);
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
  } catch {
    /* Dữ liệu kéo từ nơi khác thì bỏ qua. */
  }
}

async function removeDay(day: number): Promise<void> {
  if (form.value.days[day]?.stops.length) {
    const ok = await confirm({ title: `Bỏ ngày ${day + 1}?`, body: 'Các điểm dừng trong ngày này cũng bị bỏ.', confirmLabel: 'Bỏ ngày', cancelLabel: 'Giữ lại', tone: 'danger' });
    if (!ok) return;
  }
  editor.removeDay(day);
}

async function saveAs(target: ItineraryStatus): Promise<void> {
  const kind = publishConfirm(template.value?.status ?? null, target);
  if (kind === 'first-publish') {
    const ok = await confirm({
      title: 'Công khai lịch trình?',
      body: `Trang /${CITY_SLUG}/lich-trinh/${slug.value || 'ten-lich-trinh'} sẽ hiện trên web và trong sitemap; slug giữ cố định từ giờ.`,
      confirmLabel: 'Công khai',
      cancelLabel: 'Chưa công khai',
    });
    if (!ok) return;
  }
  if (kind === 'unpublish') {
    const ok = await confirm({ title: 'Chuyển về nháp?', body: 'Lịch trình sẽ thôi hiện trên web.', confirmLabel: 'Chuyển về nháp', cancelLabel: 'Giữ công khai', tone: 'danger' });
    if (!ok) return;
  }
  await editor.save(target);
}

async function onDiscard(): Promise<void> {
  const ok = await confirm({
    title: 'Bỏ các thay đổi chưa lưu?',
    body: template.value ? 'Lịch trình trở về bản đã lưu gần nhất.' : 'Lịch trình trở về trống như lúc mới mở.',
    confirmLabel: 'Bỏ thay đổi',
    cancelLabel: 'Giữ lại',
    tone: 'danger',
  });
  if (!ok) return;
  editor.discardChanges();
  expandedKey.value = null;
}

/** Nút "✕ lỗi · ⚠ nhắc": mở đúng điểm (hoặc ngày) có vấn đề đầu tiên, cuộn tới và đưa focus vào đó. */
async function jumpToIssue(): Promise<void> {
  const target = firstIssueTarget(analysis.value, form.value.days);
  if (!target) return;
  panel.value = 'timeline';
  if (target.stopKey) expandedKey.value = target.stopKey;
  await nextTick();
  const el = target.stopKey
    ? document.querySelector<HTMLElement>(`[data-stop-toggle="${target.stopKey}"]`)
    : document.querySelector<HTMLElement>(`[data-day-title="${target.day}"]`);
  el?.scrollIntoView({ block: 'center' });
  el?.focus({ preventScroll: true });
}
</script>

<template>
  <div class="rd-admin-editor rd-template-editor">
    <RdPageHeader :title="title" :crumbs="crumbs">
      <template v-if="!loading && !loadError" #status>
        <span :class="['rd-status', isPublished ? 'rd-status--ok' : 'rd-status--draft']">{{ isPublished ? 'Đang công khai' : 'Nháp' }}</span>
      </template>
      <template v-if="!loading && !loadError" #meta>
        <span>{{ templateMeta(form) }}</span>
        <button v-if="counts.errors || counts.warnings" type="button" class="rd-btn rd-btn--ghost" @click="jumpToIssue">✕ {{ counts.errors }} lỗi · ⚠ {{ counts.warnings }} nhắc</button>
        <span v-else class="rd-status rd-status--ok">Không có lỗi hay nhắc nhở</span>
      </template>
    </RdPageHeader>

    <RdSkeleton v-if="loading" :rows="3" variant="card" />
    <RdEmptyState v-else-if="loadError" kind="error" :title="loadError">
      <button type="button" class="rd-btn rd-btn--outline" @click="editor.load">Thử lại</button>
      <RouterLink v-if="loginRequired" class="rd-btn rd-btn--outline" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại</RouterLink>
    </RdEmptyState>
    <form v-else class="rd-template-editor__form" @submit.prevent>
      <div v-if="restorable" class="rd-callout rd-callout--warn rd-admin-banner" role="status">
        <p class="rd-admin-line">Có nội dung chưa lưu trên máy này{{ restorableSavedAt ? `, giữ lúc ${formatLocalTime(restorableSavedAt)}` : '' }}.</p>
        <div class="rd-admin-banner__actions">
          <button type="button" class="rd-btn rd-btn--primary" @click="editor.restore">Khôi phục</button>
          <button type="button" class="rd-btn rd-btn--outline" @click="editor.discardLocal">Bỏ bản trên máy</button>
        </div>
      </div>
      <div v-if="errors.length" ref="feedbackEl" class="rd-callout rd-callout--bad" tabindex="-1" role="alert">
        <p v-for="message in errors" :key="message" class="rd-admin-line">{{ message }}</p>
        <RouterLink v-if="loginRequired" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại để lưu tiếp</RouterLink>
      </div>

      <RdFormSection id="tpl-info" v-model:open="infoOpen" title="Thông tin lịch trình" collapsible>
        <template #summary>{{ templateMeta(form) }} · ranhduong.vn/{{ CITY_SLUG }}/lich-trinh/{{ slug || 'ten-lich-trinh' }}</template>
        <fieldset class="rd-template-editor__fieldset" :disabled="busy">
          <legend class="rd-sr-only">Thông tin lịch trình</legend>
          <label class="rd-field"><span class="rd-field__label">Tên lịch trình</span><input v-model="form.title" class="rd-input" maxlength="200" required /></label>
          <label class="rd-field"><span class="rd-field__label">Mô tả</span><textarea v-model="form.description" class="rd-input" maxlength="4000" rows="3"></textarea></label>
          <div class="rd-template-editor__metadata">
            <label class="rd-field"><span class="rd-field__label">Ngày đầu là</span><select v-model.number="form.startWeekday" class="rd-input"><option v-for="weekday in WEEK_DAYS" :key="weekday.day" :value="weekday.day">{{ weekday.label }}</option></select><span class="rd-field__hint">Dùng để kiểm tra giờ mở cửa. Các ngày sau nối tiếp.</span></label>
            <label class="rd-field"><span class="rd-field__label">Mùa phù hợp</span><input v-model="form.season" class="rd-input" maxlength="100" placeholder="Ví dụ: mùa mai anh đào" /></label>
            <label class="rd-field"><span class="rd-field__label">Phong cách</span><input v-model="form.style" class="rd-input" maxlength="100" placeholder="Ví dụ: cà phê và thiên nhiên" /></label>
            <label class="rd-field"><span class="rd-field__label">Phương tiện</span><select v-model="form.transport" class="rd-input"><option value="motorbike">Xe máy</option><option value="car">Ô tô</option><option value="taxi">Taxi</option></select></label>
            <label class="rd-field"><span class="rd-field__label">Nhịp độ</span><select v-model="form.pace" class="rd-input"><option value="relaxed">Thong thả</option><option value="packed">Đi nhiều</option></select></label>
            <label class="rd-field"><span class="rd-field__label">Slug</span><input class="rd-input" :value="slug" readonly /><span class="rd-field__hint">Tự tạo khi lưu lần đầu; giữ nguyên khi sửa tên.</span></label>
          </div>
          <fieldset class="rd-template-editor__preferences" aria-describedby="tpl-interests-hint">
            <legend class="rd-field__label">Gu</legend>
            <p id="tpl-interests-hint" class="rd-field__hint rd-admin-line">Chọn tối đa 3 gu ({{ form.tags.length }}/3). Bấm lại để bỏ chọn.</p>
            <div class="rd-template-editor__chips">
              <button
                v-for="interest in TripInterest.options" :key="interest" type="button" class="rd-chip rd-chip--filter"
                :aria-pressed="form.tags.includes(interest)"
                :disabled="!form.tags.includes(interest) && form.tags.length >= 3"
                @click="editor.toggleInterest(interest)"
              >{{ TRIP_INTEREST_LABEL[interest] }}</button>
            </div>
          </fieldset>
          <fieldset class="rd-template-editor__preferences" aria-describedby="tpl-with-hint">
            <legend class="rd-field__label">Đi cùng ai</legend>
            <p id="tpl-with-hint" class="rd-field__hint rd-admin-line">Chọn một nhóm phù hợp. Bấm lại để bỏ chọn.</p>
            <div class="rd-template-editor__chips">
              <button
                v-for="withValue in TripWith.options" :key="withValue" type="button" class="rd-chip rd-chip--filter"
                :aria-pressed="form.with === withValue"
                @click="form.with = form.with === withValue ? undefined : withValue"
              >{{ TRIP_WITH_LABEL[withValue] }}</button>
            </div>
          </fieldset>
          <details>
            <summary class="rd-template-editor__summary">Tiêu đề và mô tả trên Google</summary>
            <label class="rd-field"><span class="rd-field__label">Tiêu đề Google (để trống dùng tên lịch trình)</span><input v-model="form.seoTitle" class="rd-input" maxlength="200" /></label>
            <label class="rd-field"><span class="rd-field__label">Mô tả Google (để trống dùng mô tả lịch trình)</span><textarea v-model="form.seoDescription" class="rd-input" maxlength="500" rows="2"></textarea></label>
          </details>
        </fieldset>
      </RdFormSection>

      <p class="rd-field__hint rd-admin-line">
        Giờ đi tự tính từ thời gian dừng và di chuyển ước lượng, làm tròn 5 phút. Sửa tay sẽ giữ giờ bạn chọn.
        <button type="button" class="rd-btn rd-btn--ghost" :disabled="busy" @click="editor.refreshPlaces">Kiểm lại dữ liệu địa điểm</button>
      </p>

      <nav class="rd-tabs rd-admin-only-narrow" aria-label="Phần soạn lịch trình">
        <div class="rd-tabs__list rd-template-editor__tabs">
          <button type="button" class="rd-tab" :aria-pressed="panel === 'timeline'" @click="panel = 'timeline'">Lịch trình</button>
          <button type="button" class="rd-tab" :aria-pressed="panel === 'library'" @click="panel = 'library'">Kho địa điểm</button>
          <button type="button" class="rd-tab" :aria-pressed="panel === 'preview'" @click="panel = 'preview'">Xem trước</button>
        </div>
      </nav>

      <div class="rd-template-editor__columns">
        <div class="rd-template-editor__pane" :data-mobile-hidden="panel !== 'timeline'">
          <RdTemplateTimeline
            :days="form.days"
            :places="places"
            :analysis="analysis"
            :busy="busy"
            :expanded-key="expandedKey"
            @expand="expandedKey = $event"
            @start="(day, value) => { form.days[day]!.startTime = value; }"
            @stop="editor.setStop"
            @move="editor.move"
            @remove="editor.remove"
            @replace="editor.replace"
            @drop="drop"
            @remove-day="removeDay"
            @add-day="editor.addDay"
          />
        </div>
        <div class="rd-template-editor__side">
          <div class="rd-tabs rd-admin-only-wide" role="group" aria-label="Cột phụ">
            <div class="rd-tabs__list rd-template-editor__tabs">
              <button type="button" class="rd-tab" :aria-pressed="sidePanel === 'library'" @click="sidePanel = 'library'">Kho địa điểm</button>
              <button type="button" class="rd-tab" :aria-pressed="sidePanel === 'preview'" @click="sidePanel = 'preview'">Xem trước</button>
            </div>
          </div>
          <div class="rd-template-editor__pane" :data-mobile-hidden="panel !== 'library'" :data-desktop-hidden="sidePanel !== 'library'">
            <RdTemplatePicker :places="places" :days="form.days" :busy="busy" @add="editor.add" />
          </div>
          <div class="rd-template-editor__pane" :data-mobile-hidden="panel !== 'preview'" :data-desktop-hidden="sidePanel !== 'preview'">
            <RdTemplatePreview :form="form" :analysis="analysis" :places="places" :url="publicUrl" />
          </div>
        </div>
      </div>

      <RdStickyActions :state="saveState">
        <button v-if="dirty" type="button" class="rd-btn rd-btn--ghost" :disabled="busy" @click="onDiscard">Bỏ thay đổi</button>
        <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="saveAs('draft')">{{ isPublished ? 'Chuyển về nháp' : 'Lưu nháp' }}</button>
        <button
          type="button"
          class="rd-btn rd-btn--primary"
          :disabled="busy || !analysis.canPublish || !form.title.trim()"
          :title="publishBlocker || undefined"
          :aria-describedby="publishBlocker ? 'tpl-publish-blocker' : undefined"
          @click="saveAs('published')"
        >
          {{ busy ? 'Đang lưu…' : isPublished ? 'Lưu và công khai' : 'Công khai lịch trình' }}
        </button>
        <span v-if="publishBlocker" id="tpl-publish-blocker" class="rd-sr-only">Chưa công khai được: {{ publishBlocker }}.</span>
      </RdStickyActions>
    </form>
  </div>
</template>

<style scoped>
.rd-template-editor__form { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; }
.rd-template-editor__fieldset { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; margin: 0; padding: 0; border: 0; }
.rd-template-editor__metadata { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.rd-template-editor__preferences { min-width: 0; margin: 0; padding: 0; border: 0; }
.rd-template-editor__chips { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
.rd-template-editor__chips .rd-chip { min-width: var(--tap-min); }
.rd-template-editor__summary { display: flex; align-items: center; min-height: var(--tap-min); font-weight: 600; cursor: pointer; }
.rd-template-editor__tabs { justify-content: flex-start; gap: var(--space-5); }
.rd-template-editor__columns { display: grid; gap: var(--space-4); align-items: start; }
.rd-template-editor__side { display: flex; flex-direction: column; gap: var(--space-3); min-width: 0; }
.rd-template-editor__pane { min-width: 0; }
details { display: flex; flex-direction: column; gap: var(--space-3); }
@media (max-width: 479px) { .rd-template-editor__metadata { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 1023.98px) { .rd-template-editor__pane[data-mobile-hidden='true'] { display: none; } }
@media (min-width: 1024px) {
  .rd-template-editor__columns { grid-template-columns: minmax(0, 1fr) 340px; }
  .rd-template-editor__pane[data-desktop-hidden='true'] { display: none; }
  .rd-template-editor__side { position: sticky; top: var(--space-6); max-height: calc(100vh - 2 * var(--space-6) - var(--admin-bar-height, 0px)); overflow-y: auto; }
}
/* Màn lớn: kho địa điểm và xem trước rộng dần theo màn. */
@media (min-width: 1280px) { .rd-template-editor__columns { grid-template-columns: minmax(0, 1fr) clamp(340px, 24vw, 440px); } }
</style>
