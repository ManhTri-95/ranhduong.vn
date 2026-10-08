import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { BestTime, PhotoSource, PlaceCategory, PlaceCover, PlaceSource, PlaceStatus, Transport, VerifySource, VipTier } from './enums.js';
import { GeoPoint } from './geojson.js';
import { OpeningSlot } from './opening-hours.js';
import { PlaceCursor } from './place-cursor.js';

/** Bán kính check-in mặc định cho quán nhỏ (product-spec: khoảng 100m). */
export const DEFAULT_CHECKIN_RADIUS_M = 100;

/** Ảnh chỉ dùng khi có quyền: luôn ghi nguồn, người giữ bản quyền và giấy phép (ADR 0013). */
export const PlacePhoto = z.object({
  key: z.string().min(1),
  source: PhotoSource,
  credit: z.string().trim().min(1, 'Ảnh phải ghi người giữ bản quyền'),
  license: z.string().trim().min(1, 'Ảnh phải ghi giấy phép'),
});
export type PlacePhoto = z.infer<typeof PlacePhoto>;

export const PlaceContact = z.object({
  /** Dạng +84…, ví dụ +84912345678 (data-collection mục 5). */
  phone: z.string().regex(/^\+84\d{9,10}$/, 'Số điện thoại phải có dạng +84…').optional(),
  /** Chỉ http/https: giá trị được render thành <a href> trên trang công khai, chặn javascript:, data:. */
  fanpage: z.httpUrl().optional(),
  website: z.httpUrl().optional(),
});
export type PlaceContact = z.infer<typeof PlaceContact>;

/**
 * Chuẩn hoá số điện thoại Việt Nam về dạng +84… (data-collection mục 4): bỏ khoảng trắng, dấu chấm, gạch, ngoặc;
 * số bắt đầu bằng 0 hoặc 84 đổi thành +84. Không đọc được thì null.
 */
export function normalizeVnPhone(input: string): string | null {
  const compact = input.replace(/[\s.\-()]/g, '');
  let local: string | null = null;
  if (compact.startsWith('+84')) local = compact.slice(3);
  else if (compact.startsWith('0')) local = compact.slice(1);
  else if (compact.startsWith('84') && compact.length >= 11) local = compact.slice(2);
  return local !== null && /^\d{9,10}$/.test(local) ? `+84${local}` : null;
}

/** Chỉ lưu định danh, không lưu nội dung của Google (ADR 0001). */
export const PlaceIds = z.object({
  googlePlaceId: z.string().min(1).optional(),
  osmId: z.string().min(1).optional(),
});
export type PlaceIds = z.infer<typeof PlaceIds>;

/** Số danh mục phụ tối đa của một địa điểm. */
export const MAX_ALSO_CATEGORIES = 2;

/** Danh mục phụ: quán phục vụ thêm loại khác (ví dụ cà phê có cơm trưa); danh mục chính vẫn quyết định ghim, tem. */
export const AlsoCategories = z.array(PlaceCategory).max(MAX_ALSO_CATEGORIES, `Tối đa ${MAX_ALSO_CATEGORIES} danh mục phụ`);

/** Lỗi của danh mục phụ so với danh mục chính; null là hợp lệ. */
export function alsoCategoriesIssue(category: PlaceCategory, alsoCategories: readonly PlaceCategory[]): string | null {
  if (alsoCategories.includes(category)) return 'Danh mục phụ không được trùng danh mục chính';
  if (new Set(alsoCategories).size !== alsoCategories.length) return 'Danh mục phụ bị lặp';
  return null;
}

/**
 * Địa điểm như lưu trong DB (technical-design mục 3). Nháp (form admin, OSM, import CSV) chỉ cần các trường bắt buộc,
 * kể cả chưa ghim toạ độ; điều kiện kích hoạt kiểm bằng activationIssues (place-admin.ts).
 */
