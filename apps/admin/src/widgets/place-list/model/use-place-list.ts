import type { AdminPlaceSummary, CityPublic } from '@ranhduong/contracts';
import { ref, shallowRef } from 'vue';
import { fetchCity } from '@/entities/city/api/city';
import { fetchPlaces } from '@/entities/place/api/places';
import { toApiFailure, type ApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';

export type ListLoad = { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string; login: boolean };

/** Câu báo khi không tải được danh sách. */
export function listLoadError(failure: ApiFailure): string {
  if (failure.status === 401) return 'Phiên đăng nhập đã hết, đăng nhập lại.';
  if (failure.status === 0) return 'Chưa kết nối được máy chủ.';
  return 'Chưa tải được danh sách địa điểm, thử lại.';
}

/** Tải danh sách địa điểm và các cụm của thành phố; `reload` sau mỗi lần đóng hộp thoại thao tác. */
export function usePlaceList() {
  const load = ref<ListLoad>({ kind: 'loading' });
  const rows = shallowRef<AdminPlaceSummary[]>([]);
  const zones = shallowRef<CityPublic['zones']>([]);
  /** Chỉ lần tải mới nhất được ghi kết quả (lần cũ về muộn thì bỏ). */
  let latest = 0;

  async function reload(): Promise<void> {
    const call = ++latest;
    try {
      const [city, items] = await Promise.all([fetchCity(CITY_SLUG), fetchPlaces(CITY_SLUG)]);
      if (call !== latest) return;
      zones.value = city.zones;
      rows.value = items;
      load.value = { kind: 'ready' };
    } catch (err) {
      if (call !== latest) return;
      const failure = toApiFailure(err);
      load.value = { kind: 'error', message: listLoadError(failure), login: failure.status === 401 };
    }
  }

  void reload();
  return { load, rows, zones, reload };
}
