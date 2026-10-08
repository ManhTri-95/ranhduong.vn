import {
  activationIssues,
  AdminVerifySource,
  BestTime,
  LngLat,
  normalizeVnPhone,
  PlaceCategory,
  PlaceEditInput,
  Transport,
  type ActivationIssue,
  type AdminPlace,
} from '@ranhduong/contracts';
import { slugify } from '@ranhduong/geo';
import { z } from 'zod';
import { closedWeek, slotsFromWeek, weekFromSlots, WeekHours } from '@/features/opening-hours-editor/lib/week';

const PRICE_LEVELS = ['1', '2', '3', '4'] as const;

/** Giá trị các ô của form (chuỗi như người nhập gõ); cũng là dạng lưu trên máy nên có schema để đọc lại. */
export const PlaceFormState = z.object({
  name: z.string(),
  aliasesText: z.string(),
  category: z.union([PlaceCategory, z.literal('')]),
  zone: z.string(),
  tags: z.array(z.string()),
  location: LngLat.nullable(),
  address: z.string(),
  hours: WeekHours,
  visitDurationText: z.string(),
  bestTime: z.array(BestTime),
  indoor: z.enum(['', 'indoor', 'outdoor']),
  priceLevel: z.enum(['', '1', '2', '3', '4']),
  transport: z.array(Transport),
  practicalNotes: z.string(),
  phone: z.string(),
  fanpage: z.string(),
  website: z.string(),
  verifySource: z.union([AdminVerifySource, z.literal('')]),
});
export type PlaceFormState = z.infer<typeof PlaceFormState>;
export type FormField = keyof PlaceFormState;
export type FieldErrors = Partial<Record<FormField, string>>;
export type FormResult = { ok: true; input: PlaceEditInput } | { ok: false; errors: FieldErrors };

/** Lỗi hiện dưới từng ô (tiếng Việt, không lấy câu lỗi tiếng Anh của Zod). */
const FIELD_MESSAGE: Record<FormField, string> = {
  name: 'Nhập tên có ít nhất một chữ cái hoặc chữ số, tối đa 120 ký tự',
  aliasesText: 'Mỗi tên khác tối đa 120 ký tự, tối đa 10 tên',
  category: 'Chọn danh mục',
  zone: 'Chọn lại cụm',
  tags: 'Chọn lại thẻ',
  location: 'Ghim lại vị trí',
  address: 'Địa chỉ tối đa 300 ký tự',
  hours: 'Có ca chưa nhập đủ giờ mở và giờ đóng',
  visitDurationText: 'Thời gian tham quan là số phút, từ 5 đến 720',
  bestTime: 'Chọn lại thời điểm đẹp',
  indoor: 'Chọn lại trong nhà hay ngoài trời',
  priceLevel: 'Chọn lại mức giá',
  transport: 'Chọn lại phương tiện',
  practicalNotes: 'Ghi chú tối đa 1000 ký tự',
  phone: 'Số điện thoại dạng 0912 345 678 hoặc +84912345678',
  fanpage: 'Dán link đầy đủ, bắt đầu bằng https://',
  website: 'Dán link đầy đủ, bắt đầu bằng https://',
  verifySource: 'Chọn lại nguồn xác nhận',
};

/** Trường của PlaceEditInput → ô trong form. */
const PATH_FIELD: Partial<Record<string, FormField>> = {
  name: 'name',
  aliases: 'aliasesText',
  category: 'category',
  zone: 'zone',
  tags: 'tags',
  location: 'location',
  address: 'address',
  openingHours: 'hours',
  visitDurationMin: 'visitDurationText',
  bestTime: 'bestTime',
  indoor: 'indoor',
  priceLevel: 'priceLevel',
  transport: 'transport',
  practicalNotes: 'practicalNotes',
  verifySource: 'verifySource',
};

function fieldOf([head, sub]: string[]): FormField | undefined {
  if (head === 'contact') return sub === 'phone' || sub === 'fanpage' || sub === 'website' ? sub : undefined;
  return head === undefined ? undefined : PATH_FIELD[head];
}

