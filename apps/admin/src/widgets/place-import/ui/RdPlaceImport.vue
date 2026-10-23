<script setup lang="ts">
import type { CsvImportRow } from '@ranhduong/contracts';
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useToast } from '@/shared/lib/toast';
import { useUnsavedGuard } from '@/shared/lib/unsaved-guard';
import RdPageHeader from '@/shared/ui/RdPageHeader.vue';
import RdStickyActions from '@/shared/ui/RdStickyActions.vue';
import { usePlaceImport } from '../model/use-place-import';
import RdImportRows from './RdImportRows.vue';

const { csv, fileName, step, busy, failure, previewRows, decisions, selections, result, chooseFile, preview, submit, reset } = usePlaceImport();
const fileInput = ref<HTMLInputElement | null>(null);
const stepTitle = ref<HTMLElement | null>(null);
const toast = useToast();
const labels: Record<CsvImportRow['status'], string> = {
  ready: 'Sẵn sàng', error: 'Cần sửa', duplicate: 'Nghi trùng', skipped: 'Bỏ qua', existing: 'Đã có', created: 'Đã tạo nháp',
};
const reviewGroups = computed(() => (['ready', 'error', 'duplicate', 'existing', 'skipped'] as const)
  .map((status) => ({ status, label: labels[status], rows: previewRows.value.filter((row) => row.status === status) })));
const resultGroups = computed(() => (['created', 'existing', 'duplicate', 'error', 'skipped'] as const)
  .map((status) => ({ status, label: labels[status], rows: result.value?.rows.filter((row) => row.status === status) ?? [] })));
const createdCount = computed(() => result.value?.rows.filter((row) => row.status === 'created').length ?? 0);

watch(step, async () => { await nextTick(); stepTitle.value?.focus(); });
watch(result, (value) => { if (value) toast.show(`Đã tạo ${createdCount.value} địa điểm nháp.`); });
// File vẫn ở máy người dùng; lựa chọn trong bước kiểm tra chưa được lưu khi đóng/rời tab.
useUnsavedGuard({ dirty: () => busy.value === 'create' || (step.value === 2 && selections.value.length > 0), kept: () => false });

function pick(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void chooseFile(file);
  input.value = '';
}
function restart(): void { reset(); }
</script>

