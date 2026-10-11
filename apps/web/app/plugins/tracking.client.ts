import { PlaceEvent } from '@ranhduong/contracts';
import { PlaceEventBuffer, eventSource } from '~/shared/lib/tracking';

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public;
  let source = eventSource('');
  try { const referrer = new URL(document.referrer); if (referrer.origin === window.location.origin) source = eventSource(referrer.pathname); } catch { /* Direct visits have no referrer. */ }
  useRouter().beforeEach((_to, from) => { if (from.matched.length) source = eventSource(from.path); });
  const buffer = new PlaceEventBuffer((batch) => fetch(`${config.apiBase.replace(/\/+$/, '')}/events`, {
    method: 'POST', credentials: 'omit', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify(batch),
  }));
  const enabled = () => config.trackingEnabled && config.indexable;
  const trackPlace = (event: PlaceEvent) => { if (enabled()) buffer.add(event); };
  document.addEventListener('click', (event) => {
    if (!enabled() || event.button !== 0) return;
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-rd-event][data-rd-place-id]') : null;
    if (!target) return;
    const parsed = PlaceEvent.safeParse({ type: target.dataset.rdEvent, placeId: target.dataset.rdPlaceId });
    if (parsed.success) { trackPlace(parsed.data); void buffer.flush(); }
  }, { capture: true });
  window.setInterval(() => { if (enabled()) void buffer.flush(); }, 1000);
  window.addEventListener('pagehide', () => { if (enabled()) void buffer.flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && enabled()) void buffer.flush(); });
  return { provide: { trackPlace, trackingSource: () => source } };
});
