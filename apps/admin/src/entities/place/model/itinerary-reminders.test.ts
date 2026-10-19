import type { AdminPlaceSummary } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { itineraryReminders } from './itinerary-reminders';

const NOW = new Date('2026-10-19T03:00:00.000Z');
const DAY_MS = 86_400_000;
const complete = {
  zone: 'cum-gia-lap',
  visitDurationMin: 45,
  bestTime: ['morning'],
  lastVerifiedAt: '2026-10-18T03:00:00.000Z',
} satisfies Pick<AdminPlaceSummary, 'zone' | 'visitDurationMin' | 'bestTime' | 'lastVerifiedAt'>;

describe('itineraryReminders', () => {
  it('đủ dữ liệu, xác minh mới thì không nhắc', () => {
    expect(itineraryReminders(complete, NOW)).toEqual([]);
  });

  it('nhắc từng trường còn thiếu, dữ liệu cũ không có mảng thời điểm đẹp vẫn đọc được', () => {
    expect(itineraryReminders({ ...complete, visitDurationMin: undefined }, NOW)).toEqual(['duration_missing']);
    expect(itineraryReminders({ ...complete, bestTime: [] }, NOW)).toEqual(['best_time_missing']);
    expect(itineraryReminders({ ...complete, bestTime: undefined }, NOW)).toEqual(['best_time_missing']);
    expect(itineraryReminders({ ...complete, zone: undefined }, NOW)).toEqual(['zone_missing']);
    expect(itineraryReminders({}, NOW)).toEqual(['duration_missing', 'best_time_missing', 'zone_missing', 'verification_stale']);
  });

  it.each([
    [83 * DAY_MS - 1, []],
    [83 * DAY_MS, ['verification_due']],
    [89 * DAY_MS, ['verification_due']],
    [90 * DAY_MS, ['verification_due']],
    [90 * DAY_MS + 1, ['verification_stale']],
    [100 * DAY_MS, ['verification_stale']],
    [-DAY_MS, []],
  ])('sau %i ms, nhắc xác minh đúng biên và không chồng hai loại', (age, expected) => {
    const lastVerifiedAt = new Date(NOW.getTime() - age).toISOString();
    expect(itineraryReminders({ ...complete, lastVerifiedAt }, NOW)).toEqual(expected);
  });

  it('chưa xác minh hoặc ngày lỗi thì cần xác minh lại, không báo sắp tới hạn', () => {
    for (const lastVerifiedAt of [undefined, 'khong-phai-ngay']) {
      expect(itineraryReminders({ ...complete, lastVerifiedAt }, NOW)).toEqual(['verification_stale']);
    }
  });
});
