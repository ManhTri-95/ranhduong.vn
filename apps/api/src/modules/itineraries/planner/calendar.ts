const DAY_MS = 86_400_000;

/** Một ngày của chuyến: số thứ tự từ 1, ngày 'YYYY-MM-DD' giờ Việt Nam, thứ (0 = Chủ nhật), 'MM-DD' để so mùa. */
export interface TripDay {
  day: number;
  date: string;
  weekday: number;
  monthDay: string;
}

/** Các ngày của chuyến từ `startDate` (đã validate bởi ItineraryRequest). Tính trên lịch UTC nên không lệch múi giờ. */
export function tripCalendar(startDate: string, days: number): TripDay[] {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(start + i * DAY_MS);
    const iso = date.toISOString().slice(0, 10);
    return { day: i + 1, date: iso, weekday: date.getUTCDay(), monthDay: iso.slice(5) };
  });
}
