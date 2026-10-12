import { describe, expect, it } from 'vitest';
import type { CitySeason } from './city.js';
import { selectCitySeason } from './city-season.js';

const flower: CitySeason = { key: 'mai-anh-dao', from: '12-20', to: '02-28', accent: '#E58FA8', title: 'Mùa hoa Giả Lập', sub: 'Mô tả Giả Lập', illustration: 'cherry-blossom' };
const at = (day: string) => new Date(`${day}T05:00:00Z`);
const select = (seasons: CitySeason[], date: Date) => selectCitySeason(seasons, date, 'Asia/Ho_Chi_Minh');

describe('selectCitySeason', () => {
  it('uses the city default when no season matches', () => {
    expect(select([], at('2026-01-01'))).toBeNull();
    expect(select([flower], at('2026-03-01'))).toBeNull();
  });
  it.each(['2026-12-20', '2026-12-31', '2027-01-01', '2027-02-28'])('includes %s in a season crossing New Year', (day) => {
    expect(select([flower], at(day))?.key).toBe('mai-anh-dao');
  });
  it('uses the Vietnamese date before midnight UTC', () => {
    const season = { ...flower, from: '10-20', to: '12-10' };
    expect(select([season], new Date('2026-10-19T16:59:59Z'))).toBeNull();
    expect(select([season], new Date('2026-10-19T17:00:00Z'))?.key).toBe('mai-anh-dao');
  });
  it('treats equal endpoints as one day, including leap day only when it exists', () => {
    const season = { ...flower, from: '02-29', to: '02-29' };
    expect(select([season], at('2028-02-29'))?.key).toBe('mai-anh-dao');
    expect(select([season], at('2026-02-28'))).toBeNull();
    expect(select([season], at('2026-03-01'))).toBeNull();
  });
  it('prioritizes flowers over rain regardless of array order and preserves the input', () => {
    const rain: CitySeason = { ...flower, key: 'mua-mua', from: '05-01', to: '10-31', kind: 'rain' };
    const seasonalFlower: CitySeason = { ...flower, key: 'hoa-gia-lap', from: '10-20', to: '12-10', kind: 'flower' };
    const seasons = [rain, seasonalFlower];
    expect(select(seasons, at('2026-10-25'))?.key).toBe('hoa-gia-lap');
    expect(seasons.map((s) => s.key)).toEqual(['mua-mua', 'hoa-gia-lap']);
  });
  it('recognizes old flower keys and preserves ordering within a priority group', () => {
    const rain = { ...flower, key: 'mua-mua', from: '01-01', to: '12-31' };
    expect(select([rain, flower, { ...flower, key: 'da-quy' }], at('2026-01-05'))?.key).toBe('mai-anh-dao');
  });
});
