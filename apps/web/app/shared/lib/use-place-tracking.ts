import { onMounted, toValue, watch, type MaybeRefOrGetter } from 'vue';
import type { PlaceEventSource } from '@ranhduong/contracts';

export function usePlaceTracking(id: MaybeRefOrGetter<string | undefined>, source?: PlaceEventSource): void {
  const app = useNuxtApp();
  onMounted(() => {
    watch(() => toValue(id), (placeId) => {
      if (placeId) app.$trackPlace({ type: 'place_view', placeId, source: source ?? app.$trackingSource() });
    }, { immediate: true });
  });
}
