import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItineraryCoverageQuery } from './itinerary-coverage.js';

afterEach(() => vi.useRealTimers());
describe('S36 coverage query', () => {
  it('defaults the report context and accepts a future seven-date window', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-11-20T17:30:00Z'));
    expect(ItineraryCoverageQuery.parse({})).toEqual({ transport: 'motorbike', with: 'friends' });
    expect(ItineraryCoverageQuery.parse({ startDate: '2026-12-29', transport: 'taxi', with: 'family' })).toEqual({ startDate: '2026-12-29', transport: 'taxi', with: 'family' });
  });
  it('rejects impossible dates, past Vietnam dates and invalid context', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-11-20T17:30:00Z'));
    for (const input of [{ startDate: '2026-11-20' }, { startDate: '2027-02-30' }, { transport: 'bus' }, { with: 'unknown' }, { startDate: ['2026-12-29'] }]) {
      expect(ItineraryCoverageQuery.safeParse(input).success).toBe(false);
    }
  });
});
