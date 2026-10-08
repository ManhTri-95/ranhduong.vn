import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { BestTime, PhotoSource, PlaceCategory, PlaceStatus, Transport, VerifySource } from './enums.js';
import { GeoPoint } from './geojson.js';
import { OpeningSlot, openingHoursIssues } from './opening-hours.js';
import { PlaceContact, PlacePhoto } from './place.js';

/** Nguồn xác nhận chọn trong form (ADR 0013): owner khi quán đã xác nhận; admin khi chỉ dựa trên Facebook hoặc là điểm công cộng. */
export const AdminVerifySource = z.enum(['owner', 'admin']);
export type AdminVerifySource = z.infer<typeof AdminVerifySource>;

const text = (max: number) => z.string().trim().min(1).max(max);

/**
 * Thân POST /v1/admin/cities/:city/places và PUT /v1/admin/places/:id: toàn bộ trường form địa điểm (S05).
 * PUT thay toàn bộ các trường này; trường tuỳ chọn không gửi thì bị xoá. Ảnh không nằm ở đây (S06 quản lý).
 */
export const PlaceEditInput = z.object({
  name: text(120),
  aliases: z.array(text(120)).max(10).default([]),
  category: PlaceCategory,
  /** Slug cụm trong thành phố. */
  zone: Slug.optional(),
  tags: z.array(Slug).max(20).default([]),
  location: GeoPoint.optional(),
  address: text(300).optional(),
  openingHours: z.array(OpeningSlot).max(70).default([]),
  visitDurationMin: z.number().int().min(5).max(720).optional(),
  bestTime: z.array(BestTime).default([]),
  indoor: z.boolean().optional(),
  priceLevel: z.literal([1, 2, 3, 4]).optional(),
  transport: z.array(Transport).default([]),
  practicalNotes: text(1000).optional(),
  contact: PlaceContact.default({}),
  verifySource: AdminVerifySource.optional(),
});
export type PlaceEditInput = z.infer<typeof PlaceEditInput>;

/** Ảnh như đang lưu, có thể thiếu nguồn (dữ liệu nhập trước); form hiện "Thiếu nguồn" thay vì lỗi. */
export const AdminPlacePhoto = z.object({
  key: z.string(),
  source: PhotoSource.optional(),
  credit: z.string().optional(),
  license: z.string().optional(),
});
export type AdminPlacePhoto = z.infer<typeof AdminPlacePhoto>;

/**
 * Địa điểm trả cho form admin (GET, POST, PUT, activate). Đọc lỏng các trường người nhập có thể đã lưu sai
 * (giờ, độ dài chữ, ảnh) để form vẫn mở và báo lỗi cụ thể. Ngày giờ là chuỗi ISO.
 */
export const AdminPlace = z.object({
  id: ObjectIdString,
  status: PlaceStatus,
  slug: Slug,
  name: z.string(),
  aliases: z.array(z.string()),
  category: PlaceCategory,
  zone: Slug.optional(),
  tags: z.array(z.string()),
  location: GeoPoint.optional(),
  address: z.string().optional(),
  openingHours: z.array(z.object({ day: z.number(), open: z.string(), close: z.string() })),
  visitDurationMin: z.number().optional(),
  bestTime: z.array(BestTime),
  indoor: z.boolean().optional(),
  priceLevel: z.number().optional(),
  transport: z.array(Transport),
  practicalNotes: z.string().optional(),
  contact: z.object({ phone: z.string().optional(), fanpage: z.string().optional(), website: z.string().optional() }),
  ids: z.object({ googlePlaceId: z.string().optional(), osmId: z.string().optional() }),
  photos: z.array(AdminPlacePhoto),
  verifySource: VerifySource.optional(),
  lastVerifiedAt: z.iso.datetime().optional(),
  updatedAt: z.iso.datetime(),
});
export type AdminPlace = z.infer<typeof AdminPlace>;

export const ActivationIssueCode = z.enum(['location_missing', 'hours_invalid', 'verify_source_missing', 'photo_source_missing']);
export type ActivationIssueCode = z.infer<typeof ActivationIssueCode>;

/** Một điều kiện kích hoạt còn thiếu; API gửi trong `details` của lỗi VALIDATION_FAILED. */
export const ActivationIssue = z.object({ code: ActivationIssueCode, message: z.string() });
export type ActivationIssue = z.infer<typeof ActivationIssue>;

