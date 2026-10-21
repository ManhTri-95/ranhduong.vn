import { describe, expect, it } from 'vitest';
import { ItineraryShareId, ItineraryUserDetail, publicItineraryParams } from './itinerary-user.js';

describe('S37 public guest itinerary contract', () => {
  const params = { days: 1, startDate: '2026-01-01', transport: 'motorbike', with: 'solo', tags: [], pace: 'relaxed' };
  it('allows reading old trips and strips accommodation and ownership at every level', () => {
    const result = ItineraryUserDetail.parse({
      shareId: 'aB01'.repeat(5), title: 'Lịch trình Giả Lập', city: { slug: 'gia-lap', name: 'Giả Lập' }, version: 1, canEdit: true,
      params: { ...params, stayLocation: { type: 'Point', coordinates: [0.2, 0.2] }, guestId: 'private' },
      guestId: 'private', ownerId: 'private', ticketKey: 'private', ticketCleanupKeys: ['private'],
      days: [{ day: 1, date: '2026-01-01', startTime: '07:00', zoneIds: [], stops: [], detours: [], issues: [] }],
    });
    expect(JSON.stringify(result)).not.toMatch(/stayLocation|guestId|ownerId|ticketKey|ticketCleanupKeys|private/);
    expect(publicItineraryParams.parse({ ...params, stayLocation: {} })).toEqual(params);
  });

  it('accepts only base62 share IDs and rejects ObjectIds as lookup identifiers', () => {
    expect(ItineraryShareId.safeParse('aB01'.repeat(5)).success).toBe(true);
    for (const value of ['123', '../secret', 'a'.repeat(24), 'b'.repeat(65), 'share-id-with-hyphens']) {
      expect(ItineraryShareId.safeParse(value).success).toBe(false);
    }
  });
});
