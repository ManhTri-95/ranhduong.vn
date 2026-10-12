import type { CityNow, CityPublic } from '@ranhduong/contracts';
import { computed, onMounted, onScopeDispose, ref, watch, type Ref } from 'vue';
import { cityThemeAccent } from './city-theme';

interface CityNowSource {
  data: Ref<CityNow | null | undefined>;
  error: Ref<unknown>;
  refresh(): Promise<unknown>;
}

/** Scope the root token to the current city page, including SSR and its footer. */
export function useCityTheme(citySlug: string, city: Ref<CityPublic | null | undefined>, source: CityNowSource) {
  const route = useRoute();
  const clock = ref(0);
  const current = computed(() => {
    const data = source.data.value;
    return !source.error.value && data && (!clock.value || Date.parse(data.expiresAt) > clock.value) ? data : null;
  });
  useHead(() => {
    const accent = String(route.params.city ?? '') === citySlug ? cityThemeAccent(city.value?.accent, source.data.value, clock.value, Boolean(source.error.value)) : undefined;
    return { htmlAttrs: { style: accent ? `--accent:${accent};` : undefined } };
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let mounted = false;
  let refreshing = false;
  function schedule(): void {
    if (timer) clearTimeout(timer);
    if (!mounted || disposed) return;
    const expires = source.error.value ? 0 : Date.parse(source.data.value?.expiresAt ?? '');
    const delay = Number.isFinite(expires) && expires > Date.now() ? expires - Date.now() : 60_000;
    timer = setTimeout(() => { void refresh(); }, Math.max(1000, delay));
  }
  async function refresh(): Promise<void> {
    if (disposed || refreshing || String(route.params.city ?? '') !== citySlug) return;
    refreshing = true;
    clock.value = Date.now();
    try { await source.refresh(); }
    finally { refreshing = false; if (!disposed) { clock.value = Date.now(); schedule(); } }
  }
  function visible(): void { if (document.visibilityState === 'visible') void refresh(); }
  watch(() => [source.data.value?.expiresAt, source.error.value], schedule);
  onMounted(() => {
    mounted = true;
    clock.value = Date.now();
    document.addEventListener('visibilitychange', visible);
    if (!current.value) void refresh(); else schedule();
  });
  onScopeDispose(() => {
    disposed = true;
    if (timer) clearTimeout(timer);
    if (mounted) document.removeEventListener('visibilitychange', visible);
  });
  return { current };
}
