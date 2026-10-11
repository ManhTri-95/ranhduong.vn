import { describe, expect, it } from 'vitest';
import { PlaceEventBuffer, eventSource } from './tracking';
const event = { type: 'direction_click' as const, placeId: '0123456789abcdef01234567' };
describe('S18 client event batching', () => {
  it('flushes immediately in batches of at most twenty without cookies/PII in payloads', async () => {
    const batches: unknown[] = [];
    const buffer = new PlaceEventBuffer(async (batch) => { batches.push(batch); });
    for (let i = 0; i < 25; i++) buffer.add(event);
    await buffer.flush();
    expect(batches).toEqual([{ events: Array(20).fill(event) }, { events: Array(5).fill(event) }]);
    await buffer.flush(); expect(batches).toHaveLength(2);
  });
  it('bounds memory and treats network errors as best effort without replaying clicks', async () => {
    let count = 0;
    const buffer = new PlaceEventBuffer(async (batch) => { count += batch.events.length; throw new Error('Offline Giả Lập'); });
    for (let i = 0; i < 200; i++) buffer.add(event);
    await expect(buffer.flush()).resolves.toBeUndefined(); expect(count).toBe(100);
    await buffer.flush(); expect(count).toBe(100);
  });
  it('maps only known navigation sources and does not collect query contents', () => {
    expect(eventSource('/da-lat/tim-kiem?q=fake')).toBe('search');
    expect(eventSource('/da-lat/ban-do')).toBe('map');
    expect(eventSource('/da-lat/lich-trinh/mau')).toBe('itinerary');
    expect(eventSource('/da-lat/top/mau')).toBe('list');
    expect(eventSource('')).toBe('direct');
  });
});
