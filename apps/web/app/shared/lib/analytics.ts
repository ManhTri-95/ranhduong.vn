export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';
export const ANALYTICS_CONSENT_KEY = 'rd:analytics-consent:v1';
export function canTrackAnalytics(choice: string, indexable: boolean, doNotTrack: boolean): boolean { return choice === 'granted' && indexable && !doNotTrack; }
export function analyticsPayload(path: string, siteUrl: string, website: string): Record<string, string> | null {
  const url = new URL(path, siteUrl);
  if (url.origin !== new URL(siteUrl).origin || !/^\/[a-z0-9/-]*$/.test(url.pathname) || /^\/(?:l|admin|owner)(?:\/|$)/.test(url.pathname)) return null;
  return { website, url: url.pathname, title: 'Rành Đường', referrer: '' };
}
