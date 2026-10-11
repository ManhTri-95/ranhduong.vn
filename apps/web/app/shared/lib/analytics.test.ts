import { describe, expect, it } from 'vitest';
import { canTrackAnalytics, analyticsPayload } from './analytics';
describe('S18 traffic analytics consent and sanitization', () => {
  it('requires explicit opt-in and production, respects DNT and revocation', () => {
    for (const choice of ['unknown', 'denied']) expect(canTrackAnalytics(choice, true, false)).toBe(false);
    expect(canTrackAnalytics('granted', true, false)).toBe(true);
    expect(canTrackAnalytics('granted', false, false)).toBe(false);
    expect(canTrackAnalytics('granted', true, true)).toBe(false);
  });
  it('sends only a clean public pathname, static title and required website ID', () => {
    expect(analyticsPayload('/da-lat/tim-kiem?q=fake@example.com#map', 'https://ranhduong.vn', 'id-gia-lap')).toEqual({ website: 'id-gia-lap', url: '/da-lat/tim-kiem', title: 'Rành Đường', referrer: '' });
    for (const path of ['/l/gia-lap', '/admin', '/owner/profile', 'https://other.example/fake', '/ten@example.com']) expect(analyticsPayload(path, 'https://ranhduong.vn', 'fake')).toBeNull();
  });
});
