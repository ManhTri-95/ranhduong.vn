<script setup lang="ts">
import { CC_LICENSES, type AdminPlace, type PhotoSource } from '@ranhduong/contracts';
import { watch } from 'vue';
import { RouterLink } from 'vue-router';
import { usePhotoUpload } from '../model/use-photo-upload';

const props = defineProps<{ placeId: string | null; disabled?: boolean }>();
const emit = defineEmits<{ attached: [place: AdminPlace]; busy: [value: boolean] }>();
const uploader = usePhotoUpload(() => props.placeId, (place) => emit('attached', place));
const { file, source, credit, license, sourceUrl, busy, message, failed, needsLogin, canResume } = uploader;
const SOURCES: { value: PhotoSource; label: string }[] = [
  { value: 'owner', label: 'Quán gửi hoặc cho phép dùng' },
  { value: 'self', label: 'Tự chụp' },
  { value: 'cc', label: 'Creative Commons (CC0, CC BY, CC BY-SA)' },
  { value: 'ctv', label: 'Cộng tác viên cho phép dùng' },
  { value: 'user', label: 'Người dùng cho phép dùng' },
];
watch(busy, (value) => emit('busy', value), { flush: 'sync' });
function selectFile(event: Event): void {
  const input = event.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
}
</script>

<template>
  <p v-if="!placeId" class="rd-field__hint">Lưu nháp địa điểm trước khi thêm ảnh.</p>
  <div v-else class="rd-photo-upload">
    <p class="rd-field__hint">Chọn JPEG, PNG hoặc WebP nhỏ hơn 8 MB. Chỉ dùng ảnh bạn có quyền đăng.</p>
    <fieldset :disabled="busy || disabled" class="rd-photo-upload__fields">
      <legend class="rd-sr-only">Thêm ảnh và ghi nguồn</legend>
      <div class="rd-field">
        <label for="photo-file" class="rd-field__label">Ảnh</label>
        <input id="photo-file" class="rd-input rd-photo-upload__file" type="file" accept="image/jpeg,image/png,image/webp" @change="selectFile" />
      </div>
      <div class="rd-field">
        <label for="photo-source" class="rd-field__label">Nguồn ảnh <span aria-hidden="true">*</span></label>
        <select id="photo-source" v-model="source" class="rd-input" required>
          <option value="" disabled>Chọn nguồn ảnh</option>
          <option v-for="option in SOURCES" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>
      <div class="rd-field">
        <label for="photo-credit" class="rd-field__label">Người giữ bản quyền <span aria-hidden="true">*</span></label>
        <input id="photo-credit" v-model="credit" class="rd-input" maxlength="200" placeholder="Tên quán hoặc tác giả" required />
      </div>
      <div class="rd-field">
        <label for="photo-license" class="rd-field__label">Giấy phép / sự cho phép sử dụng <span aria-hidden="true">*</span></label>
        <select v-if="source === 'cc'" id="photo-license" v-model="license" class="rd-input" required>
          <option value="" disabled>Chọn giấy phép của ảnh</option>
          <option v-for="value in CC_LICENSES" :key="value" :value="value">{{ value }}</option>
        </select>
        <input v-else id="photo-license" v-model="license" class="rd-input" maxlength="300" placeholder="Ví dụ: Chủ quán đồng ý qua tin nhắn" required />
      </div>
      <div v-if="source === 'cc'" class="rd-field">
        <label for="photo-source-url" class="rd-field__label">Đường dẫn trang ảnh gốc <span aria-hidden="true">*</span></label>
        <input id="photo-source-url" v-model="sourceUrl" class="rd-input" type="url" maxlength="2000" required />
      </div>
      <p v-if="source === 'owner'" class="rd-field__hint">Giữ tin nhắn đồng ý của quán trong thư mục bằng chứng.</p>
      <button type="button" class="rd-btn rd-btn--outline" :disabled="!file" @click="uploader.upload">Tải ảnh lên</button>
    </fieldset>
    <p v-if="message" :class="['rd-callout', failed ? 'rd-callout--bad' : 'rd-callout--ok']" role="status" aria-live="polite">{{ message }}</p>
    <RouterLink v-if="needsLogin" :to="{ path: '/dang-nhap', query: { returnTo: `/dia-diem/${placeId}` } }" class="rd-btn rd-btn--outline">Đăng nhập lại</RouterLink>
    <button v-else-if="canResume" type="button" class="rd-btn rd-btn--outline" :disabled="disabled" @click="uploader.resume">Kiểm tra lại</button>
  </div>
</template>

<style scoped>
.rd-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.rd-photo-upload { display: flex; flex-direction: column; gap: var(--space-3); }
.rd-photo-upload__fields { margin: 0; padding: 0; border: 0; min-width: 0; display: flex; flex-direction: column; gap: var(--space-3); }
.rd-photo-upload__file { padding: var(--space-2); max-width: 100%; }
.rd-photo-upload__fields .rd-btn { align-self: flex-start; }
.rd-photo-upload p { margin: 0; overflow-wrap: anywhere; }
</style>
