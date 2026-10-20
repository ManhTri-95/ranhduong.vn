import { describe, expect, it } from 'vitest';
import { fakePlace, fakeRequest, fakeTemplate, placesIn, planInput, ZONES } from '../../../testing/planner-fixtures';
import { prepare, type PlanTemplate } from './plan-context';
import { nearestTemplate, planFromTemplate } from './templates';

const names = (r: ReturnType<typeof planFromTemplate>, day = 0) => (r.ok ? r.days[day]?.picks.map((p) => p.place.name).sort() : null);
const ids = (...ns: number[]) => ns.map((n) => fakePlace(n).id);

describe('nearestTemplate', () => {
  it('cùng số ngày, Jaccard gu cộng 0,25 khi cùng đi cùng ai', () => {
    const request = fakeRequest({ tags: ['chill_cafe', 'photo_spots'], with: 'couple' });
    const templates = [
      fakeTemplate('b1', ['chill_cafe'], [[]], 'couple'),
      fakeTemplate('b2', ['chill_cafe', 'photo_spots'], [[]]),
      fakeTemplate('b3', ['chill_cafe', 'photo_spots'], [[], []], 'couple'),
    ];
    expect(nearestTemplate(templates, request)?.id).toBe('b2');
    expect(nearestTemplate(templates, fakeRequest({ days: 4 }))).toBeUndefined();
  });
  it('hai tập gu rỗng giống nhau hoàn toàn; hoà thì id nhỏ', () => {
    const templates = [fakeTemplate('c2', [], [[]]), fakeTemplate('c1', [], [[]]), fakeTemplate('c0', ['chill_cafe'], [[]])];
    expect(nearestTemplate(templates, fakeRequest())?.id).toBe('c1');
  });
});

describe('planFromTemplate', () => {
  it('giữ điểm hợp của mẫu, thay điểm bị nghi ngờ bằng điểm cùng cụm', () => {
    const places = [...placesIn(0, 4, 1), ...placesIn(0, 1, 9)].map((p) => (p.name === 'Điểm Giả Lập 3' ? { ...p, status: 'suspected' as const } : p));
    const r = planFromTemplate(fakeTemplate('t', [], [ids(1, 2, 3, 4)]), prepare(planInput({ places })));
    expect(names(r)).toEqual(['Điểm Giả Lập 1', 'Điểm Giả Lập 2', 'Điểm Giả Lập 4', 'Điểm Giả Lập 9']);
  });
  it('điểm của mẫu không hợp gu nhường cho điểm hợp gu cùng cụm', () => {
    const pool = fakePlace(9, { tags: ['chill'] });
    const r = planFromTemplate(fakeTemplate('t', ['chill_cafe'], [ids(1, 2, 3, 4)]), prepare(planInput({ request: fakeRequest({ tags: ['chill_cafe'] }), places: [...placesIn(0, 4, 1), pool] })));
    expect(r.ok && r.days[0]?.picks.map((p) => p.place.id)).toContain(pool.id);
  });
  it('điểm hợp gu của mẫu được giữ dù điểm mới phổ biến hơn', () => {
    const fitting = placesIn(0, 4, 1, { tags: ['chill'] });
    const pool = fakePlace(9, { tags: ['chill'] });
    const input = planInput({ request: fakeRequest({ tags: ['chill_cafe'] }), places: [...fitting, pool], popularity: new Map([[pool.id, 100]]) });
    const r = planFromTemplate(fakeTemplate('t', ['chill_cafe'], [fitting.map((p) => p.id)]), prepare(input));
    expect(r.ok && r.days[0]?.picks.map((p) => p.place.id).sort()).toEqual(fitting.map((p) => p.id).sort());
  });
  it('bỏ điểm bữa ăn, điểm không còn trong snapshot và điểm đã có ở ngày trước', () => {
    const base = fakeTemplate('t', [], [ids(1, 2, 3, 4), ids(1, 6, 7, 8)]);
    const template: PlanTemplate = {
      ...base,
      days: [{ stops: [...(base.days[0]?.stops ?? []), { placeId: fakePlace(5).id, kind: 'meal' }, { placeId: 'ffffffffffffffffffffffff', kind: 'visit' }] }, base.days[1] ?? { stops: [] }],
    };
    const r = planFromTemplate(template, prepare(planInput({ request: fakeRequest({ days: 2 }), places: placesIn(0, 8, 1) })));
    expect(names(r, 0)).toEqual(['Điểm Giả Lập 1', 'Điểm Giả Lập 2', 'Điểm Giả Lập 3', 'Điểm Giả Lập 4']);
    expect(names(r, 1)).toEqual(['Điểm Giả Lập 5', 'Điểm Giả Lập 6', 'Điểm Giả Lập 7', 'Điểm Giả Lập 8']);
  });
  it('theo nhịp độ của khách: thong thả cắt còn 4, dày bù tới 6 từ cụm của ngày', () => {
    const places = placesIn(0, 6, 1);
    expect(names(planFromTemplate(fakeTemplate('t', [], [ids(1, 2, 3, 4, 5, 6)]), prepare(planInput({ places }))))).toHaveLength(4);
    expect(names(planFromTemplate(fakeTemplate('t', [], [ids(1, 2, 3, 4)]), prepare(planInput({ request: fakeRequest({ pace: 'packed' }), places }))))).toHaveLength(6);
  });
  it('cụm của ngày theo thứ tự trong mẫu, chỉ gồm cụm có điểm được chọn', () => {
    const places = [fakePlace(1, { zoneId: ZONES[1]!.id }), fakePlace(2), fakePlace(3, { zoneId: ZONES[1]!.id })];
    const r = planFromTemplate(fakeTemplate('t', [], [ids(1, 2, 3)]), prepare(planInput({ places })));
    expect(r.ok && r.days[0]?.zoneIds).toEqual([ZONES[1]!.id, ZONES[0]!.id]);
  });
  it('ngày của mẫu dưới 3 điểm thì thất bại', () => {
    const places = placesIn(0, 4, 1, { status: 'closed' });
    expect(planFromTemplate(fakeTemplate('t', [], [ids(1, 2, 3, 4)]), prepare(planInput({ places })))).toEqual({ ok: false });
  });
});
