import { ObjectIdString, type AdminPlace, type CityPublic, type DuplicateMatch, type LngLat } from '@ranhduong/contracts';
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { z } from 'zod';
import { fetchCity, fetchZoneSuggestions } from '@/entities/city/api/city';
import { activatePlace, checkDuplicates, createPlace, fetchPlace, updatePlace } from '@/entities/place/api/places';
import { placeDraftKey } from '@/entities/place/model/draft-key';
import { failureMessages, toApiFailure, type ApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';
import { readLocalDraft, removeLocalDraft, writeLocalDraft } from '@/shared/lib/local-draft';
import { withoutPrimary } from './also-categories';
import { emptyForm, formActivationIssues, formFromPlace, formToInput, PlaceFormState, sameForm, type FieldErrors } from './form';
import { zoneHint, type ZoneHint } from './zone-hint';

/** Bản đang sửa giữ trên máy: form và updatedAt của bản server lúc bắt đầu sửa (null khi tạo mới). */
const StoredDraft = z.object({ form: PlaceFormState, baseUpdatedAt: z.string().nullable() });
type StoredDraft = z.infer<typeof StoredDraft>;

/** Chờ ngừng gõ rồi mới ghi vào máy, kiểm trùng, gợi ý cụm. */
const LOCAL_SAVE_MS = 800;
const DUPLICATE_MS = 600;
const ZONE_MS = 500;

export type LoadState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'not-found' } | { kind: 'error'; message: string };
export interface Notice {
  kind: 'ok' | 'bad';
  messages: string[];
  /** Hiện link đăng nhập lại (phiên hết hạn). */
  login?: boolean;
}
export interface Restorable {
  savedAt: string;
  form: PlaceFormState;
  /** Bản trên server đã đổi sau khi bắt đầu sửa trên máy. */
  stale: boolean;
}

const clone = (form: PlaceFormState): PlaceFormState => PlaceFormState.parse(form);

/** Câu lỗi khi lưu; chỉ nói "đã giữ trên máy" khi lần ghi vào máy gần nhất thành công. */
function failureNotice(failure: ApiFailure, kept: boolean): Notice {
  const keep = kept
    ? 'Bản đang sửa vẫn được giữ trên máy này.'
    : 'Trình duyệt không cho lưu bản đang sửa trên máy, đừng tải lại hay đóng trang trước khi lưu được.';
  if (failure.status === 401) return { kind: 'bad', messages: ['Phiên đăng nhập đã hết, đăng nhập lại.', keep], login: true };
  if (failure.status === 0) return { kind: 'bad', messages: ['Chưa kết nối được máy chủ, thử lại sau.', keep] };
  const messages = failureMessages(failure);
  return { kind: 'bad', messages: messages.length > 0 ? messages : ['Chưa lưu được, thử lại.'] };
}

function loadErrorMessage(failure: ApiFailure): string {
  if (failure.status === 401) return 'Phiên đăng nhập đã hết, đăng nhập lại rồi mở lại trang.';
  if (failure.status === 0) return 'Chưa kết nối được máy chủ.';
  return 'Chưa tải được địa điểm, thử lại.';
}

/**
 * Trạng thái và thao tác của form địa điểm: tải, giữ bản đang sửa trên máy, lưu nháp, kích hoạt,
 * kiểm trùng và gợi ý cụm khi gõ tên hay ghim. `onCreated` được gọi khi vừa tạo xong để trang đổi URL.
 */
