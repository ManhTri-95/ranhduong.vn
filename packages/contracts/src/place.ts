import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { BestTime, PhotoSource, PlaceCategory, PlaceSource, PlaceStatus, Transport, VerifySource, VipTier } from './enums.js';
import { GeoPoint } from './geojson.js';
import { OpeningSlot } from './opening-hours.js';

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

/** Chỉ lưu định danh, không lưu nội dung của Google (ADR 0001). */
export const PlaceIds = z.object({
  googlePlaceId: z.string().min(1).optional(),
  osmId: z.string().min(1).optional(),
});
export type PlaceIds = z.infer<typeof PlaceIds>;

/**
 * Địa điểm như lưu trong DB (technical-design mục 3). Nháp (OSM, import CSV) chỉ cần các trường bắt buộc;
 * điều kiện kích hoạt (toạ độ, giờ, nguồn xác nhận, ảnh có nguồn) kiểm ở S05/S07.
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
  tags: z.array(Slug).default([]),
  location: GeoPoint,
  address: z.string().trim().min(1).optional(),
  checkinRadiusM: z.number().int().positive().default(DEFAULT_CHECKIN_RADIUS_M),
  openingHours: z.array(OpeningSlot).default([]),
  visitDurationMin: z.number().int().positive().optional(),
  bestTime: z.array(BestTime).default([]),
  indoor: z.boolean().optional(),
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
});
export type Place = z.infer<typeof Place>;
