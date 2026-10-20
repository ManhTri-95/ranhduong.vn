import { z } from 'zod';
import { Slug } from './common.js';
import { BestTime, PlaceCover, Transport } from './enums.js';
import { TripDays } from './itinerary.js';
import { TemplatePlace } from './itinerary-admin.js';

/** Snapshot một địa điểm cho thuật toán lịch trình (S34): dữ liệu xếp giờ của S15 cộng các trường chọn điểm. */
export const ItineraryPlace = TemplatePlace.extend({
  tags: z.array(Slug),
  bestTime: z.array(BestTime),
  cover: PlaceCover.optional(),
  transport: z.array(Transport),
  /** Chỉ từ đánh giá trên nền tảng; lát 2 chưa có nên thiếu. */
  ratingAvg: z.number().min(1).max(5).optional(),
});
export type ItineraryPlace = z.infer<typeof ItineraryPlace>;

/** Gợi ý khi thiếu điểm; thuật toán chỉ trả gợi ý đã chạy thử và tạo được. */
export const PlanSuggestion = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reduce_days'), days: TripDays }),
  /** Bỏ hết gu đã chọn. */
  z.object({ kind: z.literal('drop_interests') }),
]);
export type PlanSuggestion = z.infer<typeof PlanSuggestion>;

/** Ngày dưới 3 điểm tham quan: các cụm đã gán (rỗng khi không còn cụm nào) và số điểm tìm được. */
export const PlanShortage = z.object({
  day: z.number().int().min(1).max(5),
  zoneSlugs: z.array(Slug),
  available: z.number().int().nonnegative(),
});
export type PlanShortage = z.infer<typeof PlanShortage>;

/** `details` của lỗi NOT_ENOUGH_PLACES. */
export const NotEnoughPlacesDetails = z.object({
  shortages: z.array(PlanShortage).min(1),
  suggestions: z.array(PlanSuggestion),
});
export type NotEnoughPlacesDetails = z.infer<typeof NotEnoughPlacesDetails>;