export function usePlaceEditor(initialId: string | null, onCreated: (id: string) => void) {
  const placeId = ref(initialId);
  const load = ref<LoadState>({ kind: 'loading' });
  const city = shallowRef<CityPublic | null>(null);
  const place = shallowRef<AdminPlace | null>(null);
  const form = ref<PlaceFormState>(emptyForm());
  const saved = shallowRef<PlaceFormState>(emptyForm());
  const errors = ref<FieldErrors>({});
  const notice = ref<Notice | null>(null);
  const busy = ref<'save' | 'activate' | null>(null);
  const restorable = shallowRef<Restorable | null>(null);
  /** Lần ghi bản đang sửa vào máy gần nhất có thành công không. */
  const localKept = ref(false);
  const duplicates = shallowRef<DuplicateMatch[]>([]);
  const duplicateFailed = ref(false);
  const zoneSuggestion = shallowRef<ZoneHint>({ kind: 'none' });

  const status = computed(() => place.value?.status ?? 'draft');
  const dirty = computed(() => !sameForm(form.value, saved.value));
  const issues = computed(() => formActivationIssues(form.value, place.value?.photos ?? []));

  async function init(): Promise<void> {
    load.value = { kind: 'loading' };
    if (initialId !== null && !ObjectIdString.safeParse(initialId).success) {
      load.value = { kind: 'not-found' };
      return;
    }
    try {
      const [cityData, placeData] = await Promise.all([fetchCity(CITY_SLUG), initialId ? fetchPlace(initialId) : Promise.resolve(null)]);
      city.value = cityData;
      place.value = placeData;
      saved.value = placeData ? formFromPlace(placeData) : emptyForm();
      const local = readLocalDraft(placeDraftKey(initialId), StoredDraft);
      if (local && !sameForm(local.value.form, saved.value)) {
        restorable.value = { savedAt: local.savedAt, form: local.value.form, stale: local.value.baseUpdatedAt !== (placeData?.updatedAt ?? null) };
      }
      form.value = clone(saved.value);
      load.value = { kind: 'ready' };
    } catch (err) {
      const failure = toApiFailure(err);
      load.value = failure.status === 404 ? { kind: 'not-found' } : { kind: 'error', message: loadErrorMessage(failure) };
    }
  }

  // Tự giữ bản đang sửa trên máy (chủ dự án chọn 2026-10-08). Đang hỏi khôi phục thì bản cũ đã nằm trong
  // `restorable`, nên sửa tiếp vẫn ghi đè được; chỉ không xoá bản cũ khi form chưa đổi gì.
  let localTimer: ReturnType<typeof setTimeout> | undefined;
  function flushLocal(): boolean {
    clearTimeout(localTimer);
    localTimer = undefined;
    if (load.value.kind !== 'ready') return localKept.value;
    const key = placeDraftKey(placeId.value);
    if (dirty.value) localKept.value = writeLocalDraft<StoredDraft>(key, { form: form.value, baseUpdatedAt: place.value?.updatedAt ?? null });
    else if (!restorable.value) {
      removeLocalDraft(key);
      localKept.value = false;
    }
    return localKept.value;
  }
  watch(
    form,
    () => {
      if (load.value.kind !== 'ready') return;
      clearTimeout(localTimer);
      localTimer = setTimeout(flushLocal, LOCAL_SAVE_MS);
    },
    { deep: true },
  );

  // Đổi danh mục chính thì bỏ danh mục đó khỏi "Cũng phục vụ" (S27), để không vướng lỗi khi lưu.
  watch(
    () => form.value.category,
    (category) => {
      if (category !== '' && form.value.alsoCategories.includes(category)) {
        form.value.alsoCategories = withoutPrimary(form.value.alsoCategories, category);
      }
    },
  );

  // Kiểm trùng khi tên, ghim, số điện thoại, fanpage đổi; chỉ giữ kết quả của lần gọi mới nhất.
  let duplicateTimer: ReturnType<typeof setTimeout> | undefined;
  let duplicateRun = 0;
  watch(
    () => [form.value.name, form.value.location, form.value.phone, form.value.fanpage],
    () => {
      clearTimeout(duplicateTimer);
      duplicateTimer = setTimeout(() => void runDuplicateCheck(), DUPLICATE_MS);
    },
  );
  async function runDuplicateCheck(): Promise<void> {
    const run = ++duplicateRun;
    const { name, location, phone, fanpage } = form.value;
    if (!name.trim() || (!location && !phone.trim() && !fanpage.trim())) {
      duplicates.value = [];
      duplicateFailed.value = false;
      return;
    }
    try {
      const matches = await checkDuplicates(CITY_SLUG, {
        name: name.trim(),
        location: location ? { type: 'Point', coordinates: location } : undefined,
        phone: phone.trim() || undefined,
        fanpage: fanpage.trim() || undefined,
        excludeId: placeId.value ?? undefined,
      });
      if (run !== duplicateRun) return;
      duplicates.value = matches;
      duplicateFailed.value = false;
    } catch {
      if (run === duplicateRun) duplicateFailed.value = true;
    }
  }

  // Gợi ý cụm sau khi ghim; chưa chọn cụm thì chọn luôn, đã chọn thì chỉ hỏi.
  let zoneTimer: ReturnType<typeof setTimeout> | undefined;
  let zoneRun = 0;
  watch(
    () => form.value.location,
    (location) => {
      clearTimeout(zoneTimer);
      zoneTimer = setTimeout(() => void suggestZone(location), ZONE_MS);
    },
  );
  async function suggestZone(location: LngLat | null): Promise<void> {
    const run = ++zoneRun;
    if (!location) {
      zoneSuggestion.value = { kind: 'none' };
      return;
    }
    try {
      const zones = await fetchZoneSuggestions(CITY_SLUG, location);
      if (run !== zoneRun) return;
      const hint = zoneHint(form.value.zone, zones);
      if (hint.kind === 'select') {
        form.value.zone = hint.slug;
        zoneSuggestion.value = { kind: 'none' };
      } else {
        zoneSuggestion.value = hint;
      }
    } catch {
      if (run === zoneRun) zoneSuggestion.value = { kind: 'none' };
    }
  }
  // Người nhập tự chọn đúng cụm gợi ý thì ẩn gợi ý.
  watch(
    () => form.value.zone,
    (zone) => {
      const hint = zoneSuggestion.value;
      if ((hint.kind === 'differs' && hint.zone.slug === zone) || (hint.kind === 'boundary' && hint.zones.some((z) => z.slug === zone))) {
        zoneSuggestion.value = { kind: 'none' };
      }
    },
  );
  function acceptZone(slug: string): void {
    form.value.zone = slug;
  }

  function applyPhotos(updated: AdminPlace): void {
    if (!place.value || updated.id !== placeId.value) return;
    place.value = { ...place.value, photos: updated.photos, updatedAt: updated.updatedAt };
  }

  async function save(): Promise<AdminPlace | null> {
    const result = formToInput(form.value);
    if (!result.ok) {
      errors.value = result.errors;
      notice.value = { kind: 'bad', messages: [`Còn ${Object.keys(result.errors).length} ô cần sửa, xem chữ đỏ dưới từng ô.`] };
      return null;
    }
    errors.value = {};
    busy.value = 'save';
    const sent = JSON.stringify(form.value);
    try {
      const id = placeId.value;
      const updated = id ? await updatePlace(id, result.input) : await createPlace(CITY_SLUG, result.input);
      place.value = updated;
      saved.value = formFromPlace(updated);
      // Không gõ thêm trong lúc chờ thì lấy giá trị server đã chuẩn hoá (số điện thoại +84…).
      if (JSON.stringify(form.value) === sent) form.value = clone(saved.value);
      clearTimeout(localTimer);
      removeLocalDraft(placeDraftKey(id));
      localKept.value = false;
      restorable.value = null;
      if (!id) {
        placeId.value = updated.id;
        onCreated(updated.id);
      }
      notice.value = { kind: 'ok', messages: [updated.status === 'draft' ? 'Đã lưu nháp.' : 'Đã lưu thay đổi.'] };
      return updated;
    } catch (err) {
      notice.value = failureNotice(toApiFailure(err), flushLocal());
      return null;
    } finally {
      busy.value = null;
    }
  }

  async function activate(): Promise<void> {
    if (issues.value.length > 0 || busy.value) return;
    const current = !place.value || dirty.value ? await save() : place.value;
    if (!current) return;
    busy.value = 'activate';
    try {
      const activated = await activatePlace(current.id);
      place.value = activated;
      saved.value = formFromPlace(activated);
      form.value = clone(saved.value);
      notice.value = { kind: 'ok', messages: ['Đã kích hoạt.'] };
    } catch (err) {
      notice.value = failureNotice(toApiFailure(err), flushLocal());
    } finally {
      busy.value = null;
    }
  }

  function restoreLocal(): void {
    const local = restorable.value;
    if (!local) return;
    restorable.value = null;
    form.value = clone(local.form);
  }

  /** Bỏ bản cũ trên máy; nếu đã sửa tiếp trên form này thì giữ lại bản đang sửa thay vào chỗ đó. */
  function discardLocal(): void {
    restorable.value = null;
    flushLocal();
  }

  // Rời form (đổi trang, đóng component) khi chưa tới lượt tự lưu thì ghi ngay vào máy.
  onScopeDispose(() => {
    if (localTimer !== undefined) flushLocal();
    clearTimeout(duplicateTimer);
    clearTimeout(zoneTimer);
  });
  void init();

  return {
    placeId,
    load,
    city,
    place,
    form,
    errors,
    notice,
    busy,
    restorable,
    localKept,
    duplicates,
    duplicateFailed,
    zoneSuggestion,
    status,
    dirty,
    issues,
    save,
    activate,
    restoreLocal,
    discardLocal,
    acceptZone,
    applyPhotos,
    retry: init,
  };
}
