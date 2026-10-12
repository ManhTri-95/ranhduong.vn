import { describe, expect, it } from 'vitest';
import { newSeason, moveSeason, seasonInput } from './form';

describe('season editor form', () => {
  it('starts presets without claiming exact seasonal dates', () => {
    const flower = newSeason('cherry-blossom');
    expect(flower).toMatchObject({ key: 'mai-anh-dao', kind: 'flower', accent: '#E58FA8', from: '', to: '', featuredItineraryId: '' });
    expect(newSeason('rain')).toMatchObject({ kind: 'rain', accent: '#8DB3CF' });
  });
  it('retains featured IDs when moving seasons and removes empty optional values before validation', () => {
    const rows = [{ ...newSeason(), key: 'a', featuredItineraryId: '0123456789abcdef01234567' }, { ...newSeason(), key: 'b' }];
    const moved = moveSeason(rows, 1, 0);
    expect(moved.map((row) => row.key)).toEqual(['b', 'a']);
    expect(moved[1]?.featuredItineraryId).toBe('0123456789abcdef01234567');
    expect(rows[0]?.key).toBe('a');
    expect(seasonInput({ seasons: moved, updatedAt: '2026-10-12T00:00:00.000Z' }).seasons[0]).not.toHaveProperty('featuredItineraryId');
  });
});
