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

  it('S36 planning templates include only published same-city templates and retain legacy audience', async () => {
    const cityId = new Types.ObjectId();
    await insert(fakeItinerary({ cityId, slug: 'mau-gia-lap', status: 'published', style: 'family', params: { days: 1, transport: 'motorbike', pace: 'relaxed', tags: ['chill_cafe'] }, days: [{ day: 1, stops: [] }] }));
    await insert(fakeItinerary({ cityId, slug: 'nhap-gia-lap', status: 'draft' }));
    await insert(fakeItinerary({ slug: 'khac-thanh-pho-gia-lap', status: 'published' }));
    await insert(fakeItinerary({ cityId, kind: 'user', status: 'published' }));
    expect(await repo.planningTemplates(cityId.toString())).toMatchObject([{ tags: ['chill_cafe'], with: 'family', days: [{ stops: [] }] }]);
    expect((await repo.planningTemplates(cityId.toString())).length).toBe(1);
  });

  it('ensureIndexes tạo index {cityId, kind, slug} unique cho bản có slug', async () => {
    const byName = new Map((await model.listIndexes()).map((i) => [i.name, i]));
    expect(byName.get('cityId_1_kind_1_slug_1')).toMatchObject({
      key: { cityId: 1, kind: 1, slug: 1 },
      unique: true,
      partialFilterExpression: { slug: { $type: 'string' } },
    });
  });

  it('S37 creates a unique partial shareId index and persists version and detours', async () => {
    const byName = new Map((await model.listIndexes()).map((index) => [index.name, index]));
    expect(byName.get('shareId_1')).toMatchObject({ key: { shareId: 1 }, unique: true, partialFilterExpression: { shareId: { $type: 'string' } } });
    const placeId = new Types.ObjectId();
    const key = '00000000-0000-4000-8000-000000000001';
    const saved = await insert(fakeItinerary({ kind: 'user', shareId: 'Ab01'.repeat(5), days: [{ day: 1, stops: [{ placeId, key, start: '07:00', end: '08:00' }], detours: [{ afterKey: key, placeId, detourMin: 5 }], issues: ['missing_lunch'] }] }));
    expect(saved.toObject()).toMatchObject({ version: 1, days: [{ detours: [{ afterKey: key, placeId, detourMin: 5 }], issues: ['missing_lunch'] }] });
    expect(saved.toObject()).not.toHaveProperty('paramsHash');
    await expect(insert(fakeItinerary({ kind: 'user', shareId: 'Ab01'.repeat(5) }))).rejects.toMatchObject({ code: 11000 });
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
        ...fakeItinerary({ cityId, slug: 'moi', status: 'published', season: 'Mùa Giả Lập', days: [{ day: 1, stops: [stop(placeA)] }, { day: 2, stops: [stop(placeB)] }] }),
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
    expect(list[0]).toMatchObject({ season: 'Mùa Giả Lập' });
    expect(await repo.listPublishedTemplates(cityId.toString(), 1)).toHaveLength(1);
  });

  it('S30 swapTicketKey lưu khoá chờ dọn qua lần retry, không đổi updatedAt', async () => {
    const oldKey = `tickets/${'a'.repeat(32)}`;
    const newKey = `tickets/${'b'.repeat(32)}`;
    const updatedAt = new Date('2026-10-01T00:00:00.000Z');
    const doc = await insert(fakeItinerary({ slug: 'lich-trinh-gia-lap', ticketKey: oldKey }));
    await model.collection.updateOne({ _id: doc._id }, { $set: { updatedAt } });
    expect(await repo.swapTicketKey(doc._id.toString(), newKey)).toEqual([oldKey]);
    const after = await model.findById(doc._id).lean();
    expect(after?.ticketKey).toBe(newKey);
    expect(after?.updatedAt).toEqual(updatedAt);
    expect(await repo.swapTicketKey(doc._id.toString(), newKey)).toEqual([oldKey]);
    expect((await model.findById(doc._id).lean())?.ticketCleanupKeys).toEqual([oldKey]);
    await repo.completeTicketCleanup(doc._id.toString(), [oldKey]);
    expect(await repo.swapTicketKey(doc._id.toString(), newKey)).toEqual([]);
    expect((await model.findById(doc._id).lean())?.updatedAt).toEqual(updatedAt);
  });

  it('S30 swapTicketKey: mẫu chưa có khoá và bản ghi không tồn tại không có ảnh chờ dọn', async () => {
    const doc = await insert(fakeItinerary({ slug: 'lich-trinh-gia-lap-hai' }));
    const key = `tickets/${'c'.repeat(32)}`;
    expect(await repo.swapTicketKey(doc._id.toString(), key)).toEqual([]);
    expect((await model.findById(doc._id).lean())?.ticketKey).toBe(key);
    expect(await repo.swapTicketKey(new Types.ObjectId().toString(), key)).toEqual([]);
  });
  it('S30 giữ các khoá chưa dọn khi đổi vé tiếp, loại khoá đang dùng nếu quay lại nội dung cũ', async () => {
    const a = `tickets/${'a'.repeat(32)}`;
    const b = `tickets/${'b'.repeat(32)}`;
    const c = `tickets/${'c'.repeat(32)}`;
    const doc = await insert(fakeItinerary({ ticketKey: a }));
    // Bản ghi trước khi thêm trường chờ dọn cũng phải được đọc đúng.
    await model.collection.updateOne({ _id: doc._id }, { $unset: { ticketCleanupKeys: 1 } });
    expect(await repo.swapTicketKey(doc.id, b)).toEqual([a]);
    expect((await repo.swapTicketKey(doc.id, c)).sort()).toEqual([a, b]);
    await repo.completeTicketCleanup(doc.id, [a]);
    expect(await repo.swapTicketKey(doc.id, c)).toEqual([b]);
    expect(await repo.swapTicketKey(doc.id, b)).toEqual([c]);
  });
});
