import { describe, expect, it } from 'vitest';
import { CitySeed } from './city.js';

const square = (w: number, s: number, e: number, n: number) => ({
  type: 'Polygon',
  coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
});

// Thành phố và cụm giả lập quanh [0, 0], tên rõ là giả.
const SEED = {
  city: {
    slug: 'thanh-pho-gia-lap',
    name: 'Thành phố Giả Lập',
    center: { type: 'Point', coordinates: [0.5, 0.5] },
    timezone: 'Asia/Ho_Chi_Minh',
    active: true,
    accent: '#123456',
    mapBounds: [0, 0, 1, 1],
  },
  zones: [
    { slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A', area: square(0.1, 0.1, 0.4, 0.4) },
    { slug: 'cum-gia-lap-b', name: 'Cụm Giả Lập B', area: square(0.6, 0.6, 0.9, 0.9) },
  ],
};

const issuePaths = (input: unknown) => {
  const result = CitySeed.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.path);
};

describe('CitySeed', () => {
  it('nhận seed hợp lệ, seasons mặc định rỗng', () => {
    const seed = CitySeed.parse(SEED);
    expect(seed.city.seasons).toEqual([]);
    expect(seed.zones).toHaveLength(2);
  });
  it('từ chối hai cụm trùng slug', () => {
    const zones = [SEED.zones[0], { ...SEED.zones[1], slug: 'cum-gia-lap-a' }];
    expect(issuePaths({ ...SEED, zones })).toContainEqual(['zones', 1, 'slug']);
  });
  it('từ chối tâm thành phố nằm ngoài khung bản đồ', () => {
    const city = { ...SEED.city, center: { type: 'Point', coordinates: [2, 0.5] } };
    expect(issuePaths({ ...SEED, city })).toContainEqual(['city', 'center']);
  });
  it('từ chối cụm có đỉnh nằm ngoài khung bản đồ', () => {
    const zones = [{ ...SEED.zones[0], area: square(0.1, 0.1, 1.5, 0.4) }, SEED.zones[1]];
    expect(issuePaths({ ...SEED, zones })).toContainEqual(['zones', 0, 'area']);
  });
  it('adjacentZones mặc định rỗng', () => {
    expect(CitySeed.parse(SEED).zones[0]?.adjacentZones).toEqual([]);
  });
  it('nhận bảng kề đối xứng', () => {
    const zones = [{ ...SEED.zones[0], adjacentZones: ['cum-gia-lap-b'] }, { ...SEED.zones[1], adjacentZones: ['cum-gia-lap-a'] }];
    expect(CitySeed.safeParse({ ...SEED, zones }).success).toBe(true);
  });
  it.each([
    ['cụm không có trong seed', ['cum-gia-lap-x'], ['cum-gia-lap-a']],
    ['kề chính nó', ['cum-gia-lap-a'], []],
    ['lặp cụm kề', ['cum-gia-lap-b', 'cum-gia-lap-b'], ['cum-gia-lap-a']],
    ['chỉ kề một chiều', ['cum-gia-lap-b'], []],
  ])('từ chối bảng kề có %s', (_, a, b) => {
    const zones = [{ ...SEED.zones[0], adjacentZones: a }, { ...SEED.zones[1], adjacentZones: b }];
    expect(issuePaths({ ...SEED, zones })).toContainEqual(['zones', 0, 'adjacentZones']);
  });
  it('từ chối múi giờ khác Asia/Ho_Chi_Minh và seed không có cụm nào', () => {
    expect(CitySeed.safeParse({ ...SEED, city: { ...SEED.city, timezone: 'Asia/Bangkok' } }).success).toBe(false);
    expect(CitySeed.safeParse({ ...SEED, zones: [] }).success).toBe(false);
  });
});
