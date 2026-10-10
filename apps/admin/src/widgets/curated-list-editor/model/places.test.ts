import { describe, expect, it } from 'vitest';
import { addPlace, movePlace, removePlace, filterCandidates } from './places';
describe('curated place order and picker', () => {
  it('adds once, respects capacity and removes by ID', () => {
    expect(addPlace(['b', 'a'], 'a')).toEqual(['b', 'a']);
    expect(addPlace(['b'], 'a')).toEqual(['b', 'a']);
    const full = Array.from({ length: 50 }, (_, i) => String(i));
    expect(addPlace(full, 'extra')).toEqual(full);
    expect(removePlace(['b', 'a'], 'b')).toEqual(['a']);
  });
  it('moves within bounds without mutating the current list', () => {
    const original = ['b', 'a', 'c'];
    expect(movePlace(original, 1, -1)).toEqual(['a', 'b', 'c']);
    expect(movePlace(original, 0, 1)).toEqual(['a', 'b', 'c']);
    for (const [index, direction] of [[0, -1], [2, 1], [-1, 1], [3, -1]] as const) expect(movePlace(original, index, direction)).toEqual(original);
    expect(original).toEqual(['b', 'a', 'c']);
  });
  it('searches without accents and excludes selected and inactive places', () => {
    const places = [{ id: 'a', name: 'Cà phê Giả Lập', status: 'active' }, { id: 'b', name: 'Cà phê Giả Lập 2', status: 'hidden' }, { id: 'c', name: 'Quán Giả Lập', status: 'active' }];
    expect(filterCandidates(places, [], 'ca phe').map((p) => p.id)).toEqual(['a']);
    expect(filterCandidates(places, ['a'], '').map((p) => p.id)).toEqual(['c']);
  });
});
