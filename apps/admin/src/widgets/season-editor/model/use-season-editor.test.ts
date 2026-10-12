import { FetchError } from 'ofetch';
import { effectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSeasonSettings, fetchSeasonItineraries, saveSeasonSettings } from '@/entities/city/api/city';
import { useSeasonEditor } from './use-season-editor';

vi.mock('@/entities/city/api/city', () => ({ fetchSeasonSettings: vi.fn(), fetchSeasonItineraries: vi.fn(), saveSeasonSettings: vi.fn() }));
const saved = { updatedAt: '2026-10-12T00:00:00.000Z', seasons: [{ key: 'hoa', kind: 'flower' as const, from: '10-01', to: '12-01', accent: '#E58FA8', title: 'Mùa Giả Lập', sub: 'Mô tả Giả Lập', illustration: 'cherry-blossom' }] };
const key = 'rd:seasons:thanh-pho-gia-lap';
let scope: ReturnType<typeof effectScope>;
let storage: Map<string, string>;
async function open() {
  scope = effectScope();
  const editor = scope.run(() => useSeasonEditor('thanh-pho-gia-lap'));
  if (!editor) throw new Error('Không dựng được editor');
  await vi.waitFor(() => expect(editor.loading.value).toBe(false));
  return editor;
}
function failure(status: number) {
  const error = new FetchError('Lỗi Giả Lập');
  Object.defineProperty(error, 'statusCode', { value: status });
  return error;
}
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => { storage.set(k, v); }, removeItem: (k: string) => storage.delete(k) });
  vi.mocked(fetchSeasonSettings).mockResolvedValue(structuredClone(saved));
  vi.mocked(fetchSeasonItineraries).mockResolvedValue({ items: [] });
  vi.mocked(saveSeasonSettings).mockImplementation(async (_city, input) => ({ ...input, updatedAt: '2026-10-12T00:00:01.000Z' }));
});
afterEach(() => { scope?.stop(); vi.unstubAllGlobals(); vi.resetAllMocks(); });

describe('season editor recovery and versioning', () => {
  it('keeps incomplete dates and copy locally and blocks invalid saves with field paths', async () => {
    const editor = await open();
    editor.form.value.seasons[0]!.from = '10-';
    editor.form.value.seasons[0]!.sub = 'Đang nhập Giả Lập';
    expect(editor.localKept.value).toBe(true);
    expect(storage.get(key)).toContain('10-');
    await editor.save();
    expect(editor.errors.value.some((issue) => issue.path.join('.') === 'seasons.0.from')).toBe(true);
    expect(saveSeasonSettings).not.toHaveBeenCalled();
  });
  it.each([401, 409, 503])('preserves edits and recovery after a %i response', async (status) => {
    const editor = await open();
    editor.form.value.seasons[0]!.title = 'Sửa Giả Lập';
    vi.mocked(saveSeasonSettings).mockRejectedValueOnce(failure(status));
    await editor.save();
    expect(editor.form.value.seasons[0]?.title).toBe('Sửa Giả Lập');
    expect(editor.dirty.value).toBe(true);
    expect(editor.busy.value).toBe(false);
    expect(storage.has(key)).toBe(true);
    expect(editor.loginRequired.value).toBe(status === 401);
    expect(editor.conflict.value).toBe(status === 409);
    await editor.load();
    expect(editor.form.value.seasons[0]?.title).toBe('Sửa Giả Lập');
  });
  it('restores a raw draft with its original version and clears recovery after success', async () => {
    storage.set(key, JSON.stringify({ savedAt: new Date().toISOString(), value: { ...saved, seasons: [{ ...saved.seasons[0], from: '10-', featuredItineraryId: '' }] } }));
    const editor = await open();
    expect(editor.restorable.value).not.toBeNull();
    editor.restore();
    expect(editor.form.value.seasons[0]?.from).toBe('10-');
    editor.form.value.seasons[0]!.from = '10-01';
    await editor.save();
    expect(editor.dirty.value).toBe(false);
    expect(editor.form.value.updatedAt).toBe('2026-10-12T00:00:01.000Z');
    expect(storage.has(key)).toBe(false);
  });
  it.each([false, true])('keeps current edits when dismissing an older recovery prompt (storage failure: %s)', async (storageFails) => {
    storage.set(key, JSON.stringify({ savedAt: new Date().toISOString(), value: { ...saved, seasons: [{ ...saved.seasons[0], title: 'Bản cũ Giả Lập' }] } }));
    const editor = await open();
    expect(editor.restorable.value).not.toBeNull();
    editor.form.value.seasons[0]!.title = 'Bản mới Giả Lập';
    expect(editor.localKept.value).toBe(true);
    if (storageFails) {
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => storage.get(k) ?? null,
        setItem: () => { throw new Error('Đầy Giả Lập'); },
        removeItem: (k: string) => storage.delete(k),
      });
    }
    editor.discardLocal();
    expect(editor.restorable.value).toBeNull();
    expect(editor.form.value.seasons[0]?.title).toBe('Bản mới Giả Lập');
    expect(editor.localKept.value).toBe(!storageFails);
    expect(editor.canLeave.value).toBe(!storageFails);
    expect(storage.get(key)).toContain('Bản mới Giả Lập');
  });
  it('requires explicit version adoption after a conflict and detects storage failure', async () => {
    const editor = await open();
    editor.form.value.seasons[0]!.title = 'Đang sửa Giả Lập';
    vi.mocked(fetchSeasonSettings).mockResolvedValue({ ...saved, updatedAt: '2026-10-12T00:00:02.000Z' });
    await editor.load();
    expect(editor.form.value.updatedAt).toBe(saved.updatedAt);
    editor.adoptLatestVersion();
    expect(editor.form.value.updatedAt).toBe('2026-10-12T00:00:02.000Z');
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('Đầy Giả Lập'); }, removeItem: () => {} });
    editor.form.value.seasons[0]!.sub = 'Ghi chú khác Giả Lập';
    expect(editor.localKept.value).toBe(false);
    expect(editor.canLeave.value).toBe(false);
  });
});
