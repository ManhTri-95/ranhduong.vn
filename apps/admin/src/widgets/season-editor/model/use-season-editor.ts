import { CitySeasonEditInput, CitySeasonLocalDraft, type CitySeasonSettings, type SeasonItineraryOptions } from '@ranhduong/contracts';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { fetchSeasonSettings, fetchSeasonItineraries, saveSeasonSettings } from '@/entities/city/api/city';
import { failureMessages, toApiFailure } from '@/shared/api/errors';
import { readLocalDraft, removeLocalDraft, writeLocalDraft } from '@/shared/lib/local-draft';
import { seasonForm, seasonInput } from './form';

export interface SeasonFieldError { path: PropertyKey[]; message: string }
export function useSeasonEditor(city: string) {
  const form = ref<CitySeasonLocalDraft>({ updatedAt: '', seasons: [] });
  const latest = ref<CitySeasonSettings | null>(null);
  const itineraries = ref<SeasonItineraryOptions['items']>([]);
  const loading = ref(true);
  const busy = ref(false);
  const loadError = ref('');
  const errors = ref<SeasonFieldError[]>([]);
  const notice = ref('');
  const loginRequired = ref(false);
  const conflict = ref(false);
  const restorable = ref<CitySeasonLocalDraft | null>(null);
  const localKept = ref(false);
  const baseline = ref(JSON.stringify(form.value));
  const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
  const canLeave = computed(() => !dirty.value || localKept.value);
  const key = `rd:seasons:${city}`;
  let generation = 0;
  let active = true;
  onScopeDispose(() => { active = false; generation++; });

  watch(form, () => {
    if (!loading.value && !busy.value) {
      localKept.value = dirty.value && writeLocalDraft(key, form.value);
      if (dirty.value) notice.value = '';
    }
  }, { deep: true, flush: 'sync' });

  async function load(): Promise<void> {
    if (busy.value) return;
    const current = ++generation;
    const preserve = dirty.value;
    loading.value = true;
    loadError.value = '';
    try {
      const [saved, options] = await Promise.all([fetchSeasonSettings(city), fetchSeasonItineraries(city)]);
      if (!active || current !== generation) return;
      latest.value = saved;
      itineraries.value = options.items;
      loginRequired.value = false;
      if (!preserve) {
        form.value = seasonForm(saved);
        baseline.value = JSON.stringify(form.value);
        const local = readLocalDraft(key, CitySeasonLocalDraft)?.value;
        restorable.value = local && JSON.stringify(local) !== baseline.value ? local : null;
      }
    } catch (error) {
      if (!active || current !== generation) return;
      loginRequired.value = toApiFailure(error).status === 401;
      loadError.value = 'Chưa tải được cấu hình mùa. Thử lại nhé.';
    } finally { if (active && current === generation) loading.value = false; }
  }

  function restore(): void {
    if (restorable.value) form.value = CitySeasonLocalDraft.parse(restorable.value);
    restorable.value = null;
  }
  function discardLocal(): void {
    restorable.value = null;
    if (dirty.value) localKept.value = writeLocalDraft(key, form.value);
    else { removeLocalDraft(key); localKept.value = false; }
  }
  function adoptLatestVersion(): void {
    if (!latest.value) return;
    form.value.updatedAt = latest.value.updatedAt;
    conflict.value = false;
    errors.value = [];
    notice.value = 'Đã dùng phiên bản mới. Kiểm lại nội dung rồi bấm lưu; bản đang sửa sẽ thay cấu hình hiện tại.';
  }

  async function save(): Promise<void> {
    if (busy.value || loading.value) return;
    errors.value = [];
    notice.value = '';
    const parsed = CitySeasonEditInput.safeParse(seasonInput(form.value));
    if (!parsed.success) { errors.value = parsed.error.issues.map(({ path, message }) => ({ path, message })); return; }
    busy.value = true;
    loginRequired.value = false;
    conflict.value = false;
    try {
      const saved = await saveSeasonSettings(city, parsed.data);
      if (!active) return;
      latest.value = saved;
      form.value = seasonForm(saved);
      baseline.value = JSON.stringify(form.value);
      removeLocalDraft(key);
      restorable.value = null;
      localKept.value = false;
      notice.value = 'Đã lưu mùa. Giao diện web cập nhật theo bộ nhớ đệm tối đa 15 phút.';
    } catch (error) {
      if (!active) return;
      const failure = toApiFailure(error);
      loginRequired.value = failure.status === 401;
      conflict.value = failure.status === 409;
      const messages = failureMessages(failure);
      errors.value = (messages.length ? messages : [conflict.value ? 'Cấu hình đã đổi ở nơi khác. Tải bản mới trước khi lưu lại.' : 'Chưa lưu được. Nội dung vẫn ở đây, thử lại nhé.']).map((message) => ({ path: [], message }));
      localKept.value = writeLocalDraft(key, form.value);
    } finally { if (active) busy.value = false; }
  }
  void load();
  return { form, latest, itineraries, loading, busy, loadError, errors, notice, loginRequired, conflict, restorable, localKept, dirty, canLeave, load, save, restore, discardLocal, adoptLatestVersion };
}
