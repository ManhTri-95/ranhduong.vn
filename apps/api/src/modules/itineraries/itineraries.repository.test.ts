import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { ItinerariesRepository } from './itineraries.repository';
import { ITINERARY_MODEL, ItinerarySchema, type ItineraryModel } from './schemas/itinerary.schema';

// Dữ liệu giả, tên rõ là giả.
const fakeItinerary = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  cityId: new Types.ObjectId(),
  kind: 'template',
  title: 'Lịch trình Giả Lập',
  params: { days: 1, transport: 'motorbike', pace: 'relaxed' },
  ...overrides,
});

describe('ItinerarySchema và ItinerariesRepository', () => {
  let conn: Connection;
  let model: ItineraryModel;
  let repo: ItinerariesRepository;
  const insert = (doc: Record<string, unknown>) => new model(doc).save();

  beforeAll(async () => {
    conn = await connectTestDb();
    model = conn.model(ITINERARY_MODEL, ItinerarySchema);
    repo = new ItinerariesRepository(model);
    await repo.ensureIndexes();
  });
  afterAll(async () => {
    await dropTestDb(conn);
  });
  beforeEach(async () => {
    await model.deleteMany({});
  });

  it('ensureIndexes tạo index {cityId, kind, slug} unique cho bản có slug', async () => {
    const byName = new Map((await model.listIndexes()).map((i) => [i.name, i]));
    expect(byName.get('cityId_1_kind_1_slug_1')).toMatchObject({
      key: { cityId: 1, kind: 1, slug: 1 },
      unique: true,
      partialFilterExpression: { slug: { $type: 'string' } },
    });
  });

  it('chặn hai lịch trình mẫu trùng slug trong một thành phố; nhiều bản không có slug vẫn được', async () => {
    const cityId = new Types.ObjectId();
    await insert(fakeItinerary({ cityId, slug: 'lich-trinh-gia-lap' }));
    await expect(insert(fakeItinerary({ cityId, slug: 'lich-trinh-gia-lap' }))).rejects.toMatchObject({ code: 11000 });
    await insert(fakeItinerary({ cityId, kind: 'user' }));
    await insert(fakeItinerary({ cityId, kind: 'user' }));
    expect(await model.countDocuments({ kind: 'user' })).toBe(2);
  });

  it('điền mặc định: nháp, công khai, chưa có ngày nào', async () => {
    const saved = await insert(fakeItinerary());
    expect(saved.toObject()).toMatchObject({ status: 'draft', visibility: 'public', days: [] });
  });

  it('từ chối giá trị ngoài enum của contracts', async () => {
    await expect(insert(fakeItinerary({ params: { days: 6, transport: 'motorbike', pace: 'relaxed' } }))).rejects.toThrow(/days/);
    await expect(insert(fakeItinerary({ params: { days: 1, transport: 'bike', pace: 'relaxed' } }))).rejects.toThrow(/transport/);
    await expect(insert(fakeItinerary({ status: 'live' }))).rejects.toThrow(/status/);
  });

  it('listPublishedTemplates chỉ lấy mẫu đã công khai có slug của thành phố, mới tạo trước, kèm placeId các điểm dừng', async () => {
    const cityId = new Types.ObjectId();
    const placeA = new Types.ObjectId();
    const placeB = new Types.ObjectId();
    const stop = (placeId: Types.ObjectId) => ({ placeId, start: '08:00', end: '09:00' });
    await model.collection.insertMany([
      { ...fakeItinerary({ cityId, slug: 'cu', status: 'published' }), createdAt: new Date('2026-10-01') },
      {
        ...fakeItinerary({ cityId, slug: 'moi', status: 'published', days: [{ day: 1, stops: [stop(placeA)] }, { day: 2, stops: [stop(placeB)] }] }),
        createdAt: new Date('2026-10-05'),
      },
      { ...fakeItinerary({ cityId, slug: 'nhap' }), status: 'draft', createdAt: new Date('2026-10-06') },
      { ...fakeItinerary({ cityId, kind: 'user', slug: 'cua-khach', status: 'published' }), createdAt: new Date('2026-10-06') },
      { ...fakeItinerary({ cityId, status: 'published' }), createdAt: new Date('2026-10-06') },
      { ...fakeItinerary({ slug: 'thanh-pho-khac', status: 'published' }), createdAt: new Date('2026-10-06') },
    ]);
    const list = await repo.listPublishedTemplates(cityId.toString(), 10);
    expect(list.map((t) => t.slug)).toEqual(['moi', 'cu']);
    expect(list[0]).toMatchObject({ title: 'Lịch trình Giả Lập', days: 1, transport: 'motorbike', pace: 'relaxed' });
    expect(list[0]?.stopPlaceIds).toEqual([placeA.toString(), placeB.toString()]);
    expect(await repo.listPublishedTemplates(cityId.toString(), 1)).toHaveLength(1);
  });
});
