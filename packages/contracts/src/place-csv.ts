import { z } from 'zod';
import { ObjectIdString } from './common.js';
import { readCsv } from './csv.js';
import { parseLatLng } from './geojson.js';
import { openingHoursIssues, parseOpeningHours } from './opening-hours.js';
import { PlaceEditInput } from './place-admin.js';
import { normalizeVnPhone } from './place.js';

export const MAX_PLACE_CSV_BYTES = 256 * 1024;
export const MAX_PLACE_CSV_ROWS = 500;

// Contracts chạy cả Node lẫn browser, không phụ thuộc DOM/Buffer.
function utf8Bytes(value: string): number {
  let size = 0;
  for (const char of value) {
    const point = char.codePointAt(0)!;
    size += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
  }
  return size;
}

export const CsvPreviewInput = z.object({
  csv: z.string().min(1, 'Chọn file CSV có dữ liệu').max(MAX_PLACE_CSV_BYTES)
    .refine((value) => utf8Bytes(value) <= MAX_PLACE_CSV_BYTES, 'File CSV tối đa 256 KiB'),
});
export type CsvPreviewInput = z.infer<typeof CsvPreviewInput>;

export const CsvImportInput = CsvPreviewInput.extend({
  selections: z.array(z.object({ row: z.number().int().min(2), allowDuplicate: z.boolean().default(false) })).min(1).max(MAX_PLACE_CSV_ROWS),
}).refine(({ selections }) => new Set(selections.map((item) => item.row)).size === selections.length, 'Mỗi dòng chỉ được chọn một lần');
export type CsvImportInput = z.infer<typeof CsvImportInput>;

export const CsvImportIssue = z.object({ column: z.string(), message: z.string(), fix: z.string() });
export type CsvImportIssue = z.infer<typeof CsvImportIssue>;
export const CsvImportMatch = z.object({ name: z.string(), placeId: ObjectIdString.optional(), row: z.number().int().optional() });
export type CsvImportMatch = z.infer<typeof CsvImportMatch>;
export const CsvPlaceDraft = z.object({ sheetId: z.string().optional(), osmId: z.string().optional(), place: PlaceEditInput });
export type CsvPlaceDraft = z.infer<typeof CsvPlaceDraft>;
export const CsvImportRow = z.object({
  row: z.number().int().positive(), name: z.string(),
  status: z.enum(['ready', 'error', 'skipped', 'existing', 'duplicate', 'created']),
  message: z.string().optional(),
  issues: z.array(CsvImportIssue).default([]),
  matches: z.array(CsvImportMatch).default([]),
  placeId: ObjectIdString.optional(),
  /** Dữ liệu dòng đang nhập để admin so trùng, chỉ trả ở API quản trị; commit vẫn tự đọc lại CSV. */
  preview: CsvPlaceDraft.optional(),
});
export type CsvImportRow = z.infer<typeof CsvImportRow>;
export const CsvImportResponse = z.object({ rows: z.array(CsvImportRow) });
export type CsvImportResponse = z.infer<typeof CsvImportResponse>;

export interface ParsedPlaceCsvRow extends CsvImportRow { draft?: CsvPlaceDraft }