/** Các trường quyết định địa điểm kích hoạt được chưa. Dữ liệu đọc từ DB có thể thiếu hoặc sai nên để unknown. */
export interface ActivationSubject {
  location?: unknown;
  openingHours: readonly OpeningSlot[];
  verifySource?: unknown;
  photos: readonly unknown[];
}

/**
 * Điều kiện kích hoạt (ui-spec mục 12, ADR 0013): có toạ độ, giờ mở cửa hợp lệ, đã chọn nguồn xác nhận, mọi ảnh có nguồn.
 * Rỗng là kích hoạt được. Dùng ở API (kích hoạt, sửa địa điểm đã công khai) và ở form admin (danh sách còn thiếu).
 */
export function activationIssues(place: ActivationSubject): ActivationIssue[] {
  const issues: ActivationIssue[] = [];
  if (!GeoPoint.safeParse(place.location).success) issues.push({ code: 'location_missing', message: 'Chưa ghim toạ độ' });
  for (const message of openingHoursIssues(place.openingHours)) issues.push({ code: 'hours_invalid', message });
  if (!VerifySource.safeParse(place.verifySource).success) {
    issues.push({ code: 'verify_source_missing', message: 'Chưa chọn nguồn xác nhận' });
  }
  place.photos.forEach((photo, i) => {
    if (!PlacePhoto.safeParse(photo).success) {
      issues.push({ code: 'photo_source_missing', message: `Ảnh ${i + 1} chưa ghi đủ nguồn, người giữ bản quyền và giấy phép` });
    }
  });
  return issues;
}

/** Thân POST /v1/admin/cities/:city/places/duplicate-check: gọi khi gõ tên, ghim, nhập số điện thoại hay fanpage. */
export const DuplicateCheckInput = z.object({
  name: text(120),
  location: GeoPoint.optional(),
  /** Số người nhập gõ; API tự chuẩn hoá về +84 trước khi so. */
  phone: z.string().trim().max(30).optional(),
  fanpage: z.string().trim().max(300).optional(),
  /** Địa điểm đang sửa: không so với chính nó. */
  excludeId: ObjectIdString.optional(),
});
export type DuplicateCheckInput = z.infer<typeof DuplicateCheckInput>;

/** likely: điểm từ 0,85; possible: từ 0,6, hoặc tên rất giống trong 150 m (technical-design mục 9). */
export const DuplicateLevel = z.enum(['likely', 'possible']);
export type DuplicateLevel = z.infer<typeof DuplicateLevel>;

export const DuplicateMatch = z.object({
  id: ObjectIdString,
  name: z.string(),
  status: PlaceStatus,
  zoneName: z.string().optional(),
  /** Mét, làm tròn; không có khi một trong hai chỗ chưa ghim. */
  distanceM: z.number().int().min(0).optional(),
  score: z.number().min(0).max(1),
  level: DuplicateLevel,
});
export type DuplicateMatch = z.infer<typeof DuplicateMatch>;

export const DuplicateCheckResponse = z.object({ matches: z.array(DuplicateMatch) });
export type DuplicateCheckResponse = z.infer<typeof DuplicateCheckResponse>;

/** Số trong query: chỉ chữ số, dấu trừ, dấu chấm (chuỗi rỗng không thành 0). */
const coordinate = (min: number, max: number) =>
  z
    .string()
    .regex(/^-?\d+(\.\d+)?$/, 'Toạ độ phải là số')
    .transform(Number)
    .pipe(z.number().min(min).max(max));

/** Query GET /v1/admin/cities/:city/zones/suggest. */
export const ZoneSuggestQuery = z.object({ lng: coordinate(-180, 180), lat: coordinate(-90, 90) });
export type ZoneSuggestQuery = z.infer<typeof ZoneSuggestQuery>;

/** Cụm gợi ý cho điểm ghim (decisions 2026-10-07): một cụm, hai cụm khi nằm trên cạnh chung, rỗng khi thành phố chưa có cụm. */
export const ZoneSuggestResponse = z.object({ zones: z.array(z.object({ slug: Slug, name: z.string() })) });
export type ZoneSuggestResponse = z.infer<typeof ZoneSuggestResponse>;
