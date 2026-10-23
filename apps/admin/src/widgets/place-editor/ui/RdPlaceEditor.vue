<script setup lang="ts">
import {
  BEST_TIME_LABEL,
  BestTime,
  CATEGORY_LABEL,
  canVerify,
  PLACE_STATUS_LABEL,
  PLACE_TRANSPORT_LABEL,
  PlacePhoto,
  PUBLIC_CATEGORIES,
  TAG_LABEL,
  tagLabel,
  Transport,
  type ActivationIssueCode,
  type AdminPlacePhoto,
  type PlaceCategory,
  photoVariantKey,
} from '@ranhduong/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { PLACE_STATUS_CLASS } from '@/entities/place/model/status';
import { toPlaceSummary } from '@/entities/place/model/summary';
import { verifySourceOptions } from '@/entities/place/model/verify-options';
import RdDuplicateWarning from '@/features/duplicate-warning/ui/RdDuplicateWarning.vue';
import RdLocationPicker from '@/features/location-picker/ui/RdLocationPicker.vue';
import RdOpeningHoursEditor from '@/features/opening-hours-editor/ui/RdOpeningHoursEditor.vue';
import RdPhotoUpload from '@/features/photo-upload/ui/RdPhotoUpload.vue';
import { editorActions, stepFor, type DialogStep, type PlaceAction } from '@/features/place-status/model/actions';
import RdPlaceActionsDialog from '@/features/place-status/ui/RdPlaceActionsDialog.vue';
import { CITY_SLUG, MEDIA_BASE, WEB_BASE } from '@/shared/config';
import { useConfirm } from '@/shared/lib/confirm';
import { listReturnLocation } from '@/shared/lib/list-return';
import { daysAgoText, formatLocalDate, formatLocalTime } from '@/shared/lib/time';
import { useToast } from '@/shared/lib/toast';
import { isSameRecordId, useUnsavedGuard } from '@/shared/lib/unsaved-guard';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';
import RdField from '@/shared/ui/RdField.vue';
import RdFormSection from '@/shared/ui/RdFormSection.vue';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import RdSkeleton from '@/shared/ui/RdSkeleton.vue';
import RdStickyActions from '@/shared/ui/RdStickyActions.vue';
import { alsoCategoryChoices } from '../model/also-categories';
import { activationChecklist } from '../model/checklist';
import { usePlaceEditor } from '../model/use-place-editor';
import RdActivationChecklist from './RdActivationChecklist.vue';

const props = defineProps<{ placeId: string | null }>();
const emit = defineEmits<{ created: [id: string] }>();
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const editor = usePlaceEditor(props.placeId, (id) => emit('created', id));
const { load, city, place, form, errors, notice, busy, restorable, localKept, duplicates, duplicateFailed, zoneSuggestion, status, dirty, issues } = editor;

useUnsavedGuard({
  dirty: () => dirty.value,
  kept: () => localKept.value,
  flush: editor.flushLocal,
  skip: (to) => isSameRecordId(to, editor.placeId.value),
});

const editorEl = ref<HTMLElement | null>(null);
const noticeEl = ref<HTMLElement | null>(null);
const photoBusy = ref(false);
// Lưu xong báo bằng thông báo đáy; lỗi thì đưa ô sai đầu tiên (hoặc khung báo) vào tầm nhìn.
watch(notice, async (value) => {
  if (value?.kind === 'ok') {
    toast.show(value.messages.join(' '));
    return;
  }
  if (value?.kind !== 'bad') return;
  await nextTick();
  const invalid = editorEl.value?.querySelector<HTMLElement>('[aria-invalid="true"]');
  const target = invalid ?? noticeEl.value;
  target?.scrollIntoView({ block: 'center' });
  target?.focus({ preventScroll: true });
});

