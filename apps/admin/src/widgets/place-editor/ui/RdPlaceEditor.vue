<script setup lang="ts">
import {
  BEST_TIME_LABEL,
  BestTime,
  CATEGORY_LABEL,
  PLACE_STATUS_LABEL,
  PLACE_TRANSPORT_LABEL,
  PlacePhoto,
  PUBLIC_CATEGORIES,
  TAG_LABEL,
  tagLabel,
  Transport,
  type AdminPlacePhoto,
  type PlaceCategory,
  type PlaceStatus,
} from '@ranhduong/contracts';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import RdDuplicateWarning from '@/features/duplicate-warning/ui/RdDuplicateWarning.vue';
import RdLocationPicker from '@/features/location-picker/ui/RdLocationPicker.vue';
import RdOpeningHoursEditor from '@/features/opening-hours-editor/ui/RdOpeningHoursEditor.vue';
import { CITY_SLUG } from '@/shared/config';
import { formatLocalTime } from '@/shared/lib/time';
import { usePlaceEditor } from '../model/use-place-editor';
import { verifySourceOptions } from '../model/verify-options';

const props = defineProps<{ placeId: string | null }>();
const emit = defineEmits<{ created: [id: string] }>();

const editor = usePlaceEditor(props.placeId, (id) => emit('created', id));
const { load, city, place, form, errors, notice, busy, restorable, duplicates, duplicateFailed, zoneSuggestion, status, dirty, issues } = editor;

