import { NotEnoughPlacesDetails, verificationStale, type BestTime, type ItineraryPlace, type PlaceCategory, type PlaceCover, type PlaceStatus, type TripDays, type Transport } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { fakePlace, fakeRequest, fakeTemplate, NOW, placesIn, planInput, ZONES } from '../../../testing/planner-fixtures';
import { isEligible, isLeisurePlace } from './candidates';
import { VISITS_PER_DAY } from './plan-context';
import { planItinerary } from './plan-itinerary';

const DAY_MS = 86_400_000;
const ids = (...ns: number[]) => ns.map((n) => fakePlace(n).id);

describe('planItinerary', () => {
  it('dùng mẫu gần nhất, trả templateId và từng ngày cho bước sắp tuyến', () => {
    const places = placesIn(0, 4, 1).map((p, i) => (i === 0 ? { ...p, bestTime: ['evening'] as BestTime[] } : p));
    const r = planItinerary(planInput({ places, templates: [fakeTemplate('tpl-gia-lap', [], [places.map((p) => p.id)])] }));
    expect(r).toMatchObject({
      ok: true, templateId: 'tpl-gia-lap',
      days: [{ day: 1, date: '2026-11-23', weekday: 1, rainy: false, pace: 'relaxed', zoneIds: [ZONES[0]!.id] }],
    });
    expect(r.ok && r.days[0]?.visits).toHaveLength(4);
    expect(r.ok && r.days[0]?.visits.filter((v) => v.pin === 'last')).toHaveLength(1);
    expect(r.ok && r.days[0]?.visits.every((v) => v.zoneId === ZONES[0]!.id)).toBe(true);
  });
  it('mẫu không đủ điểm thì tạo từ đầu, không có templateId', () => {
    const places = [...placesIn(0, 4, 1, { status: 'closed' }), ...placesIn(1, 4, 11)];
    const r = planItinerary(planInput({ places, templates: [fakeTemplate('tpl-gia-lap', [], [ids(1, 2, 3, 4)])] }));
    expect(r.ok).toBe(true);
    expect(r.ok && r.templateId).toBeUndefined();
    expect(r.ok && r.days[0]?.zoneIds).toEqual([ZONES[1]!.id]);
  });
  it('cùng đầu vào cho cùng kết quả, kể cả khi thứ tự places và templates khác', () => {
    const places = [0, 1, 2, 3].flatMap((z) => placesIn(z, 6, z * 10, { tags: z % 2 ? ['chill'] : [] }));
    const templates = [fakeTemplate('b', [], [[], [], []]), fakeTemplate('a', [], [[], [], []])];
    const input = planInput({ request: fakeRequest({ days: 3, tags: ['chill_cafe'] }), places, templates, popularity: new Map([[places[3]!.id, 5]]) });
    expect(planItinerary({ ...input, places: [...places].reverse(), templates: [...templates].reverse() })).toEqual(planItinerary(input));
  });
  it('NOT_ENOUGH_PLACES gợi ý số ngày lớn nhất còn tạo được', () => {
    const r = planItinerary(planInput({ request: fakeRequest({ days: 4, tags: ['chill_cafe'] }), places: [0, 1, 2].flatMap((z) => placesIn(z, 4, z * 10)) }));
    expect(r).toMatchObject({ ok: false, code: 'NOT_ENOUGH_PLACES', details: { suggestions: [{ kind: 'reduce_days', days: 3 }] } });
    expect(r.ok ? [] : r.details.shortages).toEqual([{ day: 4, zoneSlugs: [ZONES[3]!.slug], available: 0 }]);
  });
  it('gợi ý bỏ gu chỉ khi bỏ gu đổi được mẫu và tạo được', () => {
    // Chỉ cụm 0 có điểm nên tạo từ đầu 2 ngày thất bại; mẫu 'a' không gu dùng cụm 0 cả hai ngày;
    // mẫu 'b' hợp gu của khách nhưng trỏ điểm đã đóng ở cụm 1.
    const places = [...placesIn(0, 8, 1), ...placesIn(1, 4, 21, { status: 'closed' })];
    const templates = [fakeTemplate('a', [], [ids(1, 2, 3, 4), ids(5, 6, 7, 8)]), fakeTemplate('b', ['chill_cafe'], [ids(21, 22), ids(23, 24)])];
    const r = planItinerary(planInput({ request: fakeRequest({ days: 2, tags: ['chill_cafe'] }), places, templates }));
    expect(r.ok ? null : r.details.suggestions).toEqual([{ kind: 'reduce_days', days: 1 }, { kind: 'drop_interests' }]);
  });
  it('không có điểm nào: báo ngày thiếu, không có gợi ý', () => {
    expect(planItinerary(planInput({ places: [] }))).toEqual({
      ok: false, code: 'NOT_ENOUGH_PLACES',
      details: { shortages: [{ day: 1, zoneSlugs: [ZONES[0]!.slug], available: 0 }], suggestions: [] },
    });
  });

  it('bất biến trên dữ liệu giả ngẫu nhiên có hạt cố định', () => {
    let seed = 34;
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
    const places: ItineraryPlace[] = Array.from({ length: 160 }, (_, i) => fakePlace(i + 1, {
      zoneId: pick(ZONES).id,
      status: pick<PlaceStatus>(['active', 'active', 'active', 'active', 'suspected', 'hidden', 'draft']),
      lastVerifiedAt: new Date(NOW.getTime() - Math.floor(rand() * 110) * DAY_MS).toISOString(),
      category: pick<PlaceCategory>(['attraction', 'attraction', 'cafe', 'cafe', 'activity', 'shop', 'food', 'stay']),
      tags: rand() < 0.4 ? [pick(['chill', 'view-doi', 'song-ao', 'mao-hiem', 'an-sang', 'dac-san', 'gia-dinh'])] : [],
      bestTime: rand() < 0.3 ? [pick<BestTime>(['sunrise', 'morning', 'afternoon', 'sunset', 'evening'])] : [],
      transport: pick<Transport[]>([[], ['motorbike'], ['car'], ['motorbike', 'car']]),
      openingHours: [0, 1, 2, 3, 4, 5, 6].filter(() => rand() < 0.85).map((day) => ({ day, open: '07:00', close: '21:00' })),
      cover: pick<PlaceCover | undefined>(['full', 'partial', 'none', undefined]),
    }));
    const zoneIds = new Set(ZONES.map((z) => z.id));
    const slugOf = new Map(ZONES.map((z) => [z.id, z.slug]));
    const byId = new Map(places.map((p) => [p.id, p]));
    // Đủ dữ liệu (160 điểm) và thưa (40 điểm đầu) × 1–5 ngày × 7 thứ khởi hành × 2 nhịp, để chạm cả hai nhánh kết quả.
    const startDates = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
    const cases = [places, places.slice(0, 40)].flatMap((pool) => ([1, 2, 3, 4, 5] satisfies TripDays[]).flatMap((days) => startDates.flatMap((startDate) =>
      (['relaxed', 'packed'] as const).map((pace) => ({ pool, request: fakeRequest({ days, startDate, pace, tags: ['chill_cafe'] }) })))));
    let planned = 0;
    let short = 0;
    for (const { pool, request } of cases) {
      const r = planItinerary(planInput({ request, places: pool }));
      if (!r.ok) {
        short++;
        expect(() => NotEnoughPlacesDetails.parse(r.details)).not.toThrow();
        expect(r.details.suggestions.every((s) => s.kind !== 'reduce_days' || s.days < request.days)).toBe(true);
        continue;
      }
      planned++;
      const visited = r.days.flatMap((d) => d.visits.map((v) => v.placeId));
      expect(new Set(visited).size).toBe(visited.length);
      const firstFour = r.days.slice(0, 4).flatMap((d) => d.zoneIds);
      expect(new Set(firstFour).size).toBe(firstFour.length);
      for (const d of r.days) {
        expect(d.visits.length).toBeGreaterThanOrEqual(3);
        expect(d.visits.length).toBeLessThanOrEqual(VISITS_PER_DAY[d.pace]);
        expect(d.zoneIds.length === 1 || d.zoneIds.length === 2).toBe(true);
        const [a, b] = d.zoneIds;
        if (a && b) expect(ZONES.find((z) => z.id === a)?.adjacentZones).toContain(slugOf.get(b));
        expect(d.visits.filter((v) => v.pin === 'first').length).toBeLessThanOrEqual(1);
        expect(d.visits.filter((v) => v.pin === 'last').length).toBeLessThanOrEqual(1);
        for (const visit of d.visits) {
          const place = byId.get(visit.placeId)!;
          // Kiểm thẳng tiêu chí lát 2 (không dựa riêng vào isEligible): active, xác minh trong 90 ngày, có ca mở đúng thứ.
          expect(place.status).toBe('active');
          expect(verificationStale(place.lastVerifiedAt, NOW)).toBe(false);
          expect(place.openingHours.some((slot) => slot.day === d.weekday)).toBe(true);
          expect(isEligible(place, { weekday: d.weekday, transport: request.transport, now: NOW, zoneIds })).toBe(true);
          expect(d.zoneIds).toContain(visit.zoneId);
          if (d.day === 5) expect(isLeisurePlace(place)).toBe(true);
        }
      }
    }
    expect(planned).toBeGreaterThan(0);
    expect(short).toBeGreaterThan(0);
  });
});
