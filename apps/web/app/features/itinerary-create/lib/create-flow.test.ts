import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CityPublic, ItineraryRequest, ItineraryUserDetail } from '@ranhduong/contracts';
import { createItineraryFlow, vietnamToday } from './create-flow';

const city: CityPublic = {
  slug: 'gia-lap', name: 'Thành phố Giả Lập', accent: '#123456', mapBounds: [0, 0, 1, 1],
  center: { type: 'Point', coordinates: [0.5, 0.5] },
  zones: [{ slug: 'cum-gia-lap', name: 'Cụm Giả Lập', center: { type: 'Point', coordinates: [0.25, 0.25] } }],
};
const success = { shareId: 'Ab123456789012345678' } as ItineraryUserDetail;
afterEach(() => vi.useRealTimers());
const flow = (create: (input: ItineraryRequest) => Promise<ItineraryUserDetail> = async () => success, navigate = vi.fn()) => createItineraryFlow(city, create, navigate);

describe('S38 create flow', () => {
  it('uses the current Vietnam day even when UTC is still yesterday', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T17:05:00Z'));
    expect(vietnamToday()).toBe('2026-10-24');
    expect(flow().request.startDate).toBe('2026-10-24');
  });
  it('validates stale dates and out-of-bounds accommodation before sending', async () => {
    const create = vi.fn<(input: ItineraryRequest) => Promise<ItineraryUserDetail>>(async () => success); const f = flow(create);
    f.request.startDate = '2000-01-01'; await f.submit();
    expect(create).not.toHaveBeenCalled(); expect(f.error.value?.kind).toBe('validation');
    f.request.startDate = vietnamToday(); f.request.stayLocation = { type: 'Point', coordinates: [2, 2] };
    await f.submit(); expect(create).not.toHaveBeenCalled();
  });
  it('allows deselecting interests at the limit, and never selects a fourth', () => {
    const f = flow();
    for (const tag of ['chill_cafe', 'clouds_hills', 'photo_spots', 'nature_adventure'] as const) f.toggleInterest(tag);
    expect(f.request.tags).toEqual(['chill_cafe', 'clouds_hills', 'photo_spots']);
    f.toggleInterest('chill_cafe'); f.toggleInterest('nature_adventure');
    expect(f.request.tags).toEqual(['clouds_hills', 'photo_spots', 'nature_adventure']);
  });
  it('replaces a pin with the actual cluster center, and skip removes it from the POST', async () => {
    const create = vi.fn<(input: ItineraryRequest) => Promise<ItineraryUserDetail>>(async () => success); const f = flow(create);
    f.request.stayLocation = { type: 'Point', coordinates: [0.8, 0.8] };
    f.selectZone('cum-gia-lap'); expect(f.request.stayLocation?.coordinates).toEqual([0.25, 0.25]);
    f.skipStay(); await f.submit(); expect(create.mock.calls[0]?.[0]).not.toHaveProperty('stayLocation');
  });
  it('preserves choices after network failure and can retry successfully', async () => {
    let fail = true;
    const f = flow(async () => { if (fail) throw new Error('offline'); return success; });
    f.request.days = 4; f.request.tags = ['photo_spots']; await f.submit();
    expect(f.error.value?.kind).toBe('network'); expect(f.request.days).toBe(4); expect(f.request.tags).toEqual(['photo_spots']);
    fail = false; await f.submit(); expect(f.error.value).toBeNull();
  });
  it('accepts only contract-valid shortage details and applies each suggested change', async () => {
    const f = flow(async () => { throw { data: { code: 'NOT_ENOUGH_PLACES', details: { shortages: [{ day: 3, zoneSlugs: [], available: 1 }], suggestions: [{ kind: 'reduce_days', days: 2 }, { kind: 'drop_interests' }] } } }; });
    f.request.days = 3; f.request.tags = ['photo_spots']; await f.submit();
    expect(f.error.value?.kind).toBe('shortage'); expect(f.error.value?.suggestions).toHaveLength(2);
    f.applySuggestion({ kind: 'reduce_days', days: 2 }); expect(f.request.days).toBe(2); expect(f.request.tags).toEqual(['photo_spots']);
    f.applySuggestion({ kind: 'drop_interests' }); expect(f.request.tags).toEqual([]);
    const malformed = flow(async () => { throw { data: { code: 'NOT_ENOUGH_PLACES', details: { suggestions: [{ kind: 'reduce_days', days: 99 }] } } }; });
    await malformed.submit(); expect(malformed.error.value?.suggestions).toEqual([]);
  });
  it('shows rate limits distinctly without changing choices', async () => {
    const f = flow(async () => { throw { data: { code: 'RATE_LIMITED' } }; });
    await f.submit(); expect(f.error.value?.kind).toBe('rate'); expect(f.request.days).toBe(2);
  });
  it('blocks duplicate POSTs while pending and navigates once using shareId', async () => {
    let finish!: (value: ItineraryUserDetail) => void;
    const create = vi.fn(() => new Promise<ItineraryUserDetail>(resolve => { finish = resolve; }));
    const navigate = vi.fn(); const f = flow(create, navigate);
    const first = f.submit(); await f.submit();
    expect(f.pending.value).toBe(true); expect(create).toHaveBeenCalledTimes(1);
    finish(success); await first;
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/l/Ab123456789012345678'); expect(f.pending.value).toBe(false);
  });
  it('locks a successfully created trip and only retries navigation after midnight', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T16:59:00Z'));
    const create = vi.fn(async () => success);
    let failNavigation = true;
    const navigate = vi.fn(async () => { if (failNavigation) throw new Error('chunk unavailable'); });
    const f = flow(create, navigate);
    await f.submit();
    expect(f.created.value).toBe(true);
    expect(f.error.value?.kind).toBe('network');
    f.toggleInterest('photo_spots'); f.selectZone('cum-gia-lap'); f.applySuggestion({ kind: 'reduce_days', days: 1 });
    expect(f.request.tags).toEqual([]); expect(f.request.days).toBe(2); expect(f.request.stayLocation).toBeUndefined();
    vi.setSystemTime(new Date('2026-10-23T17:01:00Z')); failNavigation = false;
    await f.submit();
    expect(create).toHaveBeenCalledTimes(1); expect(navigate).toHaveBeenCalledTimes(2); expect(f.error.value).toBeNull();
  });
});
