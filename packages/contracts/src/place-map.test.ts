import { describe, expect, it } from 'vitest';
import { PlaceListQuery } from './place.js';

describe('S12 geographic place query', () => {
  it('reads bbox as west,south,east,north and supports cursor pages', () => {
    expect(PlaceListQuery.parse({ bbox: '0.1, 0.2,0.8,0.9', cursor: '0.-.fake', limit: '50' })).toMatchObject({
      bbox: [0.1, 0.2, 0.8, 0.9], limit: 50,
    });
  });
  it.each(['', '0,0,1', '0,0,1,1,2', '0,,1,1', '0,0,NaN,1', '1,0,0,1', '0,1,1,0', '-181,0,1,1', '0,0,1,91'])('rejects malformed bbox %s', (bbox) => {
    expect(PlaceListQuery.safeParse({ bbox }).success).toBe(false);
  });
  it('reads near as lat,lng and requires a radius in metres', () => {
    expect(PlaceListQuery.parse({ near: '0.2,0.3', radius: '1000' })).toMatchObject({ near: [0.3, 0.2], radius: 1000 });
  });
  it.each([
    { near: '0.2,0.3' }, { radius: '1000' }, { near: '0.2,0.3', radius: '0' },
    { near: '0.2,0.3', radius: '50001' }, { near: '91,0.3', radius: '1000' },
    { near: '0.2,0.3', radius: '1000', bbox: '0,0,1,1' },
  ])('rejects incompatible geographic query %o', (query) => {
    expect(PlaceListQuery.safeParse(query).success).toBe(false);
  });
});
