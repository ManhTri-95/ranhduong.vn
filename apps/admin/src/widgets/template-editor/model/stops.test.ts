import { describe, expect, it } from 'vitest';
import { addStop, moveStop, removeStop, replaceStop, addDay, removeDay } from './stops';
import type { TemplateDayInput } from '@ranhduong/contracts';
const key = '11111111-1111-4111-8111-111111111111';
const nextKey = '22222222-2222-4222-8222-222222222222';
const stop = { key, placeId: '111111111111111111111111', kind: 'visit' as const, note: 'Giả Lập', manualStart: '09:00' };
const days: TemplateDayInput[] = [{ startTime: '07:00', stops: [stop, { ...stop, key: nextKey }] }, { startTime: '08:00', stops: [] }];
describe('template day/stop operations', () => {
  it('adds distinct stops and preserves original days', () => {
    const added = addStop(days, 1, stop.placeId, '33333333-3333-4333-8333-333333333333');
    expect(added[1]?.stops).toHaveLength(1);
    expect(days[1]?.stops).toHaveLength(0);
    expect(addStop(days, -1, stop.placeId, key)).toEqual(days);
  });
  it('moves within and between days preserving manual edits/notes, and rejects invalid destinations', () => {
    expect(moveStop(days, key, 0, 2)[0]?.stops.map((s) => s.key)).toEqual([nextKey, key]);
    const moved = moveStop(days, key, 1, 0);
    expect(moved[0]?.stops).toHaveLength(1);
    expect(moved[1]?.stops[0]).toEqual(stop);
    expect(moveStop(days, key, 7, 0)).toEqual(days);
    const full = [...days, { startTime: '07:00', stops: Array.from({ length: 20 }, (_, i) => ({ ...stop, key: String(i) })) }];
    expect(moveStop(full, key, 2, 0)).toEqual(full);
  });
  it('removes a stop, replaces its place while retaining edits and bounds day count', () => {
    expect(removeStop(days, key)[0]?.stops.map((s) => s.key)).toEqual([nextKey]);
    expect(replaceStop(days, key, '222222222222222222222222')[0]?.stops[0]).toEqual({ ...stop, placeId: '222222222222222222222222' });
    expect(addDay(days)).toHaveLength(3);
    expect(addDay(Array.from({ length: 5 }, () => days[1]!))).toHaveLength(5);
    expect(removeDay(days, 1)).toHaveLength(1);
    expect(removeDay([days[0]!], 0)).toHaveLength(1);
  });
});