<template>
  <div class="rd-admin-page rd-import">
    <RdPageHeader title="Import CSV" :crumbs="[{ label: 'Địa điểm', to: '/dia-diem' }]">
      <template #actions><a class="rd-btn rd-btn--secondary" href="/samples/dia-diem-mau.csv" download="dia-diem-mau.csv">Tải CSV mẫu</a></template>
      <template #meta>Nhập hàng loạt địa điểm từ Google Sheets. Mọi địa điểm mới được lưu ở trạng thái nháp.</template>
    </RdPageHeader>

    <ol class="rd-import-steps" aria-label="Tiến trình nhập CSV">
      <li v-for="(label, index) in ['Tải file', 'Kiểm tra', 'Tạo nháp']" :key="label" :aria-current="step === index + 1 ? 'step' : undefined">
        <span aria-hidden="true">{{ index + 1 }}</span> {{ label }}
      </li>
    </ol>

    <div v-if="failure" class="rd-import-notice rd-import-notice--bad" role="alert">
      <p>{{ failure.message }}</p>
      <a v-if="failure.login" class="rd-btn rd-btn--secondary" href="/dang-nhap?returnTo=%2Fimport" target="_blank" rel="noopener">Đăng nhập ở tab mới ↗</a>
      <button v-if="csv" class="rd-btn rd-btn--secondary" type="button" :disabled="busy !== null" @click="step === 2 ? submit() : preview()">Thử lại</button>
    </div>
    <p v-if="busy" class="rd-import-notice" role="status">{{ busy === 'read' ? 'Đang đọc file…' : busy === 'preview' ? 'Đang kiểm tra dữ liệu và địa điểm trùng…' : 'Đang tạo nháp. Giữ tab này mở đến khi có kết quả…' }}</p>

    <section v-if="step === 1" class="rd-import-panel" aria-labelledby="import-step-title">
      <h2 id="import-step-title" ref="stepTitle" tabindex="-1">1. Chọn file CSV</h2>
      <p>Trong Google Sheets, chọn <strong>Tệp → Tải xuống → Giá trị phân tách bằng dấu phẩy (.csv)</strong> của tab “Địa điểm”.</p>
      <p>File UTF-8, tối đa 256 KiB và 500 dòng. Dùng tên cột trong file mẫu; các cột bắt buộc là <code>name</code>, <code>category</code>, <code>status</code>.</p>
      <p>Chỉ nhập trạng thái <strong>Đã xác nhận</strong>, <strong>Sẵn sàng đăng</strong>, <strong>Đăng chưa xác nhận</strong> và <code>imported</code> khác <code>yes</code>.</p>
      <div class="rd-import-upload">
        <label for="csv-file">File địa điểm</label>
        <input id="csv-file" ref="fileInput" type="file" accept=".csv,text/csv" :disabled="busy === 'create'" @change="pick" />
        <p v-if="fileName"><strong>{{ fileName }}</strong>{{ csv ? ' · Đã đọc file' : '' }}</p>
      </div>
      <p class="rd-import-muted">CSV mẫu có 6 địa điểm ghi rõ là dữ liệu giả. Thay hoặc xoá các dòng mẫu trước khi nhập dữ liệu thật. Ảnh được bổ sung trong form địa điểm.</p>
      <button class="rd-btn rd-btn--primary" type="button" :disabled="!csv || busy !== null" @click="preview">Kiểm tra file</button>
    </section>

    <template v-else-if="step === 2">
      <section class="rd-import-panel" aria-labelledby="import-step-title">
        <h2 id="import-step-title" ref="stepTitle" tabindex="-1">2. Kiểm tra trước khi tạo nháp</h2>
        <p><strong>{{ fileName }}</strong> · {{ previewRows.length }} dòng dữ liệu. Chưa có địa điểm nào được tạo.</p>
        <div class="rd-import-summary" aria-label="Kết quả kiểm tra">
          <div v-for="group in reviewGroups" :key="group.status" :class="`rd-import-count rd-import-count--${group.status}`">
            <strong>{{ group.rows.length }}</strong><span>{{ group.label }}</span>
          </div>
        </div>
        <p v-if="!previewRows.length">File chỉ có tiêu đề, chưa có dòng dữ liệu. Bổ sung địa điểm vào Sheet rồi xuất lại.</p>
        <p>ID Sheet, ID OSM hoặc số điện thoại đã có sẽ được bỏ qua. Địa điểm chỉ nghi trùng cần bạn kiểm tra và chọn “Vẫn tạo”.</p>
        <button class="rd-btn rd-btn--secondary" type="button" :disabled="busy !== null" @click="restart">Chọn file khác / sửa CSV</button>
      </section>
      <section v-for="group in reviewGroups.filter((item) => item.rows.length)" :key="group.status" class="rd-import-group" :aria-label="group.label">
        <h3>{{ group.label }} · {{ group.rows.length }} dòng</h3>
        <p v-if="group.status === 'error'" class="rd-import-muted">Sửa các ô theo hướng dẫn bên dưới rồi tải lại CSV. Bạn vẫn có thể tạo các dòng hợp lệ trước.</p>
        <RdImportRows :rows="group.rows" :caption="group.label">
          <template v-if="group.status === 'ready' || group.status === 'duplicate'" #action="{ row }">
            <label class="rd-import-choice">
              <span class="rd-sr-only">Lựa chọn dòng {{ row.row }} · {{ row.name }}</span>
              <select v-model="decisions[row.row]" :disabled="busy !== null">
                <option value="skip">Bỏ qua dòng</option>
                <option value="create">{{ group.status === 'duplicate' ? 'Vẫn tạo' : 'Tạo nháp' }}</option>
              </select>
            </label>
          </template>
        </RdImportRows>
      </section>
      <RdStickyActions :state="`${selections.length} dòng được chọn · Chưa công khai lên web`">
        <button class="rd-btn rd-btn--primary" type="button" :disabled="!selections.length || busy !== null" @click="submit">{{ busy === 'create' ? 'Đang tạo…' : `Tạo ${selections.length} địa điểm nháp` }}</button>
      </RdStickyActions>
    </template>

    <template v-else>
      <section class="rd-import-panel" aria-labelledby="import-step-title">
        <h2 id="import-step-title" ref="stepTitle" tabindex="-1">3. Kết quả tạo nháp</h2>
        <p role="status"><strong>Đã tạo {{ createdCount }} địa điểm nháp</strong> từ {{ fileName }}.</p>
        <p>Kiểm tra từng nháp, bổ sung ảnh và thông tin còn thiếu rồi kích hoạt. Đánh dấu <code>imported=yes</code> cho các dòng đã tạo trong Sheet.</p>
        <p v-if="resultGroups.some((group) => group.status === 'duplicate' && group.rows.length)">Có địa điểm nghi trùng mới phát sinh khi tạo. Bấm “Kiểm tra lại file này” để xem và chọn lại.</p>
        <div class="rd-import-actions">
          <RouterLink class="rd-btn rd-btn--primary" to="/dia-diem?status=draft">Mở danh sách địa điểm</RouterLink>
          <button class="rd-btn rd-btn--secondary" type="button" :disabled="busy !== null" @click="preview">Kiểm tra lại file này</button>
          <button class="rd-btn rd-btn--secondary" type="button" :disabled="busy !== null" @click="restart">Nhập file khác</button>
        </div>
      </section>
      <section v-for="group in resultGroups.filter((item) => item.rows.length)" :key="group.status" class="rd-import-group" :aria-label="group.label">
        <h3>{{ group.label }} · {{ group.rows.length }} dòng</h3>
        <RdImportRows :rows="group.rows" :caption="group.label" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.rd-import { padding-bottom: var(--space-7); }
