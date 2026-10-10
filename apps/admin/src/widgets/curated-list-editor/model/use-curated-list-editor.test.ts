import { FetchError } from 'ofetch';
import { effectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCuratedList, fetchCuratedList, updateCuratedList } from '@/entities/curated-list/api/curated-lists';
import { fetchPlaces } from '@/entities/place/api/places';
import { useCuratedListEditor } from './use-curated-list-editor';

vi.mock('@/entities/curated-list/api/curated-lists', () => ({ createCuratedList: vi.fn(), fetchCuratedList: vi.fn(), updateCuratedList: vi.fn() }));
vi.mock('@/entities/place/api/places', () => ({ fetchPlaces: vi.fn() }));
const id = '0123456789abcdef01234567';
const saved = { id, cityId: id, slug: 'gia-lap', title: 'Giả Lập', description: '', placeIds: [id], status: 'published' as const };
const key = 'rd:curated-list:da-lat:moi';
let data: Map<string, string>;
let scope: ReturnType<typeof effectScope>;
async function open(listId: string | null = null, created = vi.fn()) {
  scope = effectScope();
  const editor = scope.run(() => useCuratedListEditor(listId, created));
  if (!editor) throw new Error('Không dựng được editor');
  await vi.waitFor(() => expect(editor.loading.value).toBe(false));
  return editor;
}
beforeEach(() => {
  data = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) });
  vi.mocked(fetchPlaces).mockResolvedValue([]);
  vi.mocked(fetchCuratedList).mockResolvedValue(saved);
});
afterEach(() => { scope?.stop(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('S14 editor recovery and saves', () => {
  it('restores a description/order entered before the title, across login or refresh', async () => {
    data.set(key, JSON.stringify({ savedAt: new Date().toISOString(), value: { title: '', description: 'Đang soạn Giả Lập', placeIds: [id], status: 'draft' } }));
    const editor = await open();
    expect(editor.restorable.value).not.toBeNull();
    editor.restore();
    expect(editor.form.value.description).toBe('Đang soạn Giả Lập');
    expect(editor.form.value.placeIds).toEqual([id]);
    expect(editor.dirty.value).toBe(true);
  });
  it('keeps edited fields/order after a 401 and provides the login return URL', async () => {
    const error = new FetchError('Hết phiên Giả Lập');
    Object.defineProperty(error, 'statusCode', { value: 401 });
    vi.mocked(updateCuratedList).mockRejectedValueOnce(error);
    const editor = await open(id);
    editor.form.value.title = 'Tên mới Giả Lập';
    await editor.save('published');
    expect(editor.form.value.title).toBe('Tên mới Giả Lập');
    expect(editor.loginRequired.value).toBe(true);
    expect(editor.loginReturnTo.value).toBe(`/danh-sach/${id}`);
    expect(editor.dirty.value).toBe(true);
    expect(editor.busy.value).toBe(false);
    expect(data.has(`rd:curated-list:da-lat:${id}`)).toBe(true);
  });
  it('creates once then updates the same ID, clears local recovery, and saves reordered places', async () => {
    const created = vi.fn();
    vi.mocked(createCuratedList).mockResolvedValue(saved);
    vi.mocked(updateCuratedList).mockResolvedValue({ ...saved, status: 'draft' });
    const editor = await open(null, created);
    editor.form.value = { title: saved.title, description: '', placeIds: [id], status: 'draft' };
    await editor.save('published');
    expect(created).toHaveBeenCalledOnce();
    expect(created).toHaveBeenCalledWith(id);
    expect(editor.dirty.value).toBe(false);
    expect(data.size).toBe(0);
    await editor.save('draft');
    expect(createCuratedList).toHaveBeenCalledOnce();
    expect(updateCuratedList).toHaveBeenCalledWith(id, expect.objectContaining({ status: 'draft', placeIds: [id] }));
  });
  it('blocks invalid publication and leaves values editable after network failure', async () => {
    vi.mocked(createCuratedList).mockRejectedValue(new Error('Mất mạng Giả Lập'));
    const editor = await open();
    await editor.save('published');
    expect(createCuratedList).not.toHaveBeenCalled();
    expect(editor.errors.value.length).toBeGreaterThan(0);
    editor.form.value.title = 'Giả Lập';
    await editor.save('draft');
    expect(editor.form.value.title).toBe('Giả Lập');
    expect(editor.busy.value).toBe(false);
    expect(editor.errors.value.length).toBeGreaterThan(0);
  });
});
