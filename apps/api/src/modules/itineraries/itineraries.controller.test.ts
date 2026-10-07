import type { ItineraryCardList } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { FAKE_PHOTO, fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { ItinerariesModule } from './itineraries.module';

const CITY = 'thanh-pho-gia-lap';

describe('GET /v1/cities/:city/itineraries/templates', () => {
  let t: TestApp;
  let cityId: string;

  const itineraries = () => t.conn.collection('itineraries');
  const get = async (path: string) => {
    const res = await fetch(`${t.url}${path}`);
    return { status: res.status, body: (await res.json()) as unknown };
  };
  const stop = (placeId: Types.ObjectId) => ({ placeId, start: '08:00', end: '09:00', travelMinFromPrev: 0, locked: false, isVip: false, kind: 'visit' });
  // Lịch trình giả, tên rõ là giả.
  const template = (overrides: Record<string, unknown> = {}) => ({
    cityId: new Types.ObjectId(cityId),
    kind: 'template',
    slug: 'lich-trinh-gia-lap',
    title: 'Lịch trình Giả Lập',
    params: { days: 1, transport: 'motorbike', pace: 'relaxed', tags: [] },
    days: [],
    visibility: 'public',
    status: 'published',
    createdAt: new Date('2026-10-01'),
    ...overrides,
  });

  beforeAll(async () => {
    t = await createTestApp([ItinerariesModule]);
    cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId;
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await itineraries().deleteMany({});
    await t.conn.collection('places').deleteMany({});
  });

  it('chỉ trả lịch trình mẫu đã công khai của thành phố, mới tạo trước', async () => {
    const otherCityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-hai' }))).cityId;
    await itineraries().insertMany([
      template({ slug: 'cu', createdAt: new Date('2026-10-01') }),
      template({ slug: 'moi', createdAt: new Date('2026-10-05'), params: { days: 3, transport: 'car', pace: 'packed', tags: [] } }),
      template({ slug: 'nhap', status: 'draft' }),
      template({ slug: 'cua-khach', kind: 'user' }),
      template({ slug: undefined }),
      template({ slug: 'thanh-pho-khac', cityId: new Types.ObjectId(otherCityId) }),
    ]);
    const { status, body } = await get(`/cities/${CITY}/itineraries/templates`);
    expect(status).toBe(200);
    expect((body as ItineraryCardList).items).toEqual([
      { slug: 'moi', title: 'Lịch trình Giả Lập', days: 3, transport: 'car', pace: 'packed' },
      { slug: 'cu', title: 'Lịch trình Giả Lập', days: 1, transport: 'motorbike', pace: 'relaxed' },
    ]);
  });

  it('ảnh bìa là ảnh đầu tiên của điểm dừng đầu tiên có ảnh; bỏ qua điểm chưa active', async () => {
    const draftWithPhoto = new Types.ObjectId();
    const activeNoPhoto = new Types.ObjectId();
    const activeWithPhoto = new Types.ObjectId();
    await t.conn.collection('places').insertMany([
      fakePlaceDoc(cityId, { _id: draftWithPhoto, slug: 'nhap-co-anh', status: 'draft', photos: [{ key: 'anh-nhap', ...FAKE_PHOTO }] }),
      fakePlaceDoc(cityId, { _id: activeNoPhoto, slug: 'khong-anh' }),
      fakePlaceDoc(cityId, { _id: activeWithPhoto, slug: 'co-anh', photos: [{ key: 'anh-dung', ...FAKE_PHOTO }] }),
    ]);
    await itineraries().insertMany([
      template({ slug: 'co-bia', days: [{ day: 1, zoneIds: [], stops: [stop(draftWithPhoto), stop(activeNoPhoto), stop(activeWithPhoto)] }] }),
      template({ slug: 'khong-bia', createdAt: new Date('2026-09-01'), days: [{ day: 1, zoneIds: [], stops: [stop(activeNoPhoto)] }] }),
    ]);
    const items = ((await get(`/cities/${CITY}/itineraries/templates`)).body as ItineraryCardList).items;
    expect(items.map((i) => [i.slug, i.coverKey])).toEqual([['co-bia', 'anh-dung'], ['khong-bia', undefined]]);
  });

  it('bỏ qua bản ghi hỏng thay vì làm hỏng cả danh sách', async () => {
    await itineraries().insertMany([
      template({ slug: 'hong', params: { days: 9, transport: 'motorbike', pace: 'relaxed' }, createdAt: new Date('2026-10-05') }),
      template({ slug: 'tot' }),
    ]);
    const { status, body } = await get(`/cities/${CITY}/itineraries/templates`);
    expect(status).toBe(200);
    expect((body as ItineraryCardList).items.map((i) => i.slug)).toEqual(['tot']);
  });

  it('limit cắt danh sách; limit sai thì 400; thành phố không có thì 404', async () => {
    await itineraries().insertMany([
      template({ slug: 'mot', createdAt: new Date('2026-10-01') }),
      template({ slug: 'hai', createdAt: new Date('2026-10-02') }),
      template({ slug: 'ba', createdAt: new Date('2026-10-03') }),
    ]);
    expect(((await get(`/cities/${CITY}/itineraries/templates?limit=2`)).body as ItineraryCardList).items.map((i) => i.slug)).toEqual(['ba', 'hai']);
    expect(await get(`/cities/${CITY}/itineraries/templates?limit=21`)).toMatchObject({ status: 400, body: { code: 'VALIDATION_FAILED' } });
    expect(await get('/cities/khong-co/itineraries/templates')).toMatchObject({ status: 404, body: { code: 'NOT_FOUND' } });
  });
});
