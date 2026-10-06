import { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectTestDb, dropTestDb } from '../../testing/mongo';
import { PlacesRepository } from './places.repository';
import { PLACE_MODEL, PlaceSchema, type PlaceModel } from './schemas/place.schema';

// Dữ liệu giả, tên rõ là giả; toạ độ quanh [0, 0] để không trùng địa điểm thật nào.
function fakePlace(overrides: Record<string, unknown> = {}) {
  return {
    cityId: new Types.ObjectId(),
    slug: 'quan-gia-lap',
    name: 'Quán Giả Lập',
    nameNorm: 'gia lap',
    category: 'cafe',
    location: { type: 'Point', coordinates: [0.001, 0.001] },
    source: 'admin',
    ...overrides,
  };
}

describe('PlaceSchema và PlacesRepository', () => {
  let conn: Connection;
  let places: PlaceModel;
  // Ghi qua new Model().save() (validator Mongoose chạy đủ): test cố ý truyền giá trị sai enum,
  // mà kiểu của Model.create() chỉ nhận đúng enum đã suy ra từ schema.
  const insert = (doc: Record<string, unknown>) => new places(doc).save();

  beforeAll(async () => {
    conn = await connectTestDb();
    places = conn.model(PLACE_MODEL, PlaceSchema);
    await new PlacesRepository(places).ensureIndexes();
  });
  afterAll(async () => {
    await dropTestDb(conn);
  });
  beforeEach(async () => {
    await places.deleteMany({});
  });

  it('ensureIndexes tạo index 2dsphere, {cityId, slug} unique và {cityId, category, status}', async () => {
    const byName = new Map((await places.listIndexes()).map((i) => [i.name, i]));
    expect(byName.get('location_2dsphere')?.key).toEqual({ location: '2dsphere' });
    expect(byName.get('cityId_1_slug_1')).toMatchObject({ key: { cityId: 1, slug: 1 }, unique: true });
    expect(byName.get('cityId_1_category_1_status_1')?.key).toEqual({ cityId: 1, category: 1, status: 1 });
  });

  it('từ chối hai địa điểm cùng slug trong một thành phố', async () => {
    const cityId = new Types.ObjectId();
    await insert(fakePlace({ cityId }));
    await expect(insert(fakePlace({ cityId, name: 'Quán Giả Lập Hai' }))).rejects.toMatchObject({ code: 11000 });
  });

  it('cho phép cùng slug ở hai thành phố khác nhau', async () => {
    await insert(fakePlace());
    await insert(fakePlace());
    expect(await places.countDocuments({ slug: 'quan-gia-lap' })).toBe(2);
  });

  it('điền giá trị mặc định cho nháp', async () => {
    const doc = await insert(fakePlace());
    expect(doc.toObject()).toMatchObject({
      status: 'draft',
      checkinRadiusM: 100,
      vipTier: 'free',
      suspicionScore: 0,
      ratingCount: 0,
      slugHistory: [],
      photos: [],
    });
  });

  it('tìm theo khoảng cách nhờ index 2dsphere', async () => {
    const cityId = new Types.ObjectId();
    await insert(fakePlace({ cityId, slug: 'quan-gia-lap-gan', location: { type: 'Point', coordinates: [0.001, 0.001] } }));
    await insert(fakePlace({ cityId, slug: 'quan-gia-lap-xa', location: { type: 'Point', coordinates: [0.05, 0.05] } }));
    const near = await places
      .find({ location: { $near: { $geometry: { type: 'Point', coordinates: [0, 0] }, $maxDistance: 1000 } } })
      .lean();
    expect(near.map((p) => p.slug)).toEqual(['quan-gia-lap-gan']);
  });

  it('MongoDB từ chối toạ độ đảo thứ tự [lat, lng] (vĩ độ ngoài [-90, 90])', async () => {
    await expect(insert(fakePlace({ location: { type: 'Point', coordinates: [10, 105] } }))).rejects.toThrow(
      /geo keys/i,
    );
  });

  it('từ chối danh mục, trạng thái, nguồn ảnh ngoài enum của contracts', async () => {
    await expect(insert(fakePlace({ category: 'bar' }))).rejects.toThrow(/category/);
    await expect(insert(fakePlace({ status: 'deleted' }))).rejects.toThrow(/status/);
    const photo = { key: 'k', source: 'google', credit: 'Giả lập', license: 'Giả lập' };
    await expect(insert(fakePlace({ photos: [photo] }))).rejects.toThrow(/source/);
  });
});
