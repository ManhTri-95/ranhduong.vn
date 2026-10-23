import { createItineraryRequestSchema, NotEnoughPlacesDetails, type CityPublic, type ItineraryRequest, type ItineraryUserDetail, type PlanSuggestion, type TripInterest } from '@ranhduong/contracts';
import { reactive, ref } from 'vue';

export function vietnamToday(): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
}

interface FormError {
  kind: 'validation' | 'shortage' | 'network' | 'rate';
  message: string;
  suggestions: PlanSuggestion[];
}

export function createItineraryFlow(city: CityPublic, create: (input: ItineraryRequest) => Promise<ItineraryUserDetail>, navigate: (path: string) => unknown) {
  const request = reactive<ItineraryRequest>({ days: 2, startDate: vietnamToday(), transport: 'motorbike', with: 'friends', tags: [], pace: 'relaxed' });
  const pending = ref(false);
  const created = ref(false);
  const error = ref<FormError | null>(null);
  const selectedZone = ref<string | null>(null);
  let createdPath: string | undefined;
  let disposed = false;

  function toggleInterest(tag: TripInterest): void {
    if (pending.value || created.value) return;
    if (request.tags.includes(tag)) request.tags = request.tags.filter(t => t !== tag);
    else if (request.tags.length < 3) request.tags.push(tag);
  }
  function skipStay(): void { if (!pending.value && !created.value) { delete request.stayLocation; selectedZone.value = null; } }
  function selectZone(slug: string): void {
    if (pending.value || created.value) return;
    const center = city.zones.find(zone => zone.slug === slug)?.center;
    skipStay();
    if (center) { request.stayLocation = { type: 'Point', coordinates: [...center.coordinates] }; selectedZone.value = slug; }
  }
  function applySuggestion(suggestion: PlanSuggestion): void {
    if (pending.value || created.value) return;
    if (suggestion.kind === 'reduce_days') request.days = suggestion.days;
    else request.tags = [];
    error.value = null;
  }
  async function submit(): Promise<void> {
    if (pending.value || disposed) return;
    error.value = null;
    pending.value = true;
    try {
      if (!createdPath) {
        const parsed = createItineraryRequestSchema(city.mapBounds).safeParse(request);
        if (!parsed.success) {
          error.value = { kind: 'validation', message: parsed.error.issues[0]?.message ?? 'Bạn xem lại lựa chọn nhé.', suggestions: [] };
          return;
        }
        createdPath = `/l/${(await create(parsed.data)).shareId}`;
        created.value = true;
      }
      if (!disposed) await navigate(createdPath);
    } catch (cause: unknown) {
      if (disposed) return;
      const data = cause && typeof cause === 'object' && 'data' in cause ? cause.data : undefined;
      const code = data && typeof data === 'object' && 'code' in data ? data.code : undefined;
      if (code === 'NOT_ENOUGH_PLACES') {
        const details = NotEnoughPlacesDetails.safeParse(data && typeof data === 'object' && 'details' in data ? data.details : undefined);
        error.value = { kind: 'shortage', message: `Mình chưa ghi đủ chỗ cho chuyến ${request.days} ngày theo lựa chọn này. Thử ít ngày hơn, hoặc bỏ bớt gu nhé?`, suggestions: details.success ? details.data.suggestions : [] };
      } else if (code === 'RATE_LIMITED') {
        error.value = { kind: 'rate', message: 'Bạn vừa lên khá nhiều lịch rồi. Nghỉ một chút, lát nữa mình thử tiếp nhé.', suggestions: [] };
      } else {
        error.value = { kind: 'network', message: createdPath ? 'Lịch đã tạo rồi, nhưng chưa mở được trang. Bấm Thử lại để mở nhé.' : 'Mạng đang chập chờn, mình chưa nhận được lịch. Các lựa chọn vẫn ở đây, thử lại nhé.', suggestions: [] };
      }
    } finally { if (!disposed) pending.value = false; }
  }
  return { request, pending, created, error, selectedZone, submit, toggleInterest, skipStay, selectZone, applySuggestion, dispose: () => { disposed = true; } };
}
