import {
  clockMinutes,
  coversVisit,
  DAY_END_MIN,
  MEAL_WINDOWS,
  NotEnoughPlacesDetails,
  servesCategory,
  verificationStale,
  type BestTime,
  type GeoPoint,
  type ItineraryPlace,
  type ItineraryRequest,
  type PlaceCategory,
  type PlaceCover,
  type PlaceStatus,
  type TripDays,
} from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { allDays, fakePlace, fakeRequest, NOW, placesIn, planInput, ZONES } from '../../../testing/planner-fixtures';
import { isEligible } from './candidates';
import { generateItinerary } from './generate-itinerary';
import { VISITS_PER_DAY } from './plan-context';

const DAY_MS = 86_400_000;
const STAY: GeoPoint = { type: 'Point', coordinates: [0.1734567, 0.1212345] };
const START_DATES = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];

/** Địa điểm giả có hạt cố định: cụm i nằm trong ô 0,04° lệch 0,05° kinh độ mỗi cụm. */
function seededPlaces(seed: number, count: number): ItineraryPlace[] {
  let state = seed;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
  return Array.from({ length: count }, (_, i) => {
    const zone = Math.floor(rand() * ZONES.length);
    const category = pick<PlaceCategory>(['attraction', 'attraction', 'cafe', 'cafe', 'activity', 'shop', 'food', 'food']);
    return fakePlace(i + 1, {
      zoneId: ZONES[zone]!.id,
      location: { type: 'Point', coordinates: [0.1 + zone * 0.05 + rand() * 0.04, 0.1 + rand() * 0.04] },
      status: pick<PlaceStatus>(['active', 'active', 'active', 'active', 'active', 'suspected', 'hidden']),
      lastVerifiedAt: new Date(NOW.getTime() - Math.floor(rand() * 100) * DAY_MS).toISOString(),
      category,
      alsoCategories: category !== 'food' && rand() < 0.1 ? ['food'] : [],
      tags: rand() < 0.4 ? [pick(['chill', 'view-doi', 'song-ao', 'mao-hiem', 'an-sang', 'dac-san', 'gia-dinh'])] : [],
      bestTime: rand() < 0.3 ? [pick<BestTime>(['sunrise', 'morning', 'afternoon', 'sunset', 'evening'])] : [],
      cover: pick<PlaceCover | undefined>(['full', 'partial', 'none', undefined]),
      priceLevel: pick<ItineraryPlace['priceLevel']>([undefined, 1, 2, 3, 4]),
      visitDurationMin: pick<number | undefined>([undefined, 45, 60, 90, 120]),
      openingHours: [0, 1, 2, 3, 4, 5, 6].filter(() => rand() < 0.85).map((day) => ({
        day, open: pick(['05:00', '06:00', '07:00', '08:00', '10:00', '17:00']), close: pick(['11:00', '14:00', '21:00', '22:00', '23:00', '02:00']),
      })),
    });
  });
}

/** 1–5 ngày × 7 thứ khởi hành × 2 nhịp × có/không nơi ở = 140 yêu cầu. */
function allRequests(): ItineraryRequest[] {
  return ([1, 2, 3, 4, 5] satisfies TripDays[]).flatMap((days) => START_DATES.flatMap((startDate) => (['relaxed', 'packed'] as const).flatMap((pace) =>
    [undefined, STAY].map((stayLocation) => fakeRequest({ days, startDate, pace, tags: ['chill_cafe'], ...(stayLocation ? { stayLocation } : {}) })))));
}