export const Place = z.object({
  cityId: ObjectIdString,
  zoneId: ObjectIdString.optional(),
  slug: Slug,
  slugHistory: z.array(Slug).default([]),
  name: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)).default([]),
  /** normalizeName(name) của packages/geo, dùng chống trùng; có thể rỗng khi tên chỉ gồm từ chung. */
  nameNorm: z.string(),
  category: PlaceCategory,
  alsoCategories: AlsoCategories.default([]),
  tags: z.array(Slug).default([]),
  location: GeoPoint.optional(),
  address: z.string().trim().min(1).optional(),
  checkinRadiusM: z.number().int().positive().default(DEFAULT_CHECKIN_RADIUS_M),
  openingHours: z.array(OpeningSlot).default([]),
  visitDurationMin: z.number().int().positive().optional(),
  bestTime: z.array(BestTime).default([]),
  cover: PlaceCover.optional(),
  priceLevel: z.literal([1, 2, 3, 4]).optional(),
  transport: z.array(Transport).default([]),
  practicalNotes: z.string().trim().min(1).optional(),
  contact: PlaceContact.default({}),
  ids: PlaceIds.default({}),
  photos: z.array(PlacePhoto).default([]),
  status: PlaceStatus.default('draft'),
  mergedInto: ObjectIdString.optional(),
  lastVerifiedAt: z.date().optional(),
  verifySource: VerifySource.optional(),
  suspicionScore: z.number().min(0).default(0),
  source: PlaceSource,
  ownerId: ObjectIdString.optional(),
  vipTier: VipTier.default('free'),
  stampKey: z.string().min(1).optional(),
  /** Chỉ từ đánh giá trên nền tảng, không lấy rating của Google. */
  ratingAvg: z.number().min(1).max(5).optional(),
  ratingCount: z.number().int().min(0).default(0),
})
  .superRefine((place, ctx) => {
    const issue = alsoCategoriesIssue(place.category, place.alsoCategories);
    if (issue) ctx.addIssue({ code: 'custom', path: ['alsoCategories'], message: issue });
  });
export type Place = z.infer<typeof Place>;

/** Chiều rộng các bản WebP sinh khi upload (S06, ui-spec mục 11). */
export const PHOTO_WIDTHS = [400, 800, 1200] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

/** Khoá object của một bản WebP; S06 phải sinh đúng các khoá này cạnh ảnh gốc. */
export function photoVariantKey(key: string, width: PhotoWidth): string {
  return `${key}/${width}.webp`;
}

/**
 * Hiện nhãn "Thông tin chưa được quán xác nhận" khi quán chưa được chủ xác nhận.
 * Không áp cho điểm tham quan công cộng (category attraction): với loại này, verifySource admin là bình thường
 * (ui-spec mục 4).
 */
export function needsOwnerConfirmation(place: { category: PlaceCategory; verifySource?: VerifySource }): boolean {
  return place.category !== 'attraction' && place.verifySource !== 'owner';
}

/** Địa điểm phục vụ danh mục `c`: là danh mục chính hoặc một danh mục phụ (trang danh mục, chỗ ăn trong lịch trình). */
export function servesCategory(place: { category: PlaceCategory; alsoCategories?: readonly PlaceCategory[] }, c: PlaceCategory): boolean {
  return place.category === c || (place.alsoCategories ?? []).includes(c);
}

/** Trời mưa vẫn có chỗ ngồi: che hết hoặc che một phần (chế độ mưa, chip "Trú mưa được"). Chưa rõ thì không tính. */
export function rainSafe(place: { cover?: PlaceCover }): boolean {
  return place.cover === 'full' || place.cover === 'partial';
}

/** Có chỗ ngồi ngoài trời: che một phần hoặc không che (chip "Ngoài trời"). Chưa rõ thì không tính. */
export function hasOpenAir(place: { cover?: PlaceCover }): boolean {
  return place.cover === 'partial' || place.cover === 'none';
}