const STATUS_CLASS: Record<PlaceStatus, string> = {
  draft: 'rd-status--draft',
  active: 'rd-status--ok',
  suspected: 'rd-status--bad',
  hidden: 'rd-status--warn',
  closed: 'rd-status--warn',
  merged: 'rd-status--warn',
};
const PRICE_OPTIONS = [
  { value: '', label: 'Chưa rõ' },
  { value: '1', label: '1 · rẻ nhất' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4 · đắt nhất' },
] as const;
const INDOOR_OPTIONS = [
  { value: '', label: 'Chưa rõ' },
  { value: 'indoor', label: 'Trong nhà' },
  { value: 'outdoor', label: 'Ngoài trời' },
] as const;

const categoryOptions = computed(() => {
  const list: PlaceCategory[] = [...PUBLIC_CATEGORIES];
  const current = form.value.category;
  if (current !== '' && !list.includes(current)) list.push(current);
  return list.map((value) => ({ value, label: CATEGORY_LABEL[value] }));
});
const tagOptions = computed(() => [...new Set([...Object.keys(TAG_LABEL), ...form.value.tags])].map((slug) => ({ slug, label: tagLabel(slug) })));
const verifyOptions = computed(() => verifySourceOptions(form.value.category));
const boundaryNames = computed(() => (zoneSuggestion.value.kind === 'boundary' ? zoneSuggestion.value.zones.map((z) => z.name).join(' và ') : ''));
const differsZone = computed(() => (zoneSuggestion.value.kind === 'differs' ? zoneSuggestion.value.zone : null));
const loginReturnTo = computed(() => `/dia-diem/${editor.placeId.value ?? 'moi'}`);
const saveState = computed(() => {
  if (busy.value) return '';
  if (dirty.value) return 'Có thay đổi chưa lưu lên máy chủ (đã giữ trên máy này).';
  return place.value ? 'Đã lưu.' : '';
});
const photoComplete = (photo: AdminPlacePhoto) => PlacePhoto.safeParse(photo).success;
const photoCredit = (photo: AdminPlacePhoto) => [photo.credit, photo.license].filter(Boolean).join(' · ') || 'chưa ghi nguồn';
</script>

<template>
  <div v-if="load.kind === 'loading'" class="skeleton" aria-busy="true"><span class="rd-quiet">Đang tải địa điểm…</span></div>
  <p v-else-if="load.kind === 'not-found'" class="rd-callout rd-callout--warn">
    Không tìm thấy địa điểm này. <RouterLink to="/dia-diem">Về trang địa điểm</RouterLink>
  </p>
  <div v-else-if="load.kind === 'error'" class="rd-callout rd-callout--bad" role="alert">
    <p class="line">{{ load.message }}</p>
    <button type="button" class="rd-btn rd-btn--outline" @click="editor.retry">Thử lại</button>
  </div>
  <div v-else class="editor">
    <header class="head">
      <h1 class="title">{{ place ? place.name : 'Thêm địa điểm' }}</h1>
      <span :class="['rd-status', STATUS_CLASS[status]]">{{ PLACE_STATUS_LABEL[status] }}</span>
      <p v-if="place" class="rd-field__hint">
        Đường dẫn: ranhduong.vn/{{ CITY_SLUG }}/dia-diem/{{ place.slug }}{{ status === 'draft' ? ' (đổi theo tên cho tới khi kích hoạt)' : '' }}
      </p>
    </header>

    <div v-if="restorable" class="rd-callout rd-callout--warn banner" role="status">
      <p class="line">
        Có bản đang sửa dở trên máy này, lưu lúc {{ formatLocalTime(restorable.savedAt) }}.
        <template v-if="restorable.stale">Bản trên máy chủ đã đổi sau đó; khôi phục rồi lưu sẽ ghi đè.</template>
      </p>
      <div class="banner__actions">
        <button type="button" class="rd-btn rd-btn--primary" @click="editor.restoreLocal">Khôi phục</button>
        <button type="button" class="rd-btn rd-btn--outline" @click="editor.discardLocal">Bỏ bản trên máy</button>
      </div>
    </div>

    <div v-if="notice" :class="['rd-callout', notice.kind === 'ok' ? 'rd-callout--ok' : 'rd-callout--bad']" :role="notice.kind === 'ok' ? 'status' : 'alert'">
      <p v-for="(message, i) in notice.messages" :key="i" class="line">{{ message }}</p>
      <RouterLink v-if="notice.login" :to="{ path: '/dang-nhap', query: { returnTo: loginReturnTo } }">Đăng nhập lại</RouterLink>
    </div>

    <section class="rd-admin-section" aria-labelledby="sec-basic">
      <h2 id="sec-basic" class="rd-admin-section__title">Thông tin cơ bản</h2>
      <div class="rd-field">
        <label class="rd-field__label" for="f-name">Tên</label>
        <input id="f-name" v-model="form.name" class="rd-input" type="text" autocomplete="off" :aria-invalid="!!errors.name" aria-describedby="f-name-error" />
        <p v-if="errors.name" id="f-name-error" class="rd-field__error">{{ errors.name }}</p>
        <RdDuplicateWarning :matches="duplicates" :failed="duplicateFailed" />
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="f-aliases">Tên khác</label>
        <input id="f-aliases" v-model="form.aliasesText" class="rd-input" type="text" autocomplete="off" :aria-invalid="!!errors.aliasesText" aria-describedby="f-aliases-hint" />
        <p id="f-aliases-hint" class="rd-field__hint">Tên tiếng Anh, tên cũ; cách nhau dấu ;</p>
        <p v-if="errors.aliasesText" class="rd-field__error">{{ errors.aliasesText }}</p>
      </div>
      <fieldset class="rd-field">
        <legend class="rd-field__label">Danh mục</legend>
        <div class="rd-choices">
          <label v-for="option in categoryOptions" :key="option.value" class="rd-choice">
            <input v-model="form.category" type="radio" name="category" :value="option.value" />{{ option.label }}
          </label>
        </div>
        <p v-if="errors.category" class="rd-field__error">{{ errors.category }}</p>
      </fieldset>
      <div class="rd-field">
        <label class="rd-field__label" for="f-address">Địa chỉ</label>
        <input id="f-address" v-model="form.address" class="rd-input" type="text" autocomplete="off" :aria-invalid="!!errors.address" />
        <p v-if="errors.address" class="rd-field__error">{{ errors.address }}</p>
      </div>
    </section>

    <section class="rd-admin-section" aria-labelledby="sec-location">
      <h2 id="sec-location" class="rd-admin-section__title">Vị trí</h2>
      <RdLocationPicker v-if="city" v-model="form.location" :city-center="city.center.coordinates" :city-bounds="city.mapBounds" />
      <fieldset class="rd-field">
        <legend class="rd-field__label">Cụm</legend>
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
          <button type="button" class="rd-btn rd-btn--outline" @click="differsZone && editor.acceptZone(differsZone.slug)">
            Đổi sang {{ differsZone.name }}
          </button>
        </div>
        <p v-if="errors.zone" class="rd-field__error">{{ errors.zone }}</p>
      </fieldset>
    </section>

    <section class="rd-admin-section" aria-labelledby="sec-hours">
      <h2 id="sec-hours" class="rd-admin-section__title">Giờ mở cửa</h2>
      <RdOpeningHoursEditor v-model="form.hours" :error="errors.hours" />
    </section>

    <section class="rd-admin-section" aria-labelledby="sec-traits">
      <h2 id="sec-traits" class="rd-admin-section__title">Đặc điểm</h2>
      <fieldset class="rd-field">
        <legend class="rd-field__label">Thẻ</legend>
        <div class="rd-choices">
          <label v-for="tag in tagOptions" :key="tag.slug" class="rd-choice"><input v-model="form.tags" type="checkbox" :value="tag.slug" />{{ tag.label }}</label>
        </div>
      </fieldset>
      <fieldset class="rd-field">
        <legend class="rd-field__label">Mức giá</legend>
        <div class="rd-choices">
          <label v-for="option in PRICE_OPTIONS" :key="option.value" class="rd-choice">
            <input v-model="form.priceLevel" type="radio" name="price" :value="option.value" />{{ option.label }}
          </label>
        </div>
        <p class="rd-field__hint">Theo giá đồ uống hoặc món chính.</p>
      </fieldset>
      <fieldset class="rd-field">
        <legend class="rd-field__label">Trong nhà hay ngoài trời</legend>
        <div class="rd-choices">
          <label v-for="option in INDOOR_OPTIONS" :key="option.value" class="rd-choice">
            <input v-model="form.indoor" type="radio" name="indoor" :value="option.value" />{{ option.label }}
          </label>
        </div>
      </fieldset>
      <div class="rd-field">
        <label class="rd-field__label" for="f-visit">Thời gian tham quan (phút)</label>
        <input id="f-visit" v-model="form.visitDurationText" class="rd-input short" type="text" inputmode="numeric" autocomplete="off" :aria-invalid="!!errors.visitDurationText" />
        <p v-if="errors.visitDurationText" class="rd-field__error">{{ errors.visitDurationText }}</p>
      </div>
      <fieldset class="rd-field">
        <legend class="rd-field__label">Thời điểm đẹp</legend>
        <div class="rd-choices">
          <label v-for="time in BestTime.options" :key="time" class="rd-choice"><input v-model="form.bestTime" type="checkbox" :value="time" />{{ BEST_TIME_LABEL[time] }}</label>
        </div>
      </fieldset>
      <fieldset class="rd-field">
        <legend class="rd-field__label">Đi được bằng</legend>
        <div class="rd-choices">
          <label v-for="mode in Transport.options" :key="mode" class="rd-choice">
            <input v-model="form.transport" type="checkbox" :value="mode" />{{ PLACE_TRANSPORT_LABEL[mode] }}
          </label>
        </div>
      </fieldset>
    </section>

    <section class="rd-admin-section" aria-labelledby="sec-notes">
      <h2 id="sec-notes" class="rd-admin-section__title">Ghi chú thực tế</h2>
      <div class="rd-field">
        <label class="rd-field__label" for="f-notes">Ghi chú</label>
        <textarea id="f-notes" v-model="form.practicalNotes" class="rd-input" rows="5" :aria-invalid="!!errors.practicalNotes" aria-describedby="f-notes-hint"></textarea>
        <p id="f-notes-hint" class="rd-field__hint">
          Viết bằng lời của bạn, mỗi câu một điều có ích: giờ nào đẹp, ngồi chỗ nào, đường đi, chỗ gửi xe. Không chép review của người khác.
        </p>
        <p v-if="errors.practicalNotes" class="rd-field__error">{{ errors.practicalNotes }}</p>
      </div>
    </section>

    <section class="rd-admin-section" aria-labelledby="sec-contact">
      <h2 id="sec-contact" class="rd-admin-section__title">Liên hệ</h2>
      <div class="rd-field">
        <label class="rd-field__label" for="f-phone">Số điện thoại</label>
        <input id="f-phone" v-model="form.phone" class="rd-input" type="tel" inputmode="tel" autocomplete="off" :aria-invalid="!!errors.phone" />
        <p v-if="errors.phone" class="rd-field__error">{{ errors.phone }}</p>
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="f-fanpage">Fanpage</label>
        <input id="f-fanpage" v-model="form.fanpage" class="rd-input" type="url" inputmode="url" autocomplete="off" :aria-invalid="!!errors.fanpage" />
        <p v-if="errors.fanpage" class="rd-field__error">{{ errors.fanpage }}</p>
      </div>
      <div class="rd-field">
        <label class="rd-field__label" for="f-website">Website</label>
        <input id="f-website" v-model="form.website" class="rd-input" type="url" inputmode="url" autocomplete="off" :aria-invalid="!!errors.website" />
        <p v-if="errors.website" class="rd-field__error">{{ errors.website }}</p>
      </div>
    </section>

    <section class="rd-admin-section" aria-labelledby="sec-photos">
      <h2 id="sec-photos" class="rd-admin-section__title">Ảnh</h2>
      <p v-if="!place || place.photos.length === 0" class="rd-field__hint">
        Chưa có ảnh; trang địa điểm sẽ hiện "Ảnh đang cập nhật". Phần tải ảnh lên sẽ có ở bản sau.
      </p>
      <ul v-else class="photos">
        <li v-for="(photo, i) in place.photos" :key="photo.key">
          <span>Ảnh {{ i + 1 }}: {{ photoCredit(photo) }}</span>
          <span :class="['rd-status', photoComplete(photo) ? 'rd-status--ok' : 'rd-status--bad']">{{ photoComplete(photo) ? 'Có nguồn' : 'Thiếu nguồn' }}</span>
        </li>
      </ul>
    </section>

    <section class="rd-admin-section" aria-labelledby="sec-verify">
      <h2 id="sec-verify" class="rd-admin-section__title">Nguồn xác nhận</h2>
      <fieldset class="rd-field">
        <legend class="rd-field__label">Thông tin này đã được ai xác nhận?</legend>
        <div class="options">
          <label v-for="option in verifyOptions" :key="option.value" class="rd-choice rd-choice--block">
            <input v-model="form.verifySource" type="radio" name="verify" :value="option.value" />
            <span class="option-text">{{ option.label }}<span class="rd-field__hint">{{ option.hint }}</span></span>
          </label>
        </div>
      </fieldset>
    </section>

    <section id="activation-issues" class="checklist" aria-live="polite">
      <p v-if="issues.length === 0" class="rd-callout rd-callout--ok">{{ status === 'draft' ? 'Đủ điều kiện kích hoạt.' : 'Đủ điều kiện hiển thị.' }}</p>
      <div v-else :class="['rd-callout', status === 'draft' ? 'rd-callout--warn' : 'rd-callout--bad']">
        <p class="line">{{ status === 'draft' ? 'Còn thiếu để kích hoạt:' : 'Địa điểm đang công khai phải giữ đủ điều kiện:' }}</p>
        <ul>
          <li v-for="(issue, i) in issues" :key="i">{{ issue.message }}</li>
        </ul>
      </div>
    </section>

    <div class="rd-action-bar bar">
      <p class="save-state" role="status">{{ saveState }}</p>
      <template v-if="status === 'draft'">
        <button type="button" class="rd-btn rd-btn--outline" :disabled="busy !== null" @click="editor.save">
          {{ busy === 'save' ? 'Đang lưu…' : 'Lưu nháp' }}
        </button>
        <button type="button" class="rd-btn rd-btn--accent" :disabled="busy !== null || issues.length > 0" aria-describedby="activation-issues" @click="editor.activate">
          {{ busy === 'activate' ? 'Đang kích hoạt…' : 'Kích hoạt' }}
        </button>
      </template>
      <button v-else type="button" class="rd-btn rd-btn--primary" :disabled="busy !== null || !dirty || issues.length > 0" @click="editor.save">
        {{ busy === 'save' ? 'Đang lưu…' : 'Lưu thay đổi' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor { display: flex; flex-direction: column; gap: var(--space-4); max-width: 720px; }
.head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); }
.title { margin: 0; flex-basis: 100%; font: 700 26px/1.2 var(--font-display); overflow-wrap: anywhere; }
.head .rd-field__hint { flex-basis: 100%; overflow-wrap: anywhere; }
.banner { display: flex; flex-direction: column; gap: var(--space-3); }
.banner__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.line { margin: 0; }
.short { max-width: 140px; }
.zone-differs { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.options { display: flex; flex-direction: column; gap: var(--space-2); }
.option-text { display: flex; flex-direction: column; gap: 2px; }
.photos { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--space-2); }
.photos li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); font-size: 14px; }
.checklist ul { margin: var(--space-2) 0 0; padding-left: var(--space-5); }
.bar { position: sticky; bottom: 0; z-index: 2; flex-wrap: wrap; }
/* Hai nút trên một hàng ở 375px, kể cả khi trình duyệt có thanh cuộn. */
.bar .rd-btn { flex: 1 1 120px; }
.save-state { flex-basis: 100%; margin: 0; min-height: 18px; font-size: 13px; color: var(--ink-soft); }
.skeleton { height: 320px; border-radius: var(--radius-card); background: var(--mist); display: flex; align-items: center; justify-content: center; }
</style>
