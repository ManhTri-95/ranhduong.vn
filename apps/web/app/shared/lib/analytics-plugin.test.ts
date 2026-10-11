import { effectScope, nextTick, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYTICS_CONSENT_KEY, type AnalyticsConsent } from '~/shared/lib/analytics';

afterEach(() => { vi.unstubAllGlobals(); });

describe('S18 analytics client consent propagation', () => {
  it('stops the real plugin when another tab revokes or clears consent', async () => {
    const choice = ref<AnalyticsConsent>('unknown');
    const stored = new Map([[ANALYTICS_CONSENT_KEY, 'granted']]);
    const storage = { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) };
    const listeners = new Map<string, (event: { key: string | null; newValue: string | null; storageArea: typeof storage }) => void>();
    const scripts: { dataset: Record<string, string>; remove: ReturnType<typeof vi.fn>; onload?: () => void }[] = [];
    const track = vi.fn();
    const browser: { umami?: { track: typeof track }; rdAnalyticsBeforeSend?: (type: string, payload: Record<string, unknown>) => Record<string, unknown> | false; addEventListener: (type: string, listener: (event: { key: string | null; newValue: string | null; storageArea: typeof storage }) => void) => void } = {
      addEventListener: (type, listener) => listeners.set(type, listener),
    };
    let navigate: (() => void) | undefined;
    vi.stubGlobal('defineNuxtPlugin', (plugin: () => void) => plugin);
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { indexable: true, siteUrl: 'https://ranhduong.vn', umamiScriptUrl: 'https://analytics.example/script.js', umamiWebsiteId: 'gia-lap' } }));
    vi.stubGlobal('useState', () => choice);
    vi.stubGlobal('useRouter', () => ({ currentRoute: ref({ path: '/da-lat' }), afterEach: (callback: () => void) => { navigate = callback; } }));
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('navigator', { doNotTrack: '0' });
    vi.stubGlobal('window', browser);
    vi.stubGlobal('document', { createElement: () => { const script = { dataset: {}, remove: vi.fn() }; scripts.push(script); return script; }, head: { append: () => {} } });
    const plugin = (await import('~/plugins/analytics.client')).default;
    const scope = effectScope();
    try {
      scope.run(() => plugin({} as Parameters<typeof plugin>[0]));
      browser.umami = { track }; scripts[0]?.onload?.();
      expect(track).toHaveBeenCalledTimes(1);
      stored.set(ANALYTICS_CONSENT_KEY, 'denied');
      listeners.get('storage')?.({ key: ANALYTICS_CONSENT_KEY, newValue: 'denied', storageArea: storage });
      await nextTick();
      expect(choice.value).toBe('denied');
      expect(scripts[0]?.remove).toHaveBeenCalledOnce();
      expect(browser.rdAnalyticsBeforeSend?.('event', { url: '/da-lat' })).toBe(false);
      navigate?.(); expect(track).toHaveBeenCalledTimes(1);
      listeners.get('storage')?.({ key: null, newValue: null, storageArea: storage });
      await nextTick();
      expect(choice.value).toBe('unknown');
      expect(browser.rdAnalyticsBeforeSend?.('event', { url: '/da-lat' })).toBe(false);
    } finally { scope.stop(); }
  });
});
