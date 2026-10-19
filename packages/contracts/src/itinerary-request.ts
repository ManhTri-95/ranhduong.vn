import { z } from 'zod';
import { BBox, GeoPoint } from './geojson.js';
import { ItineraryPace, ItineraryTransport, TripDays } from './itinerary.js';
import { TripInterest, TripWith } from './trip.js';

const vietnamDate = new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
});

function todayInVietnam(): string {
  const parts = vietnamDate.formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}`;
}

/** Kiểm cấu trúc/ngày tại mỗi lần parse. Khi biết thành phố, dùng createItineraryRequestSchema. */
export const ItineraryRequest = z.object({
  days: TripDays,
  startDate: z.iso.date('Ngày đi phải là ngày có thật dạng YYYY-MM-DD')
    .refine((date) => date >= todayInVietnam(), 'Ngày đi không được trước hôm nay theo giờ Việt Nam'),
  transport: ItineraryTransport,
  with: TripWith,
  tags: z.array(TripInterest).max(3, 'Chọn tối đa 3 gu')
    .refine((tags) => new Set(tags).size === tags.length, 'Không chọn gu trùng nhau'),
  pace: ItineraryPace,
  stayLocation: GeoPoint.optional(),
});
export type ItineraryRequest = z.infer<typeof ItineraryRequest>;

/** API/form phải dùng khung City.mapBounds của thành phố đã chọn, không lấy khung từ request. */
export function createItineraryRequestSchema(mapBounds: BBox) {
  const [west, south, east, north] = BBox.parse(mapBounds);
  return ItineraryRequest.refine(({ stayLocation }) => {
    if (!stayLocation) return true;
    const [lng, lat] = stayLocation.coordinates;
    return lng >= west && lng <= east && lat >= south && lat <= north;
  }, { path: ['stayLocation', 'coordinates'], message: 'Nơi ở phải nằm trong khung bản đồ thành phố' });
}
