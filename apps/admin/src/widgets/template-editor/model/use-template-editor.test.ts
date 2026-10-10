import { FetchError } from 'ofetch';
import { effectScope } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTemplate, fetchTemplatePlaces, updateTemplate } from '@/entities/itinerary/api/templates';
import { useTemplateEditor } from './use-template-editor';
vi.mock('@/entities/itinerary/api/templates', () => ({ createTemplate: vi.fn(), fetchTemplate: vi.fn(), fetchTemplatePlaces: vi.fn(), updateTemplate: vi.fn() }));
const id = '111111111111111111111111';
const key = '11111111-1111-4111-8111-111111111111';
const input = { title: 'Giả Lập', description: '', season: '', style: '', transport: 'motorbike' as const, pace: 'relaxed' as const, startWeekday: 6, seoTitle: '', seoDescription: '', status: 'draft' as const, days: [{ startTime: '07:00', stops: [{ key, placeId: id, note: 'Ghi chú Giả Lập', kind: 'visit' as const }] }] };
let scope: ReturnType<typeof effectScope>;
let storage: Map<string, string>;
beforeEach(() => {
  storage = new Map();
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, value: string) => storage.set(k, value), removeItem: (k: string) => storage.delete(k) });
  vi.mocked(fetchTemplatePlaces).mockResolvedValue([{ id, slug: 'gia-lap', name: 'Quán Giả Lập', category: 'cafe', alsoCategories: [], status: 'active', validPhoto: false, location: { type: 'Point', coordinates: [0, 0] }, openingHours: [{ day: 6, open: '00:00', close: '24:00' }] }]);
});
afterEach(() => { scope?.stop(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
async function open(created = vi.fn()) {
  scope = effectScope(); const editor = scope.run(() => useTemplateEditor(null, created));
  if (!editor) throw new Error('Không dựng được editor');
  await vi.waitFor(() => expect(editor.loading.value).toBe(false)); return editor;
}
describe('S15 editor local recovery and saves', () => {
  it('keeps partial title, days, notes and manual times through local restore', async () => {
    storage.set('rd:template:da-lat:moi', JSON.stringify({ savedAt: new Date().toISOString(), value: { ...input, title: '', days: [{ ...input.days[0], stops: [{ ...input.days[0]!.stops[0], manualStart: '09:00' }] }] } }));
    const editor = await open(); expect(editor.restorable.value).not.toBeNull(); editor.restore();
    expect(editor.form.value.days[0]?.stops[0]).toMatchObject({ manualStart: '09:00', note: 'Ghi chú Giả Lập' });
    expect(editor.dirty.value).toBe(true);
  });
  it('does not publish with errors, but saves private drafts with empty days', async () => {
    const editor = await open(); editor.form.value.title = 'Giả Lập'; await editor.save('published');
    expect(createTemplate).not.toHaveBeenCalled(); expect(editor.errors.value.length).toBeGreaterThan(0);
  });
  it('restores all edits even while a time field is incomplete, and blocks saving it', async () => {
    const first = await open(); first.form.value = structuredClone(input);
    first.form.value.days[0]!.startTime = '';
    first.setStop(key, { manualEnd: '09:', durationMin: 1441, note: 'Ghi chú mới cần giữ' });
    scope.stop();
    const restored = await open(); expect(restored.restorable.value).not.toBeNull(); restored.restore();
    expect(restored.form.value.days[0]).toMatchObject({ startTime: '', stops: [{ manualEnd: '09:', durationMin: 1441, note: 'Ghi chú mới cần giữ' }] });
    expect(restored.analysis.value.canPublish).toBe(false);
    await restored.save('draft'); expect(createTemplate).not.toHaveBeenCalled();
  });
  it('clears the local safety flag when discarding a copy after further edits', async () => {
    storage.set('rd:template:da-lat:moi', JSON.stringify({ savedAt: new Date().toISOString(), value: input }));
    const editor = await open(); editor.form.value.title = 'Thay đổi mới'; expect(editor.localKept.value).toBe(true);
    editor.discardLocal(); expect(storage.size).toBe(0); expect(editor.localKept.value).toBe(false);
    expect(editor.dirty.value).toBe(true);
  });
  it('does not discard the form on session/network failure', async () => {
    const err = new FetchError('Hết phiên Giả Lập'); Object.defineProperty(err, 'statusCode', { value: 401 });
    vi.mocked(createTemplate).mockRejectedValue(err);
    const editor = await open(); editor.form.value = structuredClone(input); await editor.save('draft');
    expect(editor.loginRequired.value).toBe(true); expect(editor.form.value.days).toEqual(input.days);
    expect(editor.localKept.value).toBe(true); expect(editor.busy.value).toBe(false);
  });
  it('creates once then updates and clears local copies after success', async () => {
    const saved = { ...input, id, cityId: id, slug: 'gia-lap', analysis: { days: [], issues: [], canPublish: true } };
    vi.mocked(createTemplate).mockResolvedValue(saved); vi.mocked(updateTemplate).mockResolvedValue(saved);
    const created = vi.fn(); const editor = await open(created); editor.form.value = structuredClone(input);
    await editor.save('draft'); expect(created).toHaveBeenCalledWith(id); expect(storage.size).toBe(0);
    await editor.save('draft'); expect(createTemplate).toHaveBeenCalledOnce(); expect(updateTemplate).toHaveBeenCalledWith(id, input);
  });
});
