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

  it('danh mục phụ: trang Ăn uống có quán cà phê có đồ ăn, quán chỉ cà phê thì không; lọc nhiều danh mục không lặp; tìm "an uong"', async () => {
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'cafe-co-com', category: 'cafe', alsoCategories: ['food'], verifySource: 'owner' }),
      fakePlaceDoc(cityId, { slug: 'cafe-thuan', category: 'cafe' }),
      fakePlaceDoc(cityId, { slug: 'quan-an', category: 'food' }),
    ]);
    const food = (await get(`/cities/${CITY}/places?category=food`)).body as PlaceListResponse;
    expect(food.items.map((p) => p.slug).sort()).toEqual(['cafe-co-com', 'quan-an']);
    expect(food.items.find((p) => p.slug === 'cafe-co-com')?.alsoCategories).toEqual(['food']);
    expect(slugs((await get(`/cities/${CITY}/places?category=cafe,food`)).body).sort()).toEqual(['cafe-co-com', 'cafe-thuan', 'quan-an']);
    const found = slugs((await get(`/cities/${CITY}/places?q=${encodeURIComponent('an uong')}`)).body);
    expect(found).toEqual(expect.arrayContaining(['cafe-co-com', 'quan-an']));
    expect(found).not.toContain('cafe-thuan');
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

  it('S13 gõ ca phe may ra tên có dấu, khớp tiền tố và thẻ; gợi ý chỉ lấy 6 active trong thành phố', async () => {
    const otherCityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-hai' }))).cityId;
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'ca-phe-may-gia-lap', name: 'Cà phê Mây (Giả Lập)', tags: ['an-sang'] }),
      ...Array.from({ length: 7 }, (_, i) => fakePlaceDoc(cityId, { slug: `may-gia-lap-${i}`, name: `Quán Mây Giả Lập ${i}` })),
      ...['draft', 'hidden', 'closed', 'suspected', 'merged'].map((status) => fakePlaceDoc(cityId, { slug: `may-${status}`, name: 'Cà phê Mây Giả Lập Riêng Tư', status })),
      fakePlaceDoc(otherCityId, { slug: 'may-thanh-pho-khac', name: 'Cà phê Mây Giả Lập Khác' }),
    ]);
    for (const q of ['ca phe may', 'CÀ PHÊ MÂY', 'ca ph ma', 'may an sang']) {
      const response = await get(`/cities/${CITY}/places?q=${encodeURIComponent(q)}&limit=6`);
      expect(response.status).toBe(200);
      expect(slugs(response.body)[0], q).toBe('ca-phe-may-gia-lap');
      expect(slugs(response.body)).not.toContain('may-thanh-pho-khac');
      expect((response.body as PlaceListResponse).nextCursor).toBeUndefined();
    }
    expect(slugs((await get(`/cities/${CITY}/places?q=may&limit=6`)).body)).toHaveLength(6);
    expect(slugs((await get(`/cities/${CITY}/places?q=%28.*%29&limit=6`)).body)).toEqual([]);
  });

  it('lọc theo cụm, kết hợp được với danh mục; cụm không có hoặc của thành phố khác thì 404 NOT_FOUND', async () => {
    const zoneB = await t.conn.collection('zones').findOne({ cityId: new Types.ObjectId(cityId), slug: 'cum-gia-lap-b' });
    if (!zoneB) throw new Error('Thiếu cụm giả lập B');
    await t.conn.collection('zones').insertOne({
      cityId: new Types.ObjectId(),
      slug: 'cum-cua-thanh-pho-khac',
      name: 'Cụm Giả Lập Khác',
      area: { type: 'Polygon', coordinates: [[[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1], [0, 0]]] },
    });
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'o-cum-a', zoneId: zoneAId }),
      fakePlaceDoc(cityId, { slug: 'o-cum-a-an', zoneId: zoneAId, category: 'food' }),
      fakePlaceDoc(cityId, { slug: 'o-cum-b', zoneId: zoneB._id }),
      fakePlaceDoc(cityId, { slug: 'chua-co-cum' }),
    ]);
    expect(slugs((await get(`/cities/${CITY}/places?zone=cum-gia-lap-a`)).body)).toEqual(['o-cum-a', 'o-cum-a-an']);
    expect(slugs((await get(`/cities/${CITY}/places?zone=cum-gia-lap-a&category=food`)).body)).toEqual(['o-cum-a-an']);
    for (const zone of ['khong-co', 'cum-cua-thanh-pho-khac']) {
      const { status, body } = await get(`/cities/${CITY}/places?zone=${zone}`);
      expect(status, zone).toBe(404);
      expect(body, zone).toMatchObject({ code: 'NOT_FOUND' });
    }
  });

  it('lọc nhiều thẻ (phải có đủ mọi thẻ); kèm số chỗ theo thẻ của cả danh mục, trước khi lọc thẻ', async () => {
    await places().insertMany([
      fakePlaceDoc(cityId, { slug: 'co-ca-hai', tags: ['view-doi', 'chill'] }),
      fakePlaceDoc(cityId, { slug: 'chi-chill', tags: ['chill', 'chill'] }),
      fakePlaceDoc(cityId, { slug: 'khong-the' }),
      fakePlaceDoc(cityId, { slug: 'quan-an', category: 'food', tags: ['dac-san'] }),
      fakePlaceDoc(cityId, { slug: 'nhap', status: 'draft', tags: ['chill'] }),
    ]);
    const { body } = await get(`/cities/${CITY}/places?category=cafe&tags=chill,view-doi`);
    expect(slugs(body)).toEqual(['co-ca-hai']);
    expect((body as PlaceListResponse).tags).toEqual([
      { slug: 'chill', count: 2 },
      { slug: 'view-doi', count: 1 },
    ]);
    expect(slugs((await get(`/cities/${CITY}/places?category=cafe&tags=chill`)).body)).toEqual(['chi-chill', 'co-ca-hai']);
    expect(slugs((await get(`/cities/${CITY}/places?tags=khong-ai-co`)).body)).toEqual([]);
  });

  it('phân trang cursor: đi hết trang không trùng, không sót; chỗ mới chen vào và chỗ ở cursor bị ẩn giữa hai lần gọi', async () => {
    // Thứ tự nổi bật: trang-a (xác minh 10/10) … trang-e (6/10).
    await places().insertMany(
      ['a', 'b', 'c', 'd', 'e'].map((s, i) =>
        fakePlaceDoc(cityId, { slug: `trang-${s}`, verifySource: 'admin', lastVerifiedAt: new Date(Date.UTC(2026, 9, 10 - i)) }),
      ),
    );
    const first = (await get(`/cities/${CITY}/places?limit=2`)).body as PlaceListResponse;
    expect(slugs(first)).toEqual(['trang-a', 'trang-b']);
    expect(first.nextCursor).toEqual(expect.any(String));

    // Giữa hai lần bấm "Xem thêm": một chỗ mới xác minh (đứng đầu danh sách), chỗ ở cursor bị ẩn.
    await places().insertOne(
      fakePlaceDoc(cityId, { slug: 'moi-xac-minh', verifySource: 'admin', lastVerifiedAt: new Date(Date.UTC(2026, 9, 11)) }),
    );
    await places().updateOne({ cityId: new Types.ObjectId(cityId), slug: 'trang-b' }, { $set: { status: 'hidden' } });

    const second = (await get(`/cities/${CITY}/places?limit=2&cursor=${first.nextCursor ?? ''}`)).body as PlaceListResponse;
    expect(slugs(second)).toEqual(['trang-c', 'trang-d']);
    const third = (await get(`/cities/${CITY}/places?limit=2&cursor=${second.nextCursor ?? ''}`)).body as PlaceListResponse;
    expect(slugs(third)).toEqual(['trang-e']);
    expect(third.nextCursor).toBeUndefined();
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
    const elevenTags = Array.from({ length: 11 }, (_, i) => `the-${i}`).join(',');
    for (const qs of [
      'limit=0',
      'limit=51',
      'limit=abc',
      'category=bar',
      `q=${'a'.repeat(101)}`,
      'tags=View-Doi',
      `tags=${elevenTags}`,
      // Express gộp khoá lặp thành mảng; API chỉ nhận một chuỗi cách nhau dấu phẩy.
      'tags=chill&tags=view-doi',
      'zone=Trung%20Tam',
      'cursor=abc',
      'cursor=2.-.a',
      'q=gia&cursor=1.-.a',
    ]) {
      const { status, body } = await get(`/cities/${CITY}/places?${qs}`);
      expect(status, qs).toBe(400);
      expect(body, qs).toMatchObject({ code: 'VALIDATION_FAILED', details: expect.any(Array) });
    }
    expect((await get('/cities/Da%20Lat/places')).status).toBe(400);
  });
});
