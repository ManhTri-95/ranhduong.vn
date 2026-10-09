import type { OpeningSlot, PlaceDetail } from '@ranhduong/contracts';

/** Google Maps URL only; coordinates come from editorial data, never from Google. */
export function directionHref(place: Pick<PlaceDetail, 'status' | 'location' | 'googlePlaceId'>): string | undefined {
  if (place.status === 'closed' || !place.location) return undefined;
  const [lng, lat] = place.location.coordinates;
  const query = new URLSearchParams({ api: '1', destination: `${lat},${lng}` });
  if (place.googlePlaceId) query.set('destination_place_id', place.googlePlaceId);
  return `https://www.google.com/maps/dir/?${query}`;
}

const DAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export interface OpeningHoursRow { day: number; label: string; text: string }

export function openingHoursRows(slots: readonly OpeningSlot[]): OpeningHoursRow[] {
  if (!slots.length) return [];
  return [1, 2, 3, 4, 5, 6, 0].map((day) => {
    const shifts = slots.filter((s) => s.day === day).sort((a, b) => a.open.localeCompare(b.open));
    const carry = slots.filter((s) => s.day === (day + 6) % 7 && s.close < s.open && s.close !== '00:00');
    const texts = [
      ...carry.map((s) => `00:00–${s.close} (từ hôm trước)`),
      ...shifts.map((s) => s.open === '00:00' && s.close === '24:00'
        ? 'Mở cả ngày' : `${s.open}–${s.close}${s.close < s.open ? ' (hôm sau)' : ''}`),
    ];
    return { day, label: DAYS[day] ?? '', text: texts.join(', ') || 'Đóng' };
  });
}

export function verificationDate(date: string | undefined): string | undefined {
  return date ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date)) : undefined;
}
