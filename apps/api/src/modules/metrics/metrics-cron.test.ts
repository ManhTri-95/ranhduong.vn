import { describe, expect, it } from 'vitest';
import { nextMetricsRollup } from './metrics-cron';
describe('S18 00:15 Vietnamese cron', () => {
  it('schedules the next local 00:15 across midnight and year rollover', () => {
    expect(nextMetricsRollup(new Date('2026-10-10T17:10:00Z')).toISOString()).toBe('2026-10-10T17:15:00.000Z');
    expect(nextMetricsRollup(new Date('2026-10-10T17:15:00Z')).toISOString()).toBe('2026-10-11T17:15:00.000Z');
    expect(nextMetricsRollup(new Date('2026-12-31T20:00:00Z')).toISOString()).toBe('2027-01-01T17:15:00.000Z');
  });
});
