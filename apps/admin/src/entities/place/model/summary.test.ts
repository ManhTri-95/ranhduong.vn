import { AdminPlace, AdminPlaceSummary } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { toPlaceSummary } from './summary';

// Dữ liệu giả, tên rõ là giả.
const base = AdminPlace.parse({
  id: '0123456789abcdef01234567',
  status: 'draft',
  slug: 'quan-gia-lap',
  name: 'Quán Giả Lập',
  aliases: ['Gia Lap Cafe'],
  category: 'cafe',
  tags: [],
  openingHours: [],
  bestTime: [],
  transport: [],
  contact: {},
  ids: {},
  photos: [],
  updatedAt: '2026-10-08T03:00:00.000Z',
});

describe('toPlaceSummary', () => {
  it('đủ trường cho hộp thoại thao tác, tính lại điều kiện còn thiếu mỗi mã một lần', () => {
    const summary = toPlaceSummary(base);
    expect(AdminPlaceSummary.safeParse(summary).success).toBe(true);
    expect(summary).toMatchObject({ id: base.id, name: 'Quán Giả Lập', photoCount: 0 });
    expect(summary.activationIssues).toEqual(['location_missing', 'hours_invalid', 'verify_source_missing']);
  });
  it('đủ điều kiện thì không còn mã nào', () => {
    const complete = {
      ...base,
      location: { type: 'Point' as const, coordinates: [108.44, 11.94] as [number, number] },
      openingHours: Array.from({ length: 7 }, (_, day) => ({ day, open: '07:00', close: '22:00' })),
      verifySource: 'owner' as const,
    };
    expect(toPlaceSummary(complete).activationIssues).toEqual([]);
  });
});
