import { describe, expect, it } from 'vitest';
import { fakePlace, NOW, placesIn, planInput, ZONES } from '../../../testing/planner-fixtures';
import { buildCoverageReport, countCoveragePlaces } from './report';

const query = { startDate: '2026-11-23', transport: 'motorbike', with: 'friends' } as const;
describe('S36 read-only coverage', () => {
  it('runs every day count, pace, weekday and individual/default interest against S34–S35', async () => {
    const result = await buildCoverageReport(planInput(), query);
    expect(result).toMatchObject({ total: 420, passed: 0, failed: 420, startDate: '2026-11-23', endDate: '2026-11-29' });
    expect(new Set(result.failures.map((f) => `${f.days}:${f.pace}:${f.startWeekday}:${f.interest}`)).size).toBe(420);
    expect([...new Set(result.failures.map((f) => f.days))]).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(result.failures.map((f) => f.startWeekday))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]));
    expect(new Set(result.failures.map((f) => f.interest))).toEqual(new Set([null, 'chill_cafe', 'clouds_hills', 'photo_spots', 'nature_adventure', 'breakfast_specialties']));
    expect(result.failures[0]).toMatchObject({ reasons: [{ code: 'not_enough_places', day: 1, zoneSlugs: [ZONES[0]!.slug], available: 0 }] });
  });
  it('uses seven real dates across year boundaries and the current Vietnam day by default', async () => {
    const result = await buildCoverageReport(planInput(), { ...query, startDate: '2026-12-29' });
    expect(result.endDate).toBe('2027-01-04');
    expect(result.failures.find((f) => f.startWeekday === 1)?.startDate).toBe('2027-01-04');
    const current = await buildCoverageReport(planInput({ now: new Date('2026-11-20T18:00:00Z') }), { transport: 'car', with: 'solo' });
    expect(current.startDate).toBe('2026-11-21');
  });
  it('counts complete data once per zone and in every served category, including empty zones', () => {
    const places = [
      fakePlace(1, { visitDurationMin: 60, category: 'cafe', alsoCategories: ['food'] }),
      fakePlace(2, { visitDurationMin: 60, category: 'food' }),
      fakePlace(3, { visitDurationMin: undefined }),
      fakePlace(4, { visitDurationMin: 60, lastVerifiedAt: new Date(NOW.getTime() - 91 * 86400000).toISOString() }),
      fakePlace(5, { visitDurationMin: 60, zoneId: 'f'.repeat(24) }),
      fakePlace(6, { visitDurationMin: 60, openingHours: [{ day: 1, open: '09:00', close: '09:00' }] }),
      fakePlace(7, { visitDurationMin: 60, status: 'hidden' }),
      fakePlace(8, { visitDurationMin: 60, location: undefined }),
    ];
    const result = countCoveragePlaces(places, ZONES, NOW);
    expect(result[0]).toMatchObject({ total: 2, categories: { cafe: 1, food: 2, attraction: 0, activity: 0, shop: 0, stay: 0 } });
    expect(result.slice(1).map((z) => z.total)).toEqual([0, 0, 0]);
  });
  it('reports missing meals even when S35 generated enough visits, and retains the affected zones', async () => {
    const places = ZONES.flatMap((_z, i) => placesIn(i, 10, i * 20 + 1, { category: 'cafe', visitDurationMin: 90 }));
    const result = await buildCoverageReport(planInput({ places }), query);
    const failure = result.failures.find((f) => f.days === 1 && f.pace === 'packed' && f.interest === null && f.startWeekday === 1);
    expect(failure?.reasons).toContainEqual({ code: 'missing_lunch', day: 1, zoneSlugs: [ZONES[0]!.slug] });
    expect(failure?.reasons.some((r) => r.code === 'not_enough_places')).toBe(false);
    expect(result.passed + result.failed).toBe(420);
  });
  it('passes viable combinations when meals exist and does not mutate its snapshot', async () => {
    const places = ZONES.flatMap((_z, i) => [
      ...placesIn(i, 10, i * 30 + 1, { category: 'cafe', visitDurationMin: 45 }),
      ...placesIn(i, 5, i * 30 + 20, { category: 'food', visitDurationMin: 45 }),
    ]);
    const input = planInput({ places });
    const before = JSON.stringify(input);
    const report = await buildCoverageReport(input, query);
    expect(report.passed).toBeGreaterThan(0);
    expect(report.failures.some((f) => f.days === 1)).toBe(false);
    expect(JSON.stringify(input)).toBe(before);
  });
});