export const PLACE_CSV_COLUMNS = [
  'id', 'name', 'aliases', 'category', 'also_category', 'zone', 'address', 'latlng', 'hours', 'visit_min',
  'best_time', 'cover', 'price', 'tags', 'transport', 'notes', 'phone', 'fanpage', 'website', 'osm_id', 'status', 'imported',
] as const;
const TRACKING_COLUMNS = ['batch', 'last_post_date', 'channel', 'msg1_date', 'remind_date', 'result', 'photo_status', 'drive_folder'];
const allowedColumns = new Set<string>([...PLACE_CSV_COLUMNS, ...TRACKING_COLUMNS, 'indoor']);
const eligibleStatuses = new Set(['Đã xác nhận', 'Sẵn sàng đăng', 'Đăng chưa xác nhận']);
const list = (value: string | undefined) => value?.split(';').map((part) => part.trim()).filter(Boolean) ?? [];
const number = (value: string | undefined) => value ? (/^\d+$/.test(value) ? Number(value) : Number.NaN) : undefined;
const fieldColumn: Record<string, string> = {
  alsoCategories: 'also_category', location: 'latlng', openingHours: 'hours', visitDurationMin: 'visit_min',
  bestTime: 'best_time', priceLevel: 'price', practicalNotes: 'notes',
};
const fixes: Record<string, string> = {
  name: 'Nhập tên địa điểm, tối đa 120 ký tự.', category: 'Chọn attraction, cafe, food, activity, stay hoặc shop.',
  aliases: 'Các tên cách nhau bằng ;, tối đa 10 tên, mỗi tên tối đa 120 ký tự.',
  also_category: 'Chọn tối đa 2 danh mục phụ, cách nhau bằng ;, không lặp và không trùng danh mục chính.',
  zone: 'Dùng slug khu vực đang có trong thành phố, hoặc để trống để bổ sung sau.',
  latlng: 'Nhập lat,lng, ví dụ tọa độ giả 0.2,0.3; vĩ độ -90…90, kinh độ -180…180; chưa biết thì để trống.',
  hours: 'Dùng T2-CN 07:00-22:00; nhiều ca cách nhau bằng dấu phẩy, đoạn ngày bằng ;. Không để ca chồng nhau.',
  visit_min: 'Nhập số phút nguyên từ 5 đến 720, hoặc để trống.',
  best_time: 'Dùng sunrise;morning;afternoon;sunset;evening, chỉ chọn giá trị cần thiết.',
  cover: 'Chọn full, partial hoặc none; chưa rõ thì để trống.',
  indoor: 'Cột cũ chỉ nhận yes hoặc no. Nên chuyển sang cover: full, partial, none.',
  price: 'Chọn 1, 2, 3 hoặc 4; chưa rõ thì để trống.',
  tags: 'Dùng slug không dấu, cách nhau bằng ;, tối đa 20 thẻ.',
  transport: 'Dùng motorbike;car, hoặc để trống.', phone: 'Nhập số điện thoại Việt Nam dạng 0… hoặc +84…; chưa biết thì để trống.',
  fanpage: 'Dùng link đầy đủ bắt đầu bằng https:// hoặc http://.', website: 'Dùng link đầy đủ bắt đầu bằng https:// hoặc http://.',
  osm_id: 'Dùng node/123, way/123 hoặc relation/123; không có thì để trống.',
  id: 'Dùng ID Sheet ổn định, tối đa 120 ký tự; mỗi địa điểm một ID.',
  address: 'Nhập địa chỉ tối đa 300 ký tự; chưa rõ thì để trống.',
  notes: 'Tự viết ghi chú tối đa 1000 ký tự; chưa có thì để trống.',
};
const issue = (column: string, message: string): CsvImportIssue => ({ column, message, fix: fixes[column] ?? 'Sửa ô theo cấu trúc file mẫu; ô chưa rõ có thể để trống nếu không bắt buộc.' });