const PRICE_OPTIONS = [
  { value: '', label: 'Chưa rõ' },
  { value: '1', label: '1 · rẻ nhất' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4 · đắt nhất' },
] as const;
const COVER_OPTIONS = [
  { value: '', label: 'Chưa rõ' },
  { value: 'full', label: 'Trong nhà hoặc có mái che hết' },
  { value: 'partial', label: 'Có cả chỗ che mưa và chỗ ngoài trời' },
  { value: 'none', label: 'Ngoài trời, không chỗ che mưa' },
] as const;

const categoryOptions = computed(() => {
  const list: PlaceCategory[] = [...PUBLIC_CATEGORIES];
  const current = form.value.category;
  if (current !== '' && !list.includes(current)) list.push(current);
  return list.map((value) => ({ value, label: CATEGORY_LABEL[value] }));
});
const alsoOptions = computed(() => alsoCategoryChoices(form.value.category, form.value.alsoCategories));
const tagOptions = computed(() => [...new Set([...Object.keys(TAG_LABEL), ...form.value.tags])].map((slug) => ({ slug, label: tagLabel(slug) })));
const verifyOptions = computed(() => verifySourceOptions(form.value.category));
const boundaryNames = computed(() => (zoneSuggestion.value.kind === 'boundary' ? zoneSuggestion.value.zones.map((z) => z.name).join(' và ') : ''));
const differsZone = computed(() => (zoneSuggestion.value.kind === 'differs' ? zoneSuggestion.value.zone : null));
const loginReturnTo = computed(() => `/dia-diem/${editor.placeId.value ?? 'moi'}`);
const photoComplete = (photo: AdminPlacePhoto) => PlacePhoto.safeParse(photo).success;
const photoCredit = (photo: AdminPlacePhoto) => [photo.credit, photo.license].filter(Boolean).join(' · ') || 'chưa ghi nguồn';

const placesLink = listReturnLocation('places');
const crumbs = [{ label: 'Địa điểm', to: placesLink }];
const headerTitle = computed(() => {
  if (load.value.kind === 'loading') return 'Đang tải địa điểm…';
  if (place.value) return place.value.name;
  return load.value.kind === 'ready' ? 'Thêm địa điểm' : 'Địa điểm';
});
const checklist = computed(() => activationChecklist(issues.value));
function badge(code: ActivationIssueCode): 'ok' | 'missing' {
  return checklist.value.find((item) => item.code === code)?.ok ? 'ok' : 'missing';
}
const summary = computed(() => (place.value ? toPlaceSummary(place.value) : null));
const actions = computed(() => (summary.value ? editorActions(summary.value, dirty.value) : null));
const now = ref(new Date());
const publicUrl = computed(() => (place.value && status.value === 'active' ? `${WEB_BASE}/${CITY_SLUG}/dia-diem/${place.value.slug}` : null));
const lastVerified = computed(() => {
  const iso = place.value?.lastVerifiedAt;
  return iso ? `${formatLocalDate(iso)} (${daysAgoText(iso, now.value).toLowerCase()})` : 'Chưa xác minh';
});
const saveState = computed(() => {
  if (busy.value) return busy.value === 'activate' ? 'Đang kích hoạt…' : 'Đang lưu…';
  if (dirty.value) return localKept.value ? 'Có thay đổi chưa lưu (đã giữ trên máy này).' : 'Có thay đổi chưa lưu.';
  return place.value ? `Đã lưu lúc ${formatLocalTime(place.value.updatedAt)}.` : '';
});

/** Link trong danh sách điều kiện: cuộn tới mục và đưa focus vào tiêu đề mục. */
function goTo(target: string): void {
  const section = document.getElementById(target);
  section?.scrollIntoView({ block: 'start' });
  section?.querySelector<HTMLElement>('[data-section-title]')?.focus({ preventScroll: true });
}

async function onDiscard(): Promise<void> {
  const saved = place.value;
  const ok = await confirm({
    title: 'Bỏ các thay đổi chưa lưu?',
    body: saved ? `Form trở về bản đã lưu lúc ${formatLocalTime(saved.updatedAt)}.` : 'Form trở về trống như lúc mới mở.',
    confirmLabel: 'Bỏ thay đổi',
    cancelLabel: 'Giữ lại',
    tone: 'danger',
  });
  if (ok) editor.discardChanges();
}

const dialog = ref<{ start: DialogStep } | null>(null);
let completed: DialogStep['kind'] | null = null;
function openAction(action: PlaceAction): void {
  const step = stepFor(action);
  if (!step) return;
  now.value = new Date();
  dialog.value = { start: step };
}
// Trong hàm xử lý sự kiện, TypeScript không giữ phép thu hẹp của v-if nên đọc lại ở đây.
function openVerify(): void {
  const verify = actions.value?.verify;
  if (verify) openAction(verify);
}
function onActionDone(message: string): void {
  completed = dialog.value?.start.kind ?? null;
  toast.show(message);
}
/** Xoá nháp xong thì về danh sách (đúng bộ lọc lần trước); thao tác khác xong thì tải lại địa điểm. */
function onActionClose(): void {
  const done = completed;
  completed = null;
  dialog.value = null;
  if (done === 'delete') void router.push(placesLink);
  else if (done) void editor.refresh();
}
</script>

<template>
  <div class="rd-admin-editor">
    <RdPageHeader :title="headerTitle" :crumbs="crumbs">
      <template v-if="load.kind === 'ready'" #status>
        <span :class="['rd-status', PLACE_STATUS_CLASS[status]]">{{ PLACE_STATUS_LABEL[status] }}</span>
      </template>
      <template v-if="place" #meta>
        <span>Đường dẫn: ranhduong.vn/{{ CITY_SLUG }}/dia-diem/{{ place.slug }}{{ status === 'draft' ? ' (đổi theo tên cho tới khi kích hoạt)' : '' }}</span>
      </template>
    </RdPageHeader>

    <RdSkeleton v-if="load.kind === 'loading'" :rows="4" variant="card" />
    <RdEmptyState v-else-if="load.kind === 'not-found'" kind="empty" title="Không tìm thấy địa điểm này.">
      <RouterLink class="rd-btn rd-btn--outline" :to="placesLink">Về danh sách địa điểm</RouterLink>
    </RdEmptyState>
    <RdEmptyState v-else-if="load.kind === 'error'" kind="error" :title="load.message">
      <button type="button" class="rd-btn rd-btn--outline" @click="editor.retry">Thử lại</button>
    </RdEmptyState>
    <template v-else>
      <div v-if="restorable" class="rd-callout rd-callout--warn rd-admin-banner" role="status">
        <p class="rd-admin-line">
          Có bản đang sửa dở trên máy này, lưu lúc {{ formatLocalTime(restorable.savedAt) }}.
          <template v-if="restorable.stale">Bản trên máy chủ đã đổi sau đó; khôi phục rồi lưu sẽ ghi đè.</template>
        </p>
        <div class="rd-admin-banner__actions">
          <button type="button" class="rd-btn rd-btn--primary" @click="editor.restoreLocal">Khôi phục</button>
          <button type="button" class="rd-btn rd-btn--outline" @click="editor.discardLocal">Bỏ bản trên máy</button>
        </div>
      </div>

      <div v-if="notice?.kind === 'bad'" ref="noticeEl" tabindex="-1" class="rd-callout rd-callout--bad" role="alert">
        <p v-for="(message, i) in notice.messages" :key="i" class="rd-admin-line">{{ message }}</p>
        <RouterLink v-if="notice.login" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại</RouterLink>
      </div>

      <div class="rd-admin-editor__grid">
        <div ref="editorEl" class="rd-admin-editor__main">
          <p class="rd-quiet rd-admin-line">Ô có dấu * bắt buộc để lưu. Mục ghi “cần để kích hoạt” phải đủ trước khi hiện trên web.</p>
          <RdActivationChecklist class="rd-admin-only-narrow" heading-id="checklist-top-title" :items="checklist" :draft="status === 'draft'" @go="goTo" />

          <RdFormSection id="sec-basic" title="Thông tin cơ bản">
            <RdField v-slot="{ id, describedBy, invalid }" label="Tên" required :error="errors.name">
              <input :id="id" v-model="form.name" class="rd-input" type="text" autocomplete="off" aria-required="true" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdDuplicateWarning :matches="duplicates" :failed="duplicateFailed" />
            <RdField v-slot="{ id, describedBy, invalid }" label="Tên khác" hint="Tên tiếng Anh, tên cũ; cách nhau dấu ;" :error="errors.aliasesText">
              <input :id="id" v-model="form.aliasesText" class="rd-input" type="text" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdField label="Danh mục" required group :error="errors.category">
              <div class="rd-choices">
                <label v-for="option in categoryOptions" :key="option.value" class="rd-choice">
                  <input v-model="form.category" type="radio" name="category" :value="option.value" />{{ option.label }}
                </label>
              </div>
            </RdField>
            <RdField
              label="Cũng phục vụ"
              group
              hint="Quán phục vụ thêm loại khác, ví dụ cà phê có cơm trưa; tối đa 2. Hai cơ sở riêng (giờ, menu khác) thì nhập thành hai địa điểm."
              :error="errors.alsoCategories"
            >
              <div class="rd-choices">
                <label v-for="option in alsoOptions" :key="option.value" class="rd-choice">
                  <input v-model="form.alsoCategories" type="checkbox" :value="option.value" :disabled="option.disabled" />{{ option.label }}
                </label>
              </div>
            </RdField>
            <RdField v-slot="{ id, describedBy, invalid }" label="Địa chỉ" :error="errors.address">
              <input :id="id" v-model="form.address" class="rd-input" type="text" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-location" title="Vị trí" hint="cần để kích hoạt" :badge="badge('location_missing')">
            <RdLocationPicker v-if="city" v-model="form.location" :city-center="city.center.coordinates" :city-bounds="city.mapBounds" />
            <RdField label="Cụm" group :error="errors.zone">
              <div class="rd-choices">
                <label class="rd-choice"><input v-model="form.zone" type="radio" name="zone" value="" />Chưa chọn</label>
                <label v-for="zone in city?.zones ?? []" :key="zone.slug" class="rd-choice">
                  <input v-model="form.zone" type="radio" name="zone" :value="zone.slug" />{{ zone.name }}
                </label>
              </div>
              <p v-if="boundaryNames" class="rd-callout rd-callout--warn">Ghim nằm trên ranh giới {{ boundaryNames }}, chọn một cụm.</p>
              <div v-else-if="differsZone" class="rd-callout rd-callout--warn zone-differs">
                <span>Ghim nằm trong cụm {{ differsZone.name }}.</span>
                <!-- Trong hàm xử lý sự kiện, TypeScript không giữ phép thu hẹp của v-else-if nên kiểm lại differsZone. -->
                <button type="button" class="rd-btn rd-btn--outline" @click="differsZone && editor.acceptZone(differsZone.slug)">Đổi sang {{ differsZone.name }}</button>
              </div>
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-hours" title="Giờ mở cửa" hint="cần để kích hoạt" :badge="badge('hours_invalid')">
            <RdOpeningHoursEditor v-model="form.hours" :error="errors.hours" />
          </RdFormSection>

          <RdFormSection id="sec-traits" title="Đặc điểm">
            <RdField label="Thẻ" group>
              <div class="rd-choices">
                <label v-for="tag in tagOptions" :key="tag.slug" class="rd-choice"><input v-model="form.tags" type="checkbox" :value="tag.slug" />{{ tag.label }}</label>
              </div>
            </RdField>
            <RdField label="Mức giá" group hint="Theo giá đồ uống hoặc món chính.">
              <div class="rd-choices">
                <label v-for="option in PRICE_OPTIONS" :key="option.value" class="rd-choice">
                  <input v-model="form.priceLevel" type="radio" name="price" :value="option.value" />{{ option.label }}
                </label>
              </div>
            </RdField>
            <RdField label="Mái che" group hint="Khu che mưa nhỏ (mưa là hết chỗ) thì ghi thêm vào ghi chú thực tế.">
              <div class="options">
                <label v-for="option in COVER_OPTIONS" :key="option.value" class="rd-choice rd-choice--block">
                  <input v-model="form.cover" type="radio" name="cover" :value="option.value" />{{ option.label }}
                </label>
              </div>
            </RdField>
            <RdField v-slot="{ id, describedBy, invalid }" label="Thời gian tham quan (phút)" :error="errors.visitDurationText">
              <input :id="id" v-model="form.visitDurationText" class="rd-input short" type="text" inputmode="numeric" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdField label="Thời điểm đẹp" group>
              <div class="rd-choices">
                <label v-for="time in BestTime.options" :key="time" class="rd-choice"><input v-model="form.bestTime" type="checkbox" :value="time" />{{ BEST_TIME_LABEL[time] }}</label>
              </div>
            </RdField>
            <RdField label="Đi được bằng" group>
              <div class="rd-choices">
                <label v-for="mode in Transport.options" :key="mode" class="rd-choice">
                  <input v-model="form.transport" type="checkbox" :value="mode" />{{ PLACE_TRANSPORT_LABEL[mode] }}
                </label>
              </div>
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-notes" title="Ghi chú thực tế">
            <RdField
              v-slot="{ id, describedBy, invalid }"
              label="Ghi chú"
              hint="Viết bằng lời của bạn, mỗi câu một điều có ích: giờ nào đẹp, ngồi chỗ nào, đường đi, chỗ gửi xe. Không chép review của người khác."
              :count="{ value: form.practicalNotes.length, max: 1000 }"
              :error="errors.practicalNotes"
            >
              <textarea :id="id" v-model="form.practicalNotes" class="rd-input" rows="5" :aria-invalid="invalid" :aria-describedby="describedBy"></textarea>
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-contact" title="Liên hệ">
            <RdField v-slot="{ id, describedBy, invalid }" label="Số điện thoại" :error="errors.phone">
              <input :id="id" v-model="form.phone" class="rd-input" type="tel" inputmode="tel" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdField v-slot="{ id, describedBy, invalid }" label="Fanpage" :error="errors.fanpage">
              <input :id="id" v-model="form.fanpage" class="rd-input" type="url" inputmode="url" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
            <RdField v-slot="{ id, describedBy, invalid }" label="Website" :error="errors.website">
              <input :id="id" v-model="form.website" class="rd-input" type="url" inputmode="url" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy" />
            </RdField>
          </RdFormSection>

          <RdFormSection id="sec-photos" title="Ảnh" hint="cần để kích hoạt" :badge="badge('photo_source_missing')">
            <p v-if="!place || place.photos.length === 0" class="rd-field__hint">Chưa có ảnh; trang địa điểm sẽ hiện "Ảnh đang cập nhật".</p>
            <ul v-else class="photos">
              <li v-for="(photo, i) in place.photos" :key="photo.key">
                <img :src="`${MEDIA_BASE}/${photoVariantKey(photo.key, 400)}`" :alt="`Ảnh ${i + 1} của ${place.name}`" width="96" height="96" loading="lazy" />
                <span>Ảnh {{ i + 1 }}: {{ photoCredit(photo) }}</span>
                <a v-if="photo.sourceUrl" :href="photo.sourceUrl" target="_blank" rel="noopener noreferrer">Ảnh gốc</a>
                <span :class="['rd-status', photoComplete(photo) ? 'rd-status--ok' : 'rd-status--bad']">{{ photoComplete(photo) ? 'Có nguồn' : 'Thiếu nguồn' }}</span>
              </li>
            </ul>
            <RdPhotoUpload :place-id="editor.placeId.value" :disabled="busy !== null" @attached="editor.applyPhotos" @busy="photoBusy = $event" />
          </RdFormSection>
        </div>

        <aside class="rd-admin-editor__side" aria-label="Kích hoạt, xác minh và trạng thái">
          <RdActivationChecklist class="rd-admin-only-wide" heading-id="checklist-side-title" list-id="activation-issues" :items="checklist" :draft="status === 'draft'" @go="goTo" />

          <RdFormSection id="sec-verify" title="Xác minh" hint="cần để kích hoạt" :badge="badge('verify_source_missing')">
            <RdField label="Thông tin này đã được ai xác nhận?" group :error="errors.verifySource">
              <div class="options">
                <label v-for="option in verifyOptions" :key="option.value" class="rd-choice rd-choice--block">
                  <input v-model="form.verifySource" type="radio" name="verify" :value="option.value" />
                  <span class="option-text">{{ option.label }}<span class="rd-field__hint">{{ option.hint }}</span></span>
                </label>
              </div>
            </RdField>
            <p class="rd-field__hint">Xác minh lần cuối: {{ lastVerified }}</p>
            <template v-if="actions">
              <p v-if="actions.locked" class="rd-field__hint">Lưu thay đổi trước khi xác minh hay đổi trạng thái.</p>
              <button v-if="actions.verify" type="button" class="rd-btn rd-btn--outline" :disabled="actions.locked || busy !== null" @click="openVerify">Đánh dấu đã xác minh</button>
              <p v-else-if="canVerify(status)" class="rd-field__hint">Đủ các điều kiện khác rồi mới đánh dấu đã xác minh được.</p>
            </template>
          </RdFormSection>

          <RdFormSection id="sec-web" title="Trên web">
            <p class="rd-admin-line"><span :class="['rd-status', PLACE_STATUS_CLASS[status]]">{{ PLACE_STATUS_LABEL[status] }}</span></p>
            <template v-if="actions">
              <p v-if="actions.locked" class="rd-field__hint">Lưu thay đổi trước khi xác minh hay đổi trạng thái.</p>
              <div class="rd-admin-side-actions">
                <button v-for="action in actions.status" :key="action.label" type="button" class="rd-btn rd-btn--outline" :disabled="actions.locked || busy !== null" @click="openAction(action)">
                  {{ action.label }}
                </button>
              </div>
            </template>
            <p v-else class="rd-field__hint">Lưu nháp lần đầu rồi mới đổi trạng thái được.</p>
          </RdFormSection>

          <RdFormSection id="sec-info" title="Thông tin">
            <p class="rd-field__hint">{{ place ? `Cập nhật lúc ${formatLocalTime(place.updatedAt)}` : 'Chưa lưu lần nào.' }}</p>
            <a v-if="publicUrl" class="rd-admin-link" :href="publicUrl" target="_blank" rel="noopener noreferrer">Xem trên web ↗<span class="rd-sr-only"> (mở tab mới)</span></a>
          </RdFormSection>
        </aside>
      </div>

      <RdStickyActions :state="saveState">
        <button v-if="dirty" type="button" class="rd-btn rd-btn--ghost" :disabled="busy !== null" @click="onDiscard">Bỏ thay đổi</button>
        <template v-if="status === 'draft'">
          <button type="button" class="rd-btn rd-btn--outline" :disabled="busy !== null || photoBusy" @click="editor.save">{{ busy === 'save' ? 'Đang lưu…' : 'Lưu nháp' }}</button>
          <button type="button" class="rd-btn rd-btn--primary" :disabled="busy !== null || photoBusy || issues.length > 0" aria-describedby="activation-issues" @click="editor.activate">
            {{ busy === 'activate' ? 'Đang kích hoạt…' : 'Kích hoạt' }}
          </button>
        </template>
        <button v-else type="button" class="rd-btn rd-btn--primary" :disabled="busy !== null || photoBusy || !dirty || issues.length > 0" @click="editor.save">
          {{ busy === 'save' ? 'Đang lưu…' : 'Lưu thay đổi' }}
        </button>
      </RdStickyActions>
    </template>

    <RdPlaceActionsDialog v-if="dialog && summary" :key="dialog.start.kind" :place="summary" :start="dialog.start" :now="now" @done="onActionDone" @close="onActionClose" />
  </div>
</template>

<style scoped>
.short { max-width: 140px; }
.zone-differs { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.options { display: flex; flex-direction: column; gap: var(--space-2); }
.option-text { display: flex; flex-direction: column; gap: 2px; }
.photos { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }
.photos li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: 14px; }
.photos img { object-fit: cover; border-radius: var(--radius-thumb); background: var(--mist); }
</style>