.rd-import-steps { display: flex; gap: var(--space-3); padding: 0; margin: 0 0 var(--space-6); list-style: none; }
.rd-import-steps li { display: flex; align-items: center; gap: var(--space-2); color: var(--ink-soft); }
.rd-import-steps li[aria-current] { font-weight: 700; color: var(--ink); }
.rd-import-steps span { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: var(--radius-pill); background: var(--mist); }
.rd-import-steps li[aria-current] span { background: var(--selected-surface); color: var(--selected-foreground); }
.rd-import-panel { padding: var(--space-6); background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); }
.rd-import-panel h2 { margin: 0 0 var(--space-4); font-size: 20px; }
.rd-import p { line-height: 1.65; overflow-wrap: anywhere; }
.rd-import-upload { display: grid; gap: var(--space-3); padding: var(--space-5); margin: var(--space-5) 0; border: var(--border); border-radius: var(--radius-note); }
.rd-import-upload label { font-weight: 700; }
.rd-import-upload input { width: 100%; min-height: var(--tap-min); min-width: 0; font: inherit; }
.rd-import-upload input::file-selector-button { min-height: var(--tap-min); border: var(--border-ink); border-radius: var(--radius-chip); background: var(--paper); color: var(--ink); font: inherit; margin-right: var(--space-3); padding: 0 var(--space-3); cursor: pointer; }
.rd-import-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: var(--space-3); margin: var(--space-5) 0; }
.rd-import-count { display: grid; gap: var(--space-1); padding: var(--space-4); border-radius: var(--radius-note); background: var(--mist); color: var(--ink); }
.rd-import-count strong { font-size: 24px; }
.rd-import-count--ready, .rd-import-count--created { background: var(--status-ok-bg); color: var(--status-ok); }
.rd-import-count--error { background: var(--status-bad-bg); color: var(--status-bad); }
.rd-import-count--duplicate { background: var(--status-warn-bg); color: var(--status-warn); }
.rd-import-group { margin-top: var(--space-6); }
.rd-import-group h3 { font-size: 18px; margin: 0 0 var(--space-3); }
.rd-import-muted { color: var(--ink-soft); }
.rd-import-notice { padding: var(--space-4); margin: 0 0 var(--space-4); border-radius: var(--radius-note); background: var(--note); color: var(--ink); }
.rd-import-notice p { margin-top: 0; }
.rd-import-notice--bad { background: var(--status-bad-bg); color: var(--status-bad); }
.rd-import-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
.rd-import-choice { display: block; }
.rd-import-choice select { width: 100%; min-height: var(--tap-min); font-size: 16px; background: var(--paper-raised); color: var(--ink); border: var(--border-ink); border-radius: var(--radius-note); padding: var(--space-2); }
.rd-import :deep(td) { overflow-wrap: anywhere; }
@media (max-width: 767px) {
  .rd-import-panel { padding: var(--space-4); }
  .rd-import-steps { gap: var(--space-2); font-size: 12px; }
  .rd-import-steps li { gap: var(--space-1); }
  .rd-import-steps span { width: 24px; height: 24px; }
  .rd-import-actions > * { width: 100%; }
}
</style>
