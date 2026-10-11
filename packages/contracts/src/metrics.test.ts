import { describe, expect, it } from 'vitest';
import { EventBatch, MetricDayKey, metricsDayKey, metricsWeekStart, shiftMetricDay } from './metrics.js';
const event = { type: 'direction_click', placeId: '0123456789abcdef01234567' };
describe('S18 event contracts and Vietnamese calendar', () => {
  it('accepts 1–20 allowlisted events and rejects personal or arbitrary fields', () => {
    expect(EventBatch.safeParse({ events: Array(20).fill(event) }).success).toBe(true);
    for (const events of [[], Array(21).fill(event), [{ ...event, type: 'voucher_claim' }], [{ ...event, email: 'fake@example.com' }], [{ ...event, placeId: 'invalid' }]]) expect(EventBatch.safeParse({ events }).success).toBe(false);
    expect(EventBatch.safeParse({ events: [event], visitorId: 'spoofed' }).success).toBe(false);
    expect(EventBatch.safeParse({ events: [{ type: 'place_view', placeId: event.placeId, source: 'map' }] }).success).toBe(true);
  });
  it('uses UTC+7 day rollover and Monday week boundaries, including year rollover', () => {
    expect(metricsDayKey(new Date('2026-10-11T16:59:59Z'))).toBe('2026-10-11');
    expect(metricsDayKey(new Date('2026-10-11T17:00:00Z'))).toBe('2026-10-12');
    expect(metricsWeekStart('2026-10-11')).toBe('2026-10-05');
    expect(metricsWeekStart('2026-01-01')).toBe('2025-12-29');
    expect(shiftMetricDay('2025-12-31', 1)).toBe('2026-01-01');
    expect(MetricDayKey.safeParse('2026-02-30').success).toBe(false);
  });
});
