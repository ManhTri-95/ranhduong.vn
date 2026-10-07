import type { PlaceListResponse } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { FAKE_PHOTO, fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { PlacesModule } from './places.module';

const CITY = 'thanh-pho-gia-lap';

describe('GET /v1/cities/:city/places', () => {
  let t: TestApp;
  let cityId: string;
  let zoneAId: Types.ObjectId;

  const places = () => t.conn.collection('places');
  const get = async (path: string) => {
    const res = await fetch(`${t.url}${path}`);
    return { status: res.status, body: (await res.json()) as unknown };
  };
  const slugs = (body: unknown) => (body as PlaceListResponse).items.map((p) => p.slug);

  beforeAll(async () => {
    t = await createTestApp([PlacesModule]);
    cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId;
    const zone = await t.conn.collection('zones').findOne({ cityId: new Types.ObjectId(cityId), slug: 'cum-gia-lap-a' });
    if (!zone) throw new Error('Thiếu cụm giả lập A');
    zoneAId = zone._id;
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await places().deleteMany({});
  });

  it('chỉ trả địa điểm active của thành phố; quán đã xác nhận trước, rồi xác minh gần nhất', async () => {
    const otherCityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-hai' }))).cityId;
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'a-admin-moi', verifySource: 'admin', lastVerifiedAt: new Date('2026-10-05') }),
      fakePlaceDoc(cityId, { slug: 'b-owner-cu', verifySource: 'owner', lastVerifiedAt: new Date('2026-09-01') }),
      fakePlaceDoc(cityId, { slug: 'c-chua-xac-minh' }),
      fakePlaceDoc(cityId, { slug: 'd-owner-moi', verifySource: 'owner', lastVerifiedAt: new Date('2026-10-01') }),
      ...['draft', 'suspected', 'hidden', 'closed', 'merged'].map((status) => fakePlaceDoc(cityId, { slug: `an-${status}`, status })),
      fakePlaceDoc(otherCityId, { slug: 'cua-thanh-pho-khac' }),
    ]);
    const { status, body } = await get(`/cities/${CITY}/places`);
    expect(status).toBe(200);
    expect(slugs(body)).toEqual(['d-owner-moi', 'b-owner-cu', 'a-admin-moi', 'c-chua-xac-minh']);
  });

  it('đổi bản ghi thành thẻ: tên cụm, câu ghi chú đầu, nhãn chưa xác nhận, ảnh đầu tiên, giờ mở cửa', async () => {
    await places().insertOne(
      fakePlaceDoc(cityId, {
        zoneId: zoneAId,
        practicalNotes: 'Câu ghi chú giả lập thứ nhất. Câu thứ hai.',
        verifySource: 'admin',
        openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
        photos: [{ key: 'gia-lap/anh-1', ...FAKE_PHOTO }, { key: 'gia-lap/anh-2', ...FAKE_PHOTO }],
      }),
    );
    const { body } = await get(`/cities/${CITY}/places`);
    expect((body as PlaceListResponse).items).toEqual([
      {
        slug: 'quan-gia-lap',
        name: 'Quán Giả Lập',
        category: 'cafe',
        zoneName: 'Cụm Giả Lập A',
        note: 'Câu ghi chú giả lập thứ nhất.',
        openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
        unconfirmed: true,
        coverKey: 'gia-lap/anh-1',
      },
    ]);
  });

  it('lọc nhiều danh mục và giới hạn số kết quả', async () => {
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'cafe-1', verifySource: 'owner' }),
      fakePlaceDoc(cityId, { slug: 'cafe-2' }),
      fakePlaceDoc(cityId, { slug: 'food-1', category: 'food', verifySource: 'owner' }),
      fakePlaceDoc(cityId, { slug: 'tham-quan-1', category: 'attraction', verifySource: 'owner' }),
    ]);
    expect(slugs((await get(`/cities/${CITY}/places?category=cafe,food`)).body)).toEqual(['cafe-1', 'food-1', 'cafe-2']);
    expect(slugs((await get(`/cities/${CITY}/places?category=cafe,food&limit=2`)).body)).toEqual(['cafe-1', 'food-1']);
  });

  it('tìm không dấu theo tên, tên khác và tên danh mục', async () => {
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'ca-phe-gia-lap-may', name: 'Cà phê Giả Lập Mây' }),
      fakePlaceDoc(cityId, { slug: 'quan-gia-lap-suong', name: 'Quán Giả Lập Sương', category: 'food', aliases: ['Sương Sớm Giả Lập'] }),
      fakePlaceDoc(cityId, { slug: 'doi-gia-lap', name: 'Đồi Giả Lập', category: 'attraction' }),
    ]);
    const search = async (q: string) => slugs((await get(`/cities/${CITY}/places?q=${encodeURIComponent(q)}`)).body);
    expect(await search('ca phe gia lap may')).toEqual(['ca-phe-gia-lap-may']);
    expect(await search('MÂY')).toEqual(['ca-phe-gia-lap-may']);
    expect(await search('som')).toEqual(['quan-gia-lap-suong']);
    expect(await search('doi')).toEqual(['doi-gia-lap']);
    expect(await search('khong co gi')).toEqual([]);
  });

  it('thành phố không có hoặc đang tắt thì 404 NOT_FOUND', async () => {
    await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-tat', active: false }));
    for (const slug of ['khong-co', 'thanh-pho-gia-lap-tat']) {
      const { status, body } = await get(`/cities/${slug}/places`);
      expect(status, slug).toBe(404);
      expect(body, slug).toMatchObject({ code: 'NOT_FOUND' });
    }
  });

  it('tham số sai thì 400 VALIDATION_FAILED kèm chỗ sai', async () => {
    for (const qs of ['limit=0', 'limit=51', 'limit=abc', 'category=bar', `q=${'a'.repeat(101)}`]) {
      const { status, body } = await get(`/cities/${CITY}/places?${qs}`);
      expect(status, qs).toBe(400);
      expect(body, qs).toMatchObject({ code: 'VALIDATION_FAILED', details: expect.any(Array) });
    }
    expect((await get('/cities/Da%20Lat/places')).status).toBe(400);
  });
});
