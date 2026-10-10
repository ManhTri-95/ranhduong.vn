import { CuratedListEditInput, CuratedListLocalDraft, type AdminCuratedList, type AdminPlaceSummary, type CuratedListStatus } from '@ranhduong/contracts';
import { computed, ref, watch } from 'vue';
import { createCuratedList, fetchCuratedList, updateCuratedList } from '@/entities/curated-list/api/curated-lists';
import { fetchPlaces } from '@/entities/place/api/places';
import { failureMessages, toApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';
import { readLocalDraft, removeLocalDraft, writeLocalDraft } from '@/shared/lib/local-draft';

export function useCuratedListEditor(initialId: string | null, onCreated: (id: string) => void) {
  const id = ref(initialId);
  const list = ref<AdminCuratedList | null>(null);
  const form = ref<CuratedListEditInput>({ title: '', description: '', placeIds: [], status: 'draft' });
  const places = ref<AdminPlaceSummary[]>([]);
  const loading = ref(true);
  const loadError = ref('');
  const errors = ref<string[]>([]);
  const notice = ref('');
  const busy = ref(false);
  const loginRequired = ref(false);
  const restorable = ref<CuratedListEditInput | null>(null);
  const localKept = ref(false);
  const baseline = ref(JSON.stringify(form.value));
  const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
  const key = () => `rd:curated-list:${CITY_SLUG}:${id.value ?? 'moi'}`;
  const loginReturnTo = computed(() => `/danh-sach/${id.value ?? 'moi'}`);

  async function load(): Promise<void> {
    loading.value = true;
    loadError.value = '';
    try {
      const [candidates, saved] = await Promise.all([fetchPlaces(CITY_SLUG), id.value ? fetchCuratedList(id.value) : null]);
      places.value = candidates;
      list.value = saved;
      if (saved) form.value = { title: saved.title, description: saved.description, placeIds: [...saved.placeIds], status: saved.status };
      baseline.value = JSON.stringify(form.value);
      restorable.value = readLocalDraft(key(), CuratedListLocalDraft)?.value ?? null;
    } catch (err) {
      const failure = toApiFailure(err);
      loginRequired.value = failure.status === 401;
      loadError.value = failure.status === 404 ? 'Không tìm thấy danh sách này.' : 'Chưa tải được danh sách, thử lại nhé.';
    } finally { loading.value = false; }
  }
  watch(form, () => {
    if (!loading.value && dirty.value) {
      localKept.value = writeLocalDraft(key(), { ...form.value, status: 'draft' });
      notice.value = '';
    }
  }, { deep: true, flush: 'sync' });

  function restore(): void {
    if (restorable.value) form.value = { ...restorable.value, status: list.value?.status ?? 'draft' };
    restorable.value = null;
  }
  function discardLocal(): void { restorable.value = null; removeLocalDraft(key()); }

  async function save(status: CuratedListStatus): Promise<void> {
    if (busy.value || loading.value) return;
    errors.value = [];
    notice.value = '';
    const parsed = CuratedListEditInput.safeParse({ ...form.value, status });
    if (!parsed.success) { errors.value = parsed.error.issues.map((issue) => issue.message); return; }
    busy.value = true;
    loginRequired.value = false;
    try {
      const saved = id.value ? await updateCuratedList(id.value, parsed.data) : await createCuratedList(CITY_SLUG, parsed.data);
      removeLocalDraft(key());
      const created = !id.value;
      id.value = saved.id;
      list.value = saved;
      form.value = { ...parsed.data };
      baseline.value = JSON.stringify(form.value);
      removeLocalDraft(key());
      restorable.value = null;
      localKept.value = false;
      notice.value = status === 'published' ? 'Đã lưu và công khai danh sách.' : 'Đã lưu nháp. Danh sách chưa hiện trên web.';
      if (created) onCreated(saved.id);
    } catch (err) {
      const failure = toApiFailure(err);
      loginRequired.value = failure.status === 401;
      errors.value = failureMessages(failure);
      if (!errors.value.length) errors.value = ['Chưa lưu được danh sách. Nội dung vẫn ở đây, thử lại nhé.'];
      localKept.value = writeLocalDraft(key(), { ...form.value, status: 'draft' });
    } finally { busy.value = false; }
  }
  void load();
  return { list, form, places, loading, loadError, errors, notice, busy, loginRequired, loginReturnTo, restorable, dirty, localKept, load, save, restore, discardLocal };
}