/** Thẻ địa điểm ngang trên trang chủ, trang danh mục, trang tìm kiếm (ui-spec mục 4). */
export const PlaceCard = z.object({
  slug: Slug,
  name: z.string(),
  category: PlaceCategory,
  /** Danh mục phụ, chỉ có khi khác rỗng: thẻ ghi "Cà phê, Ăn uống". */
  alsoCategories: z.array(PlaceCategory).optional(),
  zoneName: z.string().optional(),
  /** Câu đầu của practicalNotes, hiện bằng chữ viết tay. */
  note: z.string().optional(),
  /** Trình duyệt tự tính trạng thái mở cửa theo giờ Việt Nam, vì trang được cache SWR. */
  openingHours: z.array(OpeningSlot),
  /** true: dòng trạng thái thay bằng "Thông tin chưa được quán xác nhận". */
  unconfirmed: z.boolean(),
  coverKey: z.string().optional(),
});
export type PlaceCard = z.infer<typeof PlaceCard>;

const MAX_QUERY_LENGTH = 100;

/** Số thẻ lọc tối đa trong một lần gọi (`tags=a,b`). */
export const MAX_FILTER_TAGS = 10;

/** Chuỗi nhiều giá trị cách nhau bằng dấu phẩy (`a,b`); rỗng hoặc chỉ có dấu phẩy thì coi như không có. */
function commaList<T extends z.ZodType<unknown, string>>(item: T) {
  return z
    .string()
    .optional()
    .transform((s) => {
      const parts = s?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];
      return parts.length > 0 ? parts : undefined;
    })
    .pipe(z.array(item).optional());
}

/** Query của GET /v1/cities/:city/places. */
export const PlaceListQuery = z
  .object({
    /** Từ khoá tìm không dấu; rỗng hoặc chỉ có khoảng trắng thì coi như không có. */
    q: z
      .string()
      .trim()
      .max(MAX_QUERY_LENGTH, `Từ khoá tối đa ${MAX_QUERY_LENGTH} ký tự`)
      .optional()
      .transform((s) => s || undefined),
    /** Một hoặc nhiều danh mục, cách nhau bằng dấu phẩy: `category=cafe,food`. */
    category: commaList(PlaceCategory),
    /** Một hoặc nhiều thẻ: `tags=view-doi,chill`; địa điểm phải có đủ mọi thẻ. */
    tags: commaList(Slug).refine((tags) => (tags?.length ?? 0) <= MAX_FILTER_TAGS, `Tối đa ${MAX_FILTER_TAGS} thẻ`),
    /** Slug cụm khu vực trong thành phố: `zone=trung-tam`. */
    zone: Slug.optional(),
    /** `nextCursor` của trang trước. */
    cursor: PlaceCursor.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .superRefine((query, ctx) => {
    // Kết quả tìm xếp theo độ khớp chứ không theo thứ tự nổi bật, nên chưa phân trang được (S13).
    if (query.q && query.cursor) {
      ctx.addIssue({ code: 'custom', path: ['cursor'], message: 'Tìm theo từ khoá chưa phân trang được' });
    }
  });
export type PlaceListQuery = z.infer<typeof PlaceListQuery>;

/** Một thẻ và số địa điểm có thẻ đó. */
export const TagCount = z.object({ slug: Slug, count: z.number().int().positive() });
export type TagCount = z.infer<typeof TagCount>;

export const PlaceListResponse = z.object({
  items: z.array(PlaceCard),
  /** Có khi còn trang sau: gửi lại trong `cursor`. Không có khi tìm theo từ khoá. */
  nextCursor: z.string().optional(),
  /** Thẻ của các địa điểm khớp thành phố, danh mục, cụm (trước khi lọc thẻ, từ khoá, phân trang); nhiều chỗ trước. */
  tags: z.array(TagCount),
});
export type PlaceListResponse = z.infer<typeof PlaceListResponse>;
