import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed, fakeEditInput, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { PlaceEditorService } from './place-editor.service';
import { PlacesModule } from './places.module';
import { PlacesRepository } from './places.repository';

const CITY = 'thanh-pho-gia-lap';
/** Phần form đủ điều kiện kích hoạt (dữ liệu giả). */
const COMPLETE = {
  location: { type: 'Point', coordinates: [0.2, 0.2] },
  openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
  verifySource: 'owner',
};

describe('PlaceEditorService', () => {
  let t: TestApp;
  let cityId: string;
  let editor: PlaceEditorService;
  const places = () => t.conn.collection('places');
  const dbDoc = (id: string) => places().findOne({ _id: new Types.ObjectId(id) });

  beforeAll(async () => {
    t = await createTestApp([PlacesModule]);
    cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId;
    editor = t.app.get(PlaceEditorService);
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await places().deleteMany({});
  });

  describe('create', () => {
    it('tạo nháp nguồn admin: slug và nameNorm từ tên, cụm theo slug, chưa có toạ độ', async () => {
      const place = await editor.create(CITY, fakeEditInput({ name: 'Cà phê Giả Lập Mây', zone: 'cum-gia-lap-a', aliases: ['Mây Giả Lập'] }));
      expect(place).toMatchObject({ status: 'draft', slug: 'ca-phe-gia-lap-may', name: 'Cà phê Giả Lập Mây', zone: 'cum-gia-lap-a', aliases: ['Mây Giả Lập'] });
      expect(place.location).toBeUndefined();
      const doc = await dbDoc(place.id);
      expect(doc).toMatchObject({ source: 'admin', status: 'draft', nameNorm: 'gia lap may' });
      expect(String(doc?.cityId)).toBe(cityId);
      expect(doc).not.toHaveProperty('location');
    });
    it('slug đã có chỗ dùng (kể cả slug cũ trong slugHistory) thì thêm số', async () => {
      await places().insertMany([
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap' }),
        fakePlaceDoc(cityId, { slug: 'cho-khac-gia-lap', slugHistory: ['quan-gia-lap-2'] }),
      ]);
      expect((await editor.create(CITY, fakeEditInput({ name: 'Quán Giả Lập' }))).slug).toBe('quan-gia-lap-3');
    });
    it('cụm không thuộc thành phố, tên không có chữ hay số: 400 VALIDATION_FAILED chỉ đúng trường', async () => {
      await expect(editor.create(CITY, fakeEditInput({ zone: 'cum-khong-co' }))).rejects.toMatchObject({
        body: { code: 'VALIDATION_FAILED', details: [{ path: 'zone' }] },
      });
      await expect(editor.create(CITY, fakeEditInput({ name: '☕ ☕' }))).rejects.toMatchObject({
        body: { code: 'VALIDATION_FAILED', details: [{ path: 'name' }] },
      });
    });
    it('thành phố không có: 404', async () => {
      await expect(editor.create('thanh-pho-khong-co', fakeEditInput())).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
  });

  describe('update', () => {
    it('nháp: đổi tên thì đổi slug; trường tuỳ chọn không gửi thì bị xoá', async () => {
      const created = await editor.create(CITY, fakeEditInput({ address: 'Địa chỉ giả lập', contact: { phone: '+84900000001' } }));
      const updated = await editor.update(created.id, fakeEditInput({ name: 'Quán Giả Lập Mới' }));
      expect(updated).toMatchObject({ slug: 'quan-gia-lap-moi', name: 'Quán Giả Lập Mới' });
      expect(updated.address).toBeUndefined();
      expect(updated.contact.phone).toBeUndefined();
      const doc = await dbDoc(created.id);
      expect(doc).not.toHaveProperty('address');
      expect(doc?.nameNorm).toBe('gia lap moi');
    });
    it('lưu danh mục phụ và mức mái che; gửi lại không có thì xoá', async () => {
      const created = await editor.create(CITY, fakeEditInput({ alsoCategories: ['food'], cover: 'partial' }));
      expect(created).toMatchObject({ alsoCategories: ['food'], cover: 'partial' });
      const cleared = await editor.update(created.id, fakeEditInput());
      expect(cleared.alsoCategories).toEqual([]);
      expect(cleared.cover).toBeUndefined();
      expect(await dbDoc(created.id)).not.toHaveProperty('cover');
    });
    it('nháp: tên đổi mà gốc slug như cũ thì giữ slug', async () => {
      const created = await editor.create(CITY, fakeEditInput({ name: 'Quán Giả Lập' }));
      expect((await editor.update(created.id, fakeEditInput({ name: 'quán giả lập' }))).slug).toBe(created.slug);
    });
    it('địa điểm active: giữ slug khi đổi tên; thiếu điều kiện kích hoạt thì 400 và DB giữ nguyên', async () => {
      const { insertedId } = await places().insertOne(fakePlaceDoc(cityId, { ...COMPLETE, slug: 'quan-gia-lap', status: 'active' }));
      const id = insertedId.toString();
      expect(await editor.update(id, fakeEditInput({ ...COMPLETE, name: 'Quán Giả Lập Đổi Tên' }))).toMatchObject({
        status: 'active',
        slug: 'quan-gia-lap',
        name: 'Quán Giả Lập Đổi Tên',
      });
      const withoutPin = fakeEditInput({ openingHours: COMPLETE.openingHours, verifySource: 'owner' });
      await expect(editor.update(id, withoutPin)).rejects.toMatchObject({
        body: { code: 'VALIDATION_FAILED', details: [{ code: 'location_missing' }] },
      });
      expect((await dbDoc(id))?.location).toBeDefined();
    });
    it('địa điểm đã gộp: 400; id không có: 404', async () => {
      const { insertedId } = await places().insertOne(fakePlaceDoc(cityId, { status: 'merged' }));
      await expect(editor.update(insertedId.toString(), fakeEditInput())).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
      await expect(editor.update(new Types.ObjectId().toString(), fakeEditInput())).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
    it('repository chỉ ghi khi trạng thái vẫn như lúc kiểm (máy khác vừa kích hoạt thì bản nháp cũ không ghi đè)', async () => {
      const { insertedId } = await places().insertOne(fakePlaceDoc(cityId, { ...COMPLETE, status: 'active' }));
      const repo = t.app.get(PlacesRepository);
      const result = await repo.replaceEditable(insertedId.toString(), 'draft', { $set: { name: 'Bản Cũ Giả Lập' }, $unset: { location: '' } });
      expect(result).toBeNull();
      expect(await dbDoc(insertedId.toString())).toMatchObject({ name: 'Quán Giả Lập', status: 'active' });
    });
  });

  describe('activate', () => {
    it('thiếu điều kiện: 400 kèm danh sách còn thiếu', async () => {
      const created = await editor.create(CITY, fakeEditInput());
      await expect(editor.activate(created.id)).rejects.toMatchObject({
        body: { code: 'VALIDATION_FAILED', details: [{ code: 'location_missing' }, { code: 'hours_invalid' }, { code: 'verify_source_missing' }] },
      });
    });
    it('ảnh thiếu nguồn: 400 photo_source_missing', async () => {
      const { insertedId } = await places().insertOne(
        fakePlaceDoc(cityId, { ...COMPLETE, status: 'draft', photos: [{ key: 'places/gia-lap/1', source: 'self' }] }),
      );
      await expect(editor.activate(insertedId.toString())).rejects.toMatchObject({ body: { details: [{ code: 'photo_source_missing' }] } });
    });
    it('đủ điều kiện: active, lastVerifiedAt là lúc kích hoạt; gọi lại không đổi gì', async () => {
      const created = await editor.create(CITY, fakeEditInput(COMPLETE));
      const now = new Date('2026-10-08T03:00:00Z');
      expect(await editor.activate(created.id, now)).toMatchObject({ status: 'active', lastVerifiedAt: now.toISOString() });
      expect(await editor.activate(created.id, new Date('2026-10-09T03:00:00Z'))).toMatchObject({ lastVerifiedAt: now.toISOString() });
    });
    it('document chèn thẳng không có updatedAt vẫn kích hoạt được', async () => {
      const { insertedId } = await places().insertOne(fakePlaceDoc(cityId, { ...COMPLETE, status: 'draft' }));
      expect((await editor.activate(insertedId.toString())).status).toBe('active');
    });
    it('document có updatedAt: null (sửa tay trong DB) vẫn kích hoạt được, không kẹt 409', async () => {
      const { insertedId } = await places().insertOne(fakePlaceDoc(cityId, { ...COMPLETE, status: 'draft', updatedAt: null }));
      expect((await editor.activate(insertedId.toString())).status).toBe('active');
    });
    it('trạng thái khác nháp (đã ẩn): 400', async () => {
      const { insertedId } = await places().insertOne(fakePlaceDoc(cityId, { ...COMPLETE, status: 'hidden' }));
      await expect(editor.activate(insertedId.toString())).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
    });
    it('repository không kích hoạt khi document đã đổi sau lúc kiểm (updatedAt khác)', async () => {
      const created = await editor.create(CITY, fakeEditInput(COMPLETE));
      const repo = t.app.get(PlacesRepository);
      expect(await repo.activate(created.id, new Date('2000-01-01T00:00:00Z'), new Date())).toBeNull();
      expect((await dbDoc(created.id))?.status).toBe('draft');
    });
  });

  describe('checkDuplicates', () => {
    // Cách m mét về phía bắc của [0.2, 0.2] (gần xích đạo 1° vĩ độ ≈ 111 195 m).
    const near = (m: number) => ({ type: 'Point' as const, coordinates: [0.2, 0.2 + m / 111_195] as [number, number] });

    it('cùng tên ở gần: có thể trùng, kèm tên cụm và khoảng cách; bỏ qua chỗ đã gộp và thành phố khác', async () => {
      const zone = await t.conn.collection('zones').findOne({ cityId: new Types.ObjectId(cityId), slug: 'cum-gia-lap-a' });
      const otherCityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-hai' }))).cityId;
      await places().insertMany([
        fakePlaceDoc(cityId, { slug: 'gia-lap-may', name: 'Giả Lập Mây', zoneId: zone?._id }),
        fakePlaceDoc(cityId, { slug: 'gia-lap-may-cu', name: 'Giả Lập Mây', status: 'merged' }),
        fakePlaceDoc(otherCityId, { slug: 'gia-lap-may', name: 'Giả Lập Mây' }),
      ]);
      const { matches } = await editor.checkDuplicates(CITY, { name: 'Cà phê Giả Lập Mây', location: near(50) });
      expect(matches).toEqual([
        { id: expect.any(String), name: 'Giả Lập Mây', status: 'active', zoneName: 'Cụm Giả Lập A', distanceM: 50, score: 0.47, level: 'possible' },
      ]);
    });
    it('số điện thoại gõ kiểu trong nước vẫn khớp số +84 đã lưu: rất có thể trùng', async () => {
      await places().insertOne(fakePlaceDoc(cityId, { name: 'Giả Lập Mây', contact: { phone: '+84900000001' } }));
      const { matches } = await editor.checkDuplicates(CITY, { name: 'Giả Lập Mây', phone: '0900 000 001' });
      expect(matches.map((m) => m.level)).toEqual(['likely']);
    });
    it('không so với chính địa điểm đang sửa', async () => {
      const { insertedId } = await places().insertOne(fakePlaceDoc(cityId, { name: 'Giả Lập Mây' }));
      const { matches } = await editor.checkDuplicates(CITY, { name: 'Giả Lập Mây', location: near(0), excludeId: insertedId.toString() });
      expect(matches).toEqual([]);
    });
  });

  describe('get', () => {
    it('đọc được địa điểm có ảnh thiếu nguồn, không có updatedAt; id không có thì 404', async () => {
      const { insertedId } = await places().insertOne(fakePlaceDoc(cityId, { photos: [{ key: 'places/gia-lap/1', source: 'self' }] }));
      expect((await editor.get(insertedId.toString())).photos).toEqual([{ key: 'places/gia-lap/1', source: 'self' }]);
      await expect(editor.get(new Types.ObjectId().toString())).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
  });

  describe('list', () => {
    it('mọi địa điểm chưa gộp của thành phố, kèm slug cụm; bỏ chỗ đã gộp và thành phố khác', async () => {
      const zone = await t.conn.collection('zones').findOne({ cityId: new Types.ObjectId(cityId), slug: 'cum-gia-lap-a' });
      const otherCityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed({ slug: 'thanh-pho-gia-lap-ba' }))).cityId;
      await places().insertMany([
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap-a', name: 'Quán Giả Lập A', zoneId: zone?._id }),
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap-b', name: 'Quán Giả Lập B', status: 'hidden' }),
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap-c', name: 'Quán Giả Lập C', status: 'merged' }),
        fakePlaceDoc(otherCityId, { slug: 'quan-gia-lap-d', name: 'Quán Giả Lập D' }),
      ]);
      const { items } = await editor.list(CITY);
      const rows = [...items].sort((a, b) => a.name.localeCompare(b.name)).map((p) => [p.name, p.status, p.zone]);
      expect(rows).toEqual([
        ['Quán Giả Lập A', 'active', 'cum-gia-lap-a'],
        ['Quán Giả Lập B', 'hidden', undefined],
      ]);
    });
    it('một document hỏng (nhập thẳng vào DB) không làm hỏng cả danh sách: bỏ dòng đó, các dòng khác vẫn trả', async () => {
      await places().insertMany([
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap-tot', name: 'Quán Giả Lập Tốt' }),
        fakePlaceDoc(cityId, { slug: 'Sai Slug Giả Lập', name: 'Quán Giả Lập Hỏng', category: 'bar' }),
        fakePlaceDoc(cityId, { slug: 'quan-gia-lap-ngay-chuoi', name: 'Quán Giả Lập Ngày Chuỗi', lastVerifiedAt: '2026-10-01T03:00:00Z' }),
      ]);
      const { items } = await editor.list(CITY);
      expect(items.map((p) => [p.name, p.lastVerifiedAt]).sort()).toEqual([
        ['Quán Giả Lập Ngày Chuỗi', '2026-10-01T03:00:00.000Z'],
        ['Quán Giả Lập Tốt', undefined],
      ]);
    });
    it('thành phố không có: 404', async () => {
      await expect(editor.list('thanh-pho-khong-co')).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
  });
});
