import { describe, expect, it } from 'vitest';
import { shareItinerary } from './share';

const data = { title: 'Lịch trình Giả Lập', url: 'https://ranhduong.vn/da-lat/lich-trinh/gia-lap' };
describe('itinerary sharing', () => {
  it.each(['zalo', 'messenger'] as const)('passes a clean URL to native sharing for %s', async (channel) => {
    let received: unknown;
    expect(await shareItinerary(channel, data, { share: async (value) => { received = value; } })).toBe('shared');
    expect(received).toEqual(data);
  });
  it('cancellation does not copy or claim success', async () => {
    let copied = false;
    const result = await shareItinerary('zalo', data, {
      share: async () => { throw new DOMException('Canceled', 'AbortError'); },
      copy: async () => { copied = true; },
    });
    expect(result).toBe('cancelled');
    expect(copied).toBe(false);
  });
  it.each(['zalo', 'messenger', 'copy'] as const)('copies the canonical link without native sharing for %s', async (channel) => {
    let copied = '';
    expect(await shareItinerary(channel, data, { copy: async (text) => { copied = text; } })).toBe('copied');
    expect(copied).toBe('https://ranhduong.vn/da-lat/lich-trinh/gia-lap');
  });
  it('copy ignores native sharing and clipboard denial offers a manual link', async () => {
    let nativeOpened = false;
    expect(await shareItinerary('copy', data, { share: async () => { nativeOpened = true; }, copy: async () => { throw new Error('Denied'); } })).toBe('manual');
    expect(nativeOpened).toBe(false);
    expect(await shareItinerary('messenger', data, {})).toBe('manual');
  });
  it('native failure falls back to copying', async () => {
    let copied = '';
    expect(await shareItinerary('messenger', data, { share: async () => { throw new Error('Blocked'); }, copy: async (text) => { copied = text; } })).toBe('copied');
    expect(copied).toBe(data.url);
  });
});