describe('S35 generateItinerary', () => {
  it('trả từng ngày đã xếp giờ cho S37', () => {
    const r = generateItinerary(planInput({ places: [...placesIn(0, 4, 1, { visitDurationMin: 90 }), fakePlace(9, { category: 'food' })] }));
    expect(r).toMatchObject({ ok: true, days: [{ day: 1, date: '2026-11-23', weekday: 1, startTime: '07:00', zoneIds: [ZONES[0]!.id], issues: [] }] });
    expect(r.ok && r.days[0]!.stops[0]).toMatchObject({ kind: 'visit', start: '07:00', travelMinFromPrev: 0 });
    expect(r.ok && r.days[0]!.stops.filter((s) => s.kind === 'meal')).toHaveLength(1);
  });

  it('nơi ở đổi điểm đầu tuyến nhưng không có trong kết quả', () => {
    const places = placesIn(0, 4, 1);
    const stay: GeoPoint = { type: 'Point', coordinates: [0.123456, 0.0987654] };
    const withStay = generateItinerary(planInput({ request: fakeRequest({ stayLocation: stay }), places }));
    expect(withStay.ok && withStay.days[0]!.stops[0]!.placeId).toBe(fakePlace(4).id);
    const noStay = generateItinerary(planInput({ places }));
    expect(noStay.ok && noStay.days[0]!.stops[0]!.placeId).toBe(fakePlace(1).id);
    expect(JSON.stringify(withStay)).not.toMatch(/0\.123456|0\.0987654|stay/);
  });

  it('cùng đầu vào cho cùng kết quả, kể cả thứ tự places khác', () => {
    const places = [0, 1, 2, 3].flatMap((z) => [...placesIn(z, 6, z * 10 + 1), ...placesIn(z, 2, z * 10 + 7, { category: 'food' })]);
    const input = planInput({ request: fakeRequest({ days: 3, tags: ['chill_cafe'] }), places });
    const r = generateItinerary(input);
    expect(r.ok).toBe(true);
    expect(generateItinerary({ ...input, places: [...places].reverse() })).toEqual(r);
  });

  it('S35 bỏ điểm làm thiếu ngày thì NOT_ENOUGH_PLACES, gợi ý đã chạy thử cả sắp tuyến', () => {
    const places = [...placesIn(0, 4, 1), ...placesIn(1, 4, 11, { openingHours: allDays('05:00', '05:30') })];
    expect(generateItinerary(planInput({ request: fakeRequest({ days: 2 }), places }))).toEqual({
      ok: false, code: 'NOT_ENOUGH_PLACES',
      details: { shortages: [{ day: 2, zoneSlugs: [ZONES[1]!.slug], available: 0 }], suggestions: [{ kind: 'reduce_days', days: 1 }] },
    });
  });

  it('quá 21:30 vì điểm buổi tối mở muộn thì bỏ điểm đó, không báo thiếu điểm', () => {
    const late = fakePlace(1, { bestTime: ['evening'], tags: ['chill'], visitDurationMin: 120, openingHours: allDays('20:00', '23:30') });
    const r = generateItinerary(planInput({ request: fakeRequest({ tags: ['chill_cafe'] }), places: [late, ...placesIn(0, 8, 2), ...placesIn(0, 3, 30, { category: 'food' })] }));
    expect(r.ok).toBe(true);
    expect(r.ok && r.days[0]!.stops.at(-1)!.end <= '21:30').toBe(true);
  });

  it('quá 21:30 vì bữa tối đẩy điểm buổi tối thì vẫn tạo được lịch trình', () => {
    const evening = fakePlace(1, { bestTime: ['evening'], tags: ['chill'], visitDurationMin: 120, openingHours: allDays('19:30', '23:30') });
    const lunch = fakePlace(20, { category: 'food', visitDurationMin: 60, openingHours: allDays('10:00', '14:00') });
    const dinner = fakePlace(21, { category: 'food', visitDurationMin: 90, openingHours: allDays('17:00', '22:00') });
    const r = generateItinerary(planInput({ request: fakeRequest({ tags: ['chill_cafe'] }), places: [evening, ...placesIn(0, 6, 2), lunch, dinner] }));
    expect(r.ok).toBe(true);
    expect(r.ok && r.days[0]!.stops.at(-1)!.end <= '21:30').toBe(true);
  });

  it('bất biến trên 200 địa điểm giả có hạt cố định', () => {
    const places = seededPlaces(35, 200);
    const byId = new Map(places.map((p) => [p.id, p]));
    const zoneIds = new Set(ZONES.map((z) => z.id));
    let planned = 0;
    let short = 0;
    for (const pool of [places, places.slice(0, 40)]) {
      for (const request of allRequests()) {
        const r = generateItinerary(planInput({ request, places: pool }));
        if (!r.ok) {
          short++;
          expect(() => NotEnoughPlacesDetails.parse(r.details)).not.toThrow();
          expect(r.details.suggestions.every((s) => s.kind !== 'reduce_days' || s.days < request.days)).toBe(true);
          continue;
        }
        planned++;
        const stopIds = r.days.flatMap((d) => d.stops.map((s) => s.placeId));
        expect(new Set(stopIds).size).toBe(stopIds.length);
        const detourIds = r.days.flatMap((d) => d.detours.map((x) => x.placeId));
        expect(new Set(detourIds).size).toBe(detourIds.length);
        expect(detourIds.filter((id) => stopIds.includes(id))).toEqual([]);
        if (request.stayLocation) expect(JSON.stringify(r)).not.toMatch(/0\.1734567|0\.1212345/);
        for (const d of r.days) {
          const visits = d.stops.filter((s) => s.kind === 'visit');
          expect(visits.length).toBeGreaterThanOrEqual(3);
          expect(visits.length).toBeLessThanOrEqual(VISITS_PER_DAY[d.pace]);
          expect(d.startTime === '04:45').toBe(byId.get(d.stops[0]!.placeId)!.bestTime.includes('sunrise'));
          let previousEnd = -1;
          for (const s of d.stops) {
            const place = byId.get(s.placeId)!;
            const start = clockMinutes(s.start);
            const end = clockMinutes(s.end);
            expect(place.status).toBe('active');
            expect(verificationStale(place.lastVerifiedAt, NOW)).toBe(false);
            expect(isEligible(place, { weekday: d.weekday, transport: request.transport, now: NOW, zoneIds })).toBe(true);
            expect(coversVisit(place, d.weekday, start, end)).toBe(true);
            expect(start).toBeGreaterThanOrEqual(previousEnd);
            previousEnd = end;
            if (s.kind === 'meal') {
              expect(servesCategory(place, 'food')).toBe(true);
              expect(MEAL_WINDOWS.some((w) => start >= w.start && start < w.end)).toBe(true);
            }
          }
          expect(previousEnd).toBeLessThanOrEqual(DAY_END_MIN);
          const first = clockMinutes(d.stops[0]!.start);
          for (const w of MEAL_WINDOWS) {
            const meals = d.stops.filter((s) => s.kind === 'meal' && clockMinutes(s.start) >= w.start && clockMinutes(s.start) < w.end);
            expect(meals.length).toBeLessThanOrEqual(1);
            const crossed = first < w.end && previousEnd > w.start;
            expect(d.issues.includes(`missing_${w.kind}`)).toBe(crossed && meals.length === 0);
          }
          for (const x of d.detours) {
            expect(x.detourMin).toBeLessThan(10);
            expect(x.afterIndex).toBeLessThan(d.stops.length - 1);
          }
        }
      }
    }
    expect(planned).toBeGreaterThan(0);
    expect(short).toBeGreaterThan(0);
  });

  it('p95 dưới 500 ms với 200 địa điểm giả', () => {
    const places = seededPlaces(35, 200);
    const durations = allRequests().map((request) => {
      const started = performance.now();
      generateItinerary(planInput({ request, places }));
      return performance.now() - started;
    }).sort((a, b) => a - b);
    const p95 = durations[Math.ceil(0.95 * durations.length) - 1]!;
    console.info(`S35 p95 ${p95.toFixed(1)} ms, max ${durations.at(-1)!.toFixed(1)} ms, ${durations.length} yêu cầu`);
    expect(p95).toBeLessThan(500);
  });
});
