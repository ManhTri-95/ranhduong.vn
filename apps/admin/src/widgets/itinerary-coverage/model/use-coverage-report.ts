import { onScopeDispose, ref, shallowRef } from 'vue';
import type { ItineraryCoverageQuery, ItineraryCoverageReport } from '@ranhduong/contracts';
import { fetchItineraryCoverage } from '@/entities/itinerary/api/coverage';
import { toApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';

type CoverageState = { kind: 'idle' | 'loading' | 'ready' } | { kind: 'error'; login: boolean };

export function useCoverageReport() {
  const report = shallowRef<ItineraryCoverageReport | null>(null);
  const state = ref<CoverageState>({ kind: 'idle' });
  let latest = 0;
  onScopeDispose(() => { latest++; });

  async function run(query: ItineraryCoverageQuery): Promise<void> {
    const call = ++latest;
    report.value = null;
    state.value = { kind: 'loading' };
    try {
      const result = await fetchItineraryCoverage(CITY_SLUG, { ...query });
      if (call !== latest) return;
      report.value = result;
      state.value = { kind: 'ready' };
    } catch (error) {
      if (call === latest) state.value = { kind: 'error', login: toApiFailure(error).status === 401 };
    }
  }
  return { report, state, run };
}