/** Chỉ đọc và validate; việc kiểm cụm và so với dữ liệu hiện có do API đảm nhiệm. */
export function parsePlaceCsv(csv: string): ParsedPlaceCsvRow[] {
  CsvPreviewInput.parse({ csv });
  const [header, ...records] = readCsv(csv, MAX_PLACE_CSV_ROWS);
  if (!header) throw new Error('File CSV không có tiêu đề. Tải file mẫu để bắt đầu.');
  const columns = header.cells.map((column) => column.toLowerCase());
  for (const required of ['name', 'category', 'status']) {
    if (!columns.includes(required)) throw new Error(`Thiếu cột ${required}. Dùng hàng tiêu đề trong file mẫu.`);
  }
  const seen = new Set<string>();
  for (const column of columns) {
    if (seen.has(column)) throw new Error(`Lặp cột ${column}. Mỗi cột chỉ xuất hiện một lần.`);
    if (!allowedColumns.has(column)) throw new Error(`Không nhận diện cột ${column || '(trống)'}. Đối chiếu tên cột với file mẫu.`);
    seen.add(column);
  }
  return records.map(({ row, cells }): ParsedPlaceCsvRow => {
    const values = Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? '']));
    const result: ParsedPlaceCsvRow = { row, name: values.name ?? '', status: 'ready', issues: [], matches: [] };
    if (cells.length !== columns.length) {
      result.status = 'error';
      result.issues.push({ column: '*', message: `Dòng có ${cells.length} ô, tiêu đề có ${columns.length} cột.`, fix: 'Xuất lại CSV từ Google Sheets để giữ đúng dấu phẩy và ngoặc kép.' });
      return result;
    }
    if (values.imported?.toLowerCase() === 'yes' || !eligibleStatuses.has(values.status ?? '')) {
      return { ...result, status: 'skipped', message: values.imported?.toLowerCase() === 'yes' ? 'Đã đánh dấu imported=yes trong Sheet.' : 'Chỉ nhập Đã xác nhận, Sẵn sàng đăng hoặc Đăng chưa xác nhận.' };
    }
    let openingHours: PlaceEditInput['openingHours'] = [];
    if (values.hours) {
      try {
        openingHours = parseOpeningHours(values.hours);
        if (openingHours.length) result.issues.push(...openingHoursIssues(openingHours).map((message) => issue('hours', message)));
        // openingHoursIssues kiểm các ca trong cùng ngày. CSV kiểm thêm phần ca kéo sang ngày kế tiếp, kể cả CN→T2.
        const overlap = openingHours.some((slot) => slot.close < slot.open && openingHours.some((next) => next.day === (slot.day + 1) % 7 && next.open < slot.close));
        if (overlap) result.issues.push(issue('hours', 'Ca qua nửa đêm chồng lên ca của ngày tiếp theo.'));
      } catch (err) { result.issues.push(issue('hours', err instanceof Error ? err.message : 'Không đọc được giờ mở cửa.')); }
    }
    const coordinates = values.latlng ? parseLatLng(values.latlng) : undefined;
    if (coordinates === null) result.issues.push(issue('latlng', 'Toạ độ không đúng dạng lat,lng.'));
    const phone = values.phone ? normalizeVnPhone(values.phone) : undefined;
    if (phone === null) result.issues.push(issue('phone', 'Số điện thoại không hợp lệ.'));
    let cover = values.cover || undefined;
    if (!cover && values.indoor) {
      if (values.indoor.toLowerCase() === 'yes') cover = 'full';
      else if (values.indoor.toLowerCase() === 'no') cover = 'none';
      else result.issues.push(issue('indoor', 'Không đọc được mức mái che cũ.'));
    }
    if (values.id && values.id.length > 120) result.issues.push(issue('id', 'ID Sheet quá dài.'));
    if (values.osm_id && !/^(node|way|relation)\/[1-9]\d*$/.test(values.osm_id)) result.issues.push(issue('osm_id', 'Định danh OSM không hợp lệ.'));
    const parsed = PlaceEditInput.safeParse({
      name: values.name, aliases: list(values.aliases), category: values.category, alsoCategories: list(values.also_category),
      zone: values.zone || undefined, address: values.address || undefined, location: coordinates ? { type: 'Point', coordinates } : undefined,
      openingHours, visitDurationMin: number(values.visit_min), bestTime: list(values.best_time), cover,
      priceLevel: number(values.price), tags: list(values.tags), transport: list(values.transport), practicalNotes: values.notes || undefined,
      contact: { phone: phone || undefined, fanpage: values.fanpage || undefined, website: values.website || undefined },
      verifySource: values.status === 'Đăng chưa xác nhận' ? 'admin' : 'owner',
    });
    if (!parsed.success) {
      for (const error of parsed.error.issues) {
        const field = String(error.path[0] ?? '*');
        const column = field === 'contact' ? String(error.path[1]) : fieldColumn[field] ?? field;
        result.issues.push(issue(column, error.code === 'custom' ? error.message : `Dữ liệu cột ${column} không hợp lệ.`));
      }
    }
    if (result.issues.length || !parsed.success) return { ...result, status: 'error' };
    const draft: CsvPlaceDraft = { sheetId: values.id || undefined, osmId: values.osm_id || undefined, place: parsed.data };
    return { ...result, draft, preview: draft };
  });
}
