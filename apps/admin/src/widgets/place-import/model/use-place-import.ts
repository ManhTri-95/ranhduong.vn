import { CsvPreviewInput, MAX_PLACE_CSV_BYTES, type CsvImportInput, type CsvImportResponse, type CsvImportRow } from '@ranhduong/contracts';
import { computed, ref, shallowRef } from 'vue';
import { createCsvPlaces, previewCsvPlaces } from '@/entities/place/api/import';
import { toApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';

interface ImportFile { name: string; size: number; text(): Promise<string> }
export type ImportDecision = 'skip' | 'create';

/** Ghi dữ liệu ở bước 3; giữ file và lựa chọn trong bộ nhớ để thử lại nếu mạng/phiên lỗi. */
export function usePlaceImport() {
  const csv = ref('');
  const fileName = ref('');
  const step = ref<1 | 2 | 3>(1);
  const busy = ref<'read' | 'preview' | 'create' | null>(null);
  const failure = ref<{ message: string; login: boolean } | null>(null);
  const previewRows = shallowRef<CsvImportRow[]>([]);
  const result = shallowRef<CsvImportResponse | null>(null);
  const decisions = ref<Record<number, ImportDecision>>({});
  let latest = 0;

  const selections = computed<CsvImportInput['selections']>(() => previewRows.value
    .filter((row) => (row.status === 'ready' || row.status === 'duplicate') && decisions.value[row.row] === 'create')
    .map((row) => ({ row: row.row, allowDuplicate: row.status === 'duplicate' })));

  function report(err: unknown): void {
    const problem = toApiFailure(err);
    failure.value = {
      login: problem.status === 401,
      message: problem.status === 401 ? 'Phiên đăng nhập đã hết. Mở đăng nhập ở tab mới, rồi quay lại đây thử lại.'
        : problem.error?.message ?? 'Chưa hoàn tất yêu cầu. File và lựa chọn vẫn được giữ ở tab này; kiểm tra kết nối rồi thử lại.',
    };
  }

  function reset(): void {
    if (busy.value === 'create') return;
    latest++;
    csv.value = ''; fileName.value = ''; step.value = 1; previewRows.value = [];
    result.value = null; decisions.value = {}; failure.value = null; busy.value = null;
  }

  async function chooseFile(file: ImportFile): Promise<void> {
    if (busy.value === 'create') return;
    reset();
    const call = ++latest;
    fileName.value = file.name;
    if (file.size > MAX_PLACE_CSV_BYTES) { failure.value = { message: 'File CSV tối đa 256 KiB. Chia file rồi nhập tiếp.', login: false }; return; }
    busy.value = 'read';
    try {
      const content = await file.text();
      if (call !== latest) return;
      const parsed = CsvPreviewInput.safeParse({ csv: content });
      if (!parsed.success) { failure.value = { message: parsed.error.issues[0]?.message ?? 'File CSV không hợp lệ.', login: false }; return; }
      csv.value = content;
    } catch { if (call === latest) failure.value = { message: 'Chưa đọc được file. Chọn lại file CSV UTF-8.', login: false }; }
    finally { if (call === latest) busy.value = null; }
  }

  async function preview(): Promise<void> {
    if (!csv.value || busy.value !== null) return;
    const call = ++latest;
    busy.value = 'preview'; failure.value = null;
    try {
      const response = await previewCsvPlaces(CITY_SLUG, csv.value);
      if (call !== latest) return;
      previewRows.value = response.rows;
      decisions.value = Object.fromEntries(response.rows.map((row) => [row.row, row.status === 'ready' ? 'create' : 'skip']));
      result.value = null;
      step.value = 2;
    } catch (err) { if (call === latest) report(err); }
    finally { if (call === latest) busy.value = null; }
  }

  async function submit(): Promise<void> {
    if (busy.value !== null || step.value !== 2 || !selections.value.length) return;
    busy.value = 'create'; failure.value = null;
    try {
      result.value = await createCsvPlaces(CITY_SLUG, { csv: csv.value, selections: selections.value });
      step.value = 3;
    } catch (err) { report(err); }
    finally { busy.value = null; }
  }

  return { csv, fileName, step, busy, failure, previewRows, decisions, selections, result, chooseFile, preview, submit, reset };
}
