import { AdminPlace, CityPublic } from '@ranhduong/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { fetchCity, fetchZoneSuggestions } from '@/entities/city/api/city';
import { checkDuplicates, fetchPlace, updatePlace } from '@/entities/place/api/places';
import { formFromPlace } from './form';
import { usePlaceEditor } from './use-place-editor';

vi.mock('@/entities/city/api/city', () => ({ fetchCity: vi.fn(), fetchZoneSuggestions: vi.fn() }));
vi.mock('@/entities/place/api/places', () => ({
  fetchPlace: vi.fn(),
  createPlace: vi.fn(),
  updatePlace: vi.fn(),
  activatePlace: vi.fn(),
  checkDuplicates: vi.fn(),
}));

// Dữ liệu giả, tên rõ là giả.
const ID = '0123456789abcdef01234567';
const KEY = `rd-admin:place-draft:${ID}`;
const CITY = CityPublic.parse({
  slug: 'thanh-pho-gia-lap',
  name: 'Thành phố Giả Lập',
  accent: '#123456',
  center: { type: 'Point', coordinates: [0.5, 0.5] },
  mapBounds: [0, 0, 1, 1],
  zones: [],
});
const PLACE = AdminPlace.parse({
  id: ID,
  status: 'draft',
  slug: 'quan-gia-lap',
  name: 'Quán Giả Lập',
  aliases: [],
  category: 'cafe',
  tags: [],
  openingHours: [],
  bestTime: [],
  transport: [],
  contact: {},
  ids: {},
  photos: [],
  updatedAt: '2026-10-08T03:00:00.000Z',
});

type MemoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { data: Map<string, string> };

function memoryStorage(failWrites = false): MemoryStorage {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) throw new Error('Bộ nhớ đầy giả lập');
      data.set(key, value);
    },
    removeItem: (key) => void data.delete(key),
  };
}
const storedName = (storage: MemoryStorage): unknown => {
  const raw = storage.data.get(KEY);
  return raw ? JSON.parse(raw).value.form.name : null;
};
const oldDraft = (name: string) =>
  JSON.stringify({ savedAt: '2026-10-08T02:00:00.000Z', value: { form: { ...formFromPlace(PLACE), name }, baseUpdatedAt: PLACE.updatedAt } });

async function open(storage: MemoryStorage) {
  vi.stubGlobal('localStorage', storage);
  const scope = effectScope();
  const editor = scope.run(() => usePlaceEditor(ID, () => undefined));
  if (!editor) throw new Error('không dựng được editor');
  await vi.advanceTimersByTimeAsync(0);
  return { scope, editor };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(fetchCity).mockResolvedValue(CITY);
  vi.mocked(fetchPlace).mockResolvedValue(PLACE);
  vi.mocked(fetchZoneSuggestions).mockResolvedValue([]);
  vi.mocked(checkDuplicates).mockResolvedValue([]);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('usePlaceEditor: giữ bản đang sửa trên máy', () => {
  it('đang hỏi khôi phục mà vẫn sửa: bản mới vẫn được giữ trên máy, bản cũ vẫn khôi phục được', async () => {
    const storage = memoryStorage();
    storage.data.set(KEY, oldDraft('Bản Cũ Giả Lập'));
    const { editor } = await open(storage);
    expect(editor.restorable.value).not.toBeNull();
    expect(storedName(storage)).toBe('Bản Cũ Giả Lập');
    editor.form.value.name = 'Bản Mới Giả Lập';
    await vi.advanceTimersByTimeAsync(800);
    expect(storedName(storage)).toBe('Bản Mới Giả Lập');
    editor.restoreLocal();
    expect(editor.form.value.name).toBe('Bản Cũ Giả Lập');
  });

  it('bấm "Bỏ bản trên máy" sau khi đã sửa tiếp: xoá bản cũ nhưng giữ bản đang sửa; chưa sửa gì thì xoá hẳn', async () => {
    const edited = memoryStorage();
    edited.data.set(KEY, oldDraft('Bản Cũ Giả Lập'));
    const first = await open(edited);
    first.editor.form.value.name = 'Bản Mới Giả Lập';
    first.editor.discardLocal();
    expect(storedName(edited)).toBe('Bản Mới Giả Lập');
    first.scope.stop();
    const untouched = memoryStorage();
    untouched.data.set(KEY, oldDraft('Bản Cũ Giả Lập'));
    const second = await open(untouched);
    second.editor.discardLocal();
    expect(storedName(untouched)).toBeNull();
  });

  it('lưu lên máy chủ thành công thì thôi hỏi khôi phục', async () => {
    const storage = memoryStorage();
    storage.data.set(KEY, oldDraft('Bản Cũ Giả Lập'));
    const { editor } = await open(storage);
    vi.mocked(updatePlace).mockResolvedValue(PLACE);
    await editor.save();
    expect(editor.restorable.value).toBeNull();
  });

  it('trình duyệt không cho lưu trên máy mà lưu lên máy chủ cũng lỗi: không hứa là đã giữ trên máy', async () => {
    const { editor } = await open(memoryStorage(true));
    editor.form.value.name = 'Bản Mới Giả Lập';
    await vi.advanceTimersByTimeAsync(800);
    vi.mocked(updatePlace).mockRejectedValue(new Error('Mất mạng giả lập'));
    await editor.save();
    expect(editor.notice.value?.messages.join(' ')).not.toMatch(/giữ trên máy/);
    expect(editor.localKept.value).toBe(false);
  });

  it('đóng form khi chưa tới lượt tự lưu thì vẫn ghi ngay vào máy', async () => {
    const storage = memoryStorage();
    const { scope, editor } = await open(storage);
    editor.form.value.name = 'Bản Mới Giả Lập';
    await vi.advanceTimersByTimeAsync(100);
    scope.stop();
    expect(storedName(storage)).toBe('Bản Mới Giả Lập');
  });
});