export function emptyForm(): PlaceFormState {
  return {
    name: '',
    aliasesText: '',
    category: '',
    zone: '',
    tags: [],
    location: null,
    address: '',
    hours: closedWeek(),
    visitDurationText: '',
    bestTime: [],
    indoor: '',
    priceLevel: '',
    transport: [],
    practicalNotes: '',
    phone: '',
    fanpage: '',
    website: '',
    verifySource: '',
  };
}

export function formFromPlace(place: AdminPlace): PlaceFormState {
  return {
    name: place.name,
    aliasesText: place.aliases.join('; '),
    category: place.category,
    zone: place.zone ?? '',
    tags: [...place.tags],
    location: place.location?.coordinates ?? null,
    address: place.address ?? '',
    hours: weekFromSlots(place.openingHours),
    visitDurationText: place.visitDurationMin === undefined ? '' : String(place.visitDurationMin),
    bestTime: [...place.bestTime],
    indoor: place.indoor === undefined ? '' : place.indoor ? 'indoor' : 'outdoor',
    priceLevel: PRICE_LEVELS.find((level) => level === String(place.priceLevel)) ?? '',
    transport: [...place.transport],
    practicalNotes: place.practicalNotes ?? '',
    phone: place.contact.phone ?? '',
    fanpage: place.contact.fanpage ?? '',
    website: place.contact.website ?? '',
    verifySource: place.verifySource === 'owner' || place.verifySource === 'admin' ? place.verifySource : '',
  };
}

const trimmed = (s: string) => s.trim() || undefined;

/** Ô trong form → thân gửi API (chưa validate). Số điện thoại gõ kiểu trong nước được chuẩn hoá về +84. */
function rawInput(form: PlaceFormState): Record<string, unknown> {
  const phone = trimmed(form.phone);
  const visit = trimmed(form.visitDurationText);
  return {
    name: form.name,
    aliases: form.aliasesText.split(';').map((s) => s.trim()).filter(Boolean),
    category: form.category || undefined,
    zone: form.zone || undefined,
    tags: form.tags,
    location: form.location ? { type: 'Point', coordinates: form.location } : undefined,
    address: trimmed(form.address),
    openingHours: slotsFromWeek(form.hours),
    visitDurationMin: visit === undefined ? undefined : Number(visit),
    bestTime: form.bestTime,
    indoor: form.indoor === '' ? undefined : form.indoor === 'indoor',
    priceLevel: form.priceLevel === '' ? undefined : Number(form.priceLevel),
    transport: form.transport,
    practicalNotes: trimmed(form.practicalNotes),
    contact: { phone: phone === undefined ? undefined : (normalizeVnPhone(phone) ?? phone), fanpage: trimmed(form.fanpage), website: trimmed(form.website) },
    verifySource: form.verifySource || undefined,
  };
}

/** Validate form bằng PlaceEditInput (cùng schema với API); lỗi gom theo ô, mỗi ô một câu. */
export function formToInput(form: PlaceFormState): FormResult {
  const parsed = PlaceEditInput.safeParse(rawInput(form));
  const errors: FieldErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldOf(issue.path.map(String));
      if (field && errors[field] === undefined) errors[field] = FIELD_MESSAGE[field];
    }
  }
  // API tạo slug từ tên: tên chỉ có biểu tượng thì không lưu được.
  if (errors.name === undefined && form.name.trim() !== '' && slugify(form.name) === '') errors.name = FIELD_MESSAGE.name;
  if (parsed.success && Object.keys(errors).length === 0) return { ok: true, input: parsed.data };
  return { ok: false, errors };
}

/** Điều kiện kích hoạt còn thiếu của form hiện tại; ảnh lấy từ bản trên server (form chưa sửa ảnh). */
export function formActivationIssues(form: PlaceFormState, photos: readonly unknown[]): ActivationIssue[] {
  return activationIssues({
    location: form.location ? { type: 'Point', coordinates: form.location } : undefined,
    openingHours: slotsFromWeek(form.hours),
    verifySource: form.verifySource || undefined,
    photos,
  });
}

/** Hai form cùng nội dung (parse lại để thứ tự khoá như nhau). */
export function sameForm(a: PlaceFormState, b: PlaceFormState): boolean {
  return JSON.stringify(PlaceFormState.parse(a)) === JSON.stringify(PlaceFormState.parse(b));
}
