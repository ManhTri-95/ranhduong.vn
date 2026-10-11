import { watch } from 'vue';
import { ANALYTICS_CONSENT_KEY, analyticsPayload, canTrackAnalytics, type AnalyticsConsent } from '~/shared/lib/analytics';

declare global {
  interface Window {
    umami?: { track(payload: Record<string, string>): Promise<unknown> | void };
    rdAnalyticsBeforeSend?: (type: string, payload: Record<string, unknown>) => Record<string, unknown> | false;
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public;
  const router = useRouter();
  const choice = useState<AnalyticsConsent>('analytics-consent', () => 'unknown');
  try { const stored = localStorage.getItem(ANALYTICS_CONSENT_KEY); if (stored === 'granted' || stored === 'denied') choice.value = stored; } catch { /* Consent remains unset when storage is unavailable. */ }
  window.addEventListener('storage', (event) => {
    if (event.storageArea !== localStorage || event.key !== ANALYTICS_CONSENT_KEY && event.key !== null) return;
    choice.value = event.newValue === 'granted' || event.newValue === 'denied' ? event.newValue : 'unknown';
  });
  const dnt = () => navigator.doNotTrack === '1' || ('globalPrivacyControl' in navigator && navigator.globalPrivacyControl === true);
  const allowed = () => canTrackAnalytics(choice.value, config.indexable, dnt());
  const payload = () => analyticsPayload(router.currentRoute.value.path, config.siteUrl, config.umamiWebsiteId);
  window.rdAnalyticsBeforeSend = (_type, input) => {
    if (!allowed()) return false;
    const clean = analyticsPayload(typeof input.url === 'string' ? input.url : router.currentRoute.value.path, config.siteUrl, config.umamiWebsiteId);
    return clean ? { ...input, ...clean, data: undefined } : false;
  };
  let script: HTMLScriptElement | undefined;
  const track = () => { const clean = payload(); if (allowed() && clean) { try { void Promise.resolve(window.umami?.track(clean)).catch(() => {}); } catch { /* Analytics cannot interrupt navigation. */ } } };
  const load = () => {
    if (!allowed() || !config.umamiScriptUrl || !config.umamiWebsiteId || script) return;
    try { if (!/^https?:$/.test(new URL(config.umamiScriptUrl).protocol)) return; } catch { return; }
    script = document.createElement('script');
    script.src = config.umamiScriptUrl; script.defer = true;
    script.dataset.websiteId = config.umamiWebsiteId; script.dataset.autoTrack = 'false';
    script.dataset.excludeSearch = 'true'; script.dataset.excludeHash = 'true'; script.dataset.doNotTrack = 'true';
    script.dataset.beforeSend = 'rdAnalyticsBeforeSend';
    script.onload = track;
    script.onerror = () => { script?.remove(); script = undefined; };
    document.head.append(script);
  };
  watch(choice, (value) => {
    try { localStorage.setItem(ANALYTICS_CONSENT_KEY, value); } catch { /* The in-memory choice still applies. */ }
    if (allowed()) load(); else { script?.remove(); script = undefined; window.umami = undefined; }
  }, { immediate: true });
  router.afterEach(() => track());
});
