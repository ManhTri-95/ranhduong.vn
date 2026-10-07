import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed } from '../../testing/fixtures';
import { CitiesModule } from './cities.module';
import { CitiesService } from './cities.service';

describe('GET /v1/cities/:city', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp([CitiesModule]);
    const cities = t.app.get(CitiesService);
    await cities.applySeed(fakeCitySeed());
    await cities.applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-tat', active: false }));
  });
  afterAll(async () => {
    await t.close();
  });

  it('trả thông tin công khai và các cụm theo thứ tự seed, không lộ _id', async () => {
    const res = await fetch(`${t.url}/cities/thanh-pho-gia-lap`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      slug: 'thanh-pho-gia-lap',
      name: 'Thành phố Giả Lập',
      accent: '#123456',
      center: { type: 'Point', coordinates: [0.5, 0.5] },
      mapBounds: [0, 0, 1, 1],
      zones: [
        { slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A' },
        { slug: 'cum-gia-lap-b', name: 'Cụm Giả Lập B' },
      ],
    });
  });

  it('thành phố không có hoặc đang tắt thì 404 NOT_FOUND', async () => {
    for (const slug of ['khong-co', 'thanh-pho-gia-lap-tat']) {
      const res = await fetch(`${t.url}/cities/${slug}`);
      expect(res.status, slug).toBe(404);
      expect(await res.json(), slug).toEqual({ code: 'NOT_FOUND', message: 'Không tìm thấy thành phố' });
    }
  });

  it('slug sai định dạng thì 400 VALIDATION_FAILED', async () => {
    const res = await fetch(`${t.url}/cities/Da%20Lat`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
