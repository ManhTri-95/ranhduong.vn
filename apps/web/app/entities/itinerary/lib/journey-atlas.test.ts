import { describe, expect, it } from 'vitest';
import type { ItineraryPublicStop } from '@ranhduong/contracts';
import { atlasCover, atlasDays, atlasSelection } from './journey-atlas';

function stop(key: string, number: number, photo?: string): ItineraryPublicStop {
  return { key, number, start: '08:00', end: '09:00', travelMinFromPrev: 0, kind: 'visit', note: '',
    place: photo ? { slug: 'quan-gia-lap', name: 'Quán Giả Lập', category: 'cafe', alsoCategories: [], unconfirmed: true, coverKey: photo } : null };
}

describe('Journey Atlas presentation', () => {
  it('numbers each day in backend array order, preserving keys and unavailable slots without mutation', () => {
    const original = [{ day: 2, stops: [stop('stable-b', 7), stop('stable-a', 3)] }, { day: 4, stops: [stop('repeat-visit', 8)] }];
    const days = atlasDays(original);
    expect(days.map(day => [day.day, day.stops.map(item => [item.key, item.number])])).toEqual([
      [2, [['stable-b', 1], ['stable-a', 2]]], [4, [['repeat-visit', 1]]],
    ]);
    expect(original[0]?.stops[0]?.number).toBe(7);
    expect(days[0]?.stops[0]?.place).toBeNull();
  });

  it('retains an explicitly selected stop only within its selected day', () => {
    const days = atlasDays([{ day: 2, stops: [stop('a', 1), stop('b', 2)] }, { day: 3, stops: [stop('c', 1)] }]);
    expect(atlasSelection(days, 2, 'b')).toEqual({ day: 2, key: 'b' });
    expect(atlasSelection(days, 3, 'b')).toEqual({ day: 3, key: 'c' });
    expect(atlasSelection(days, 9, 'missing')).toEqual({ day: 2, key: 'a' });
  });

  it('supports empty schedules and nonconsecutive day values without inventing a stop', () => {
    expect(atlasSelection([{ day: 4, stops: [] }], 4, 'missing')).toEqual({ day: 4, key: null });
    expect(atlasSelection([], 1, null)).toEqual({ day: 1, key: null });
    expect(atlasCover([{ day: 4, stops: [] }])).toBeNull();
  });

  it('uses the first actual place cover, preserving repeat-visit identity', () => {
    const photo = stop('first-visit', 3, 'real/cover');
    const days = atlasDays([{ day: 1, stops: [stop('unavailable', 1), photo, { ...photo, key: 'second-visit' }] }]);
    expect(atlasCover(days)).toMatchObject({ key: 'first-visit', place: { coverKey: 'real/cover' } });
    expect(days[0]?.stops.map(item => item.key)).toEqual(['unavailable', 'first-visit', 'second-visit']);
  });
});
