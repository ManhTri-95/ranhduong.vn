import { z } from 'zod';
import { Slug } from './common.js';

export const ItineraryKind = z.enum(['template', 'user']);
export type ItineraryKind = z.infer<typeof ItineraryKind>;

export const ItineraryTransport = z.enum(['motorbike', 'car', 'taxi']);
export type ItineraryTransport = z.infer<typeof ItineraryTransport>;

export const ItineraryPace = z.enum(['relaxed', 'packed']);
export type ItineraryPace = z.infer<typeof ItineraryPace>;

export const ItineraryVisibility = z.enum(['public', 'unlisted']);
export type ItineraryVisibility = z.infer<typeof ItineraryVisibility>;

/** Chỉ áp cho lịch trình mẫu: web chỉ hiện bản published; S15 chuyển trạng thái khi không còn lỗi. */
export const ItineraryStatus = z.enum(['draft', 'published']);
export type ItineraryStatus = z.infer<typeof ItineraryStatus>;

export const StopKind = z.enum(['visit', 'meal']);
export type StopKind = z.infer<typeof StopKind>;

/** Lịch trình dài 1–5 ngày (technical-design mục 3). */
export const TripDays = z.literal([1, 2, 3, 4, 5]);
export type TripDays = z.infer<typeof TripDays>;

/** Thẻ lịch trình mẫu trên trang chủ (ui-spec mục 4: rộng 250px, cuộn ngang). */
export const ItineraryCard = z.object({
  slug: Slug,
  title: z.string().min(1),
  days: TripDays,
  transport: ItineraryTransport,
  pace: ItineraryPace,
  coverKey: z.string().optional(),
});
export type ItineraryCard = z.infer<typeof ItineraryCard>;

/** Query của GET /v1/cities/:city/itineraries/templates. Lọc `days`, `style` thêm khi có trang cần. */
export const ItineraryTemplateQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
export type ItineraryTemplateQuery = z.infer<typeof ItineraryTemplateQuery>;

export const ItineraryCardList = z.object({ items: z.array(ItineraryCard) });
export type ItineraryCardList = z.infer<typeof ItineraryCardList>;
