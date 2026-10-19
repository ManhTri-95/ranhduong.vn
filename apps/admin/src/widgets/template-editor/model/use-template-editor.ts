import { analyzeTemplate, TemplateEditInput, TemplateLocalDraft, TripWith, type TripInterest, type AdminTemplate, type TemplateAnalysis, type TemplatePlace, type TemplateStopInput, type ItineraryStatus } from '@ranhduong/contracts';
import { estimateTemplateTravelMinutes } from '@ranhduong/geo';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { createTemplate, fetchTemplate, fetchTemplatePlaces, updateTemplate } from '@/entities/itinerary/api/templates';
import { failureMessages, toApiFailure } from '@/shared/api/errors';
import { CITY_SLUG } from '@/shared/config';
import { readLocalDraft, removeLocalDraft, writeLocalDraft } from '@/shared/lib/local-draft';
import { addDay, addStop, moveStop, removeDay, removeStop, replaceStop } from './stops';

export function useTemplateEditor(initialId: string | null, onCreated: (id: string) => void) {
  const id = ref(initialId);
  const template = ref<AdminTemplate | null>(null);
  const form = ref<TemplateEditInput>(TemplateLocalDraft.parse({ title: '', description: '', season: '', style: '', transport: 'motorbike', pace: 'relaxed', startWeekday: 6, seoTitle: '', seoDescription: '', status: 'draft', days: [{ startTime: '07:00', stops: [] }] }));
  const places = ref<TemplatePlace[]>([]);
  const loading = ref(true);
  const busy = ref(false);
  const loadError = ref('');
  const errors = ref<string[]>([]);
  const notice = ref('');
  const loginRequired = ref(false);
  const restorable = ref<TemplateEditInput | null>(null);
  const restorableSavedAt = ref<string | null>(null);
  const localKept = ref(false);
  const baseline = ref(JSON.stringify(form.value));
  const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
  const loginReturnTo = computed(() => `/lich-trinh/${id.value ?? 'moi'}`);
  const storageKey = () => `rd:template:${CITY_SLUG}:${id.value ?? 'moi'}`;
  let disposed = false;
  onScopeDispose(() => { disposed = true; });
  const analysis = computed<TemplateAnalysis>(() => {
    const parsed = TemplateEditInput.safeParse({ ...form.value, title: form.value.title.trim() || 'Xem trước' });
    if (!parsed.success) return { days: [], canPublish: false, issues: parsed.error.issues.map((issue) => ({ code: 'invalid_time', level: 'error', day: typeof issue.path[1] === 'number' ? issue.path[1] : 0, message: issue.message })) };
    return analyzeTemplate(parsed.data, places.value, (from, to) => estimateTemplateTravelMinutes({ lng: from.coordinates[0], lat: from.coordinates[1] }, { lng: to.coordinates[0], lat: to.coordinates[1] }));
  });
  watch(form, () => {
    if (!loading.value && dirty.value) { localKept.value = writeLocalDraft(storageKey(), { ...form.value, status: 'draft' }); notice.value = ''; }
  }, { deep: true, flush: 'sync' });

  async function load(): Promise<void> {
    loading.value = true; loadError.value = ''; loginRequired.value = false;
    try {
      const [candidates, saved] = await Promise.all([fetchTemplatePlaces(CITY_SLUG), id.value ? fetchTemplate(id.value) : null]);
      if (disposed) return;
      places.value = candidates; template.value = saved;
      if (saved) form.value = TemplateEditInput.parse(saved);
      baseline.value = JSON.stringify(form.value);
      // Giữ dấu hiệu thiếu tags để nhận ra bản trước S32; bản mới bỏ chọn with không được suy lại từ style.
      const local = readLocalDraft(storageKey(), TemplateLocalDraft.extend({ tags: TemplateLocalDraft.shape.tags.unwrap().optional() }));
      restorable.value = local ? {
        ...local.value, tags: local.value.tags ?? [],
        with: local.value.tags === undefined ? local.value.with ?? TripWith.safeParse(local.value.style).data : local.value.with,
      } : null;
      restorableSavedAt.value = local?.savedAt ?? null;
    } catch (err) { if (!disposed) { loginRequired.value = toApiFailure(err).status === 401; loadError.value = toApiFailure(err).status === 404 ? 'Không tìm thấy lịch trình mẫu.' : 'Chưa tải được lịch trình, thử lại nhé.'; } }
    finally { if (!disposed) loading.value = false; }
  }
  function restore(): void { if (restorable.value) form.value = { ...restorable.value, status: template.value?.status ?? 'draft' }; restorable.value = null; restorableSavedAt.value = null; }
  function discardLocal(): void { restorable.value = null; restorableSavedAt.value = null; removeLocalDraft(storageKey()); localKept.value = false; }
  /** "Bỏ thay đổi": form về bản đã lưu (hoặc trống khi chưa lưu), xoá bản trên máy và lời hỏi khôi phục. */
  function discardChanges(): void {
    form.value = TemplateLocalDraft.parse(JSON.parse(baseline.value));
    removeLocalDraft(storageKey()); localKept.value = false; restorable.value = null; restorableSavedAt.value = null; errors.value = []; notice.value = '';
  }
  async function refreshPlaces(): Promise<void> {
    try { const values = await fetchTemplatePlaces(CITY_SLUG); if (!disposed) places.value = values; }
    catch (err) { loginRequired.value = toApiFailure(err).status === 401; errors.value = ['Chưa kiểm lại được dữ liệu địa điểm, thử lại nhé.']; }
  }
  function setStop(key: string, patch: Partial<TemplateStopInput>): void {
    form.value.days = form.value.days.map((day) => ({ ...day, stops: day.stops.map((stop) => stop.key === key ? { ...stop, ...patch } : stop) }));
  }
  function toggleInterest(interest: TripInterest): void {
    if (busy.value || loading.value) return;
    const tags = form.value.tags;
    if (tags.includes(interest)) form.value.tags = tags.filter((tag) => tag !== interest);
    else if (tags.length < 3) form.value.tags = [...tags, interest];
  }
  async function save(status: ItineraryStatus): Promise<void> {
    if (busy.value || loading.value) return;
    errors.value = []; notice.value = ''; loginRequired.value = false;
    const parsed = TemplateEditInput.safeParse({ ...form.value, status });
    if (!parsed.success) { errors.value = parsed.error.issues.map((issue) => issue.message); return; }
    if (status === 'published' && !analysis.value.canPublish) { errors.value = ['Sửa hết lỗi trong lịch trình trước khi công khai.']; return; }
    busy.value = true;
    try {
      const saved = id.value ? await updateTemplate(id.value, parsed.data) : await createTemplate(CITY_SLUG, parsed.data);
      removeLocalDraft(storageKey());
      if (disposed) return;
      const created = !id.value;
      id.value = saved.id; template.value = saved; form.value = TemplateEditInput.parse(saved);
      baseline.value = JSON.stringify(form.value); removeLocalDraft(storageKey()); restorable.value = null; localKept.value = false;
      notice.value = status === 'published' ? 'Đã lưu và công khai lịch trình mẫu.' : 'Đã lưu nháp lịch trình mẫu.';
      if (created) onCreated(saved.id);
    } catch (err) {
      if (disposed) return;
      const failure = toApiFailure(err); loginRequired.value = failure.status === 401;
      errors.value = failureMessages(failure);
      if (!errors.value.length) errors.value = ['Chưa lưu được lịch trình. Nội dung vẫn ở đây, thử lại nhé.'];
      localKept.value = writeLocalDraft(storageKey(), { ...form.value, status: 'draft' });
      if (failure.status === 400) await refreshPlaces();
    } finally { if (!disposed) busy.value = false; }
  }
  void load();
  return { id, template, form, places, analysis, loading, busy, loadError, errors, notice, loginRequired, loginReturnTo, restorable, restorableSavedAt, localKept, dirty, load, restore, discardLocal, discardChanges, refreshPlaces, save, setStop, toggleInterest,
    add: (day: number, placeId: string) => { form.value.days = addStop(form.value.days, day, placeId); },
    move: (key: string, day: number, index: number) => { form.value.days = moveStop(form.value.days, key, day, index); },
    remove: (key: string) => { form.value.days = removeStop(form.value.days, key); },
    replace: (key: string, placeId: string) => { form.value.days = replaceStop(form.value.days, key, placeId); },
    addDay: () => { form.value.days = addDay(form.value.days); },
    removeDay: (day: number) => { form.value.days = removeDay(form.value.days, day); },
  };
}
