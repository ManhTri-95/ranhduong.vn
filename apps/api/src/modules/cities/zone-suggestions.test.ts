import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed } from '../../testing/fixtures';
import { CitiesModule } from './cities.module';
import { CitiesService } from './cities.service';

// Thành phố giả: cụm A là ô [0.1, 0.4], cụm B là ô [0.6, 0.9] (testing/fixtures.ts).
describe('CitiesService.zoneSuggestions', () => {
  let t: TestApp;
  let cities: CitiesService;

  beforeAll(async () => {
    t = await createTestApp([CitiesModule]);
    cities = t.app.get(CitiesService);
    await cities.applySeed(fakeCitySeed());
  });
  afterAll(async () => {
    await t.close();
  });

  it('điểm trong cụm A: gợi ý A', async () => {
    expect(await cities.zoneSuggestions('thanh-pho-gia-lap', [0.2, 0.2])).toEqual({ zones: [{ slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A' }] });
  });
  it('điểm ngoài mọi cụm: cụm gần nhất', async () => {
    expect((await cities.zoneSuggestions('thanh-pho-gia-lap', [0.95, 0.95])).zones.map((z) => z.slug)).toEqual(['cum-gia-lap-b']);
    expect((await cities.zoneSuggestions('thanh-pho-gia-lap', [0.45, 0.42])).zones.map((z) => z.slug)).toEqual(['cum-gia-lap-a']);
  });
  it('thành phố không có: 404', async () => {
    await expect(cities.zoneSuggestions('thanh-pho-khong-co', [0.2, 0.2])).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
  });
});
