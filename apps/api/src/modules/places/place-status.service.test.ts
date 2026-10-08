import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../../testing/app';
import { fakeCitySeed, fakePlaceDoc } from '../../testing/fixtures';
import { CitiesService } from '../cities/cities.service';
import { PlaceStatusService } from './place-status.service';
import { PlacesModule } from './places.module';
import { PlacesRepository } from './places.repository';

/** Đã ghim và có giờ (dữ liệu giả); thêm nguồn xác nhận là đủ điều kiện hiển thị. */
const PINNED = { location: { type: 'Point', coordinates: [0.2, 0.2] }, openingHours: [{ day: 1, open: '07:00', close: '22:00' }] };
const COMPLETE = { ...PINNED, verifySource: 'admin' };
const NOW = new Date('2026-10-08T03:00:00Z');

describe('PlaceStatusService', () => {
  let t: TestApp;
  let cityId: string;
  let service: PlaceStatusService;
  let seq = 0;
  const places = () => t.conn.collection('places');
  const dbDoc = (id: string) => places().findOne({ _id: new Types.ObjectId(id) });
  /** Chèn document giả (không qua Mongoose nên không có updatedAt); slug khác nhau để không đụng unique index. */
  const insert = async (overrides: Record<string, unknown> = {}) =>
    (await places().insertOne(fakePlaceDoc(cityId, { slug: `quan-gia-lap-${++seq}`, ...overrides }))).insertedId.toString();

  beforeAll(async () => {
    t = await createTestApp([PlacesModule]);
    cityId = (await t.app.get(CitiesService).applySeed(fakeCitySeed())).cityId;
    service = t.app.get(PlaceStatusService);
  });
  afterAll(async () => {
    await t.close();
  });
  beforeEach(async () => {
    await places().deleteMany({});
  });

  describe('verify', () => {
    it('nháp đủ điều kiện trừ nguồn xác nhận: thành đang hiển thị với nguồn vừa chọn, lastVerifiedAt là lúc bấm', async () => {
      const id = await insert({ ...PINNED, status: 'draft' });
      expect(await service.verify(id, 'owner', NOW)).toMatchObject({ status: 'active', verifySource: 'owner', lastVerifiedAt: NOW.toISOString() });
    });
    it('chỗ bị nghi ngờ: xác minh còn mở thì đang hiển thị, điểm nghi ngờ về 0', async () => {
      const id = await insert({ ...COMPLETE, status: 'suspected', suspicionScore: 3 });
      await service.verify(id, 'admin', NOW);
      expect(await dbDoc(id)).toMatchObject({ status: 'active', suspicionScore: 0, verifySource: 'admin', lastVerifiedAt: NOW });
    });
    it('chỗ đang hiển thị (document chèn thẳng, không có updatedAt): cập nhật ngày và nguồn', async () => {
      const id = await insert({ ...COMPLETE, lastVerifiedAt: new Date('2026-01-01T00:00:00Z') });
      expect(await service.verify(id, 'owner', NOW)).toMatchObject({ status: 'active', verifySource: 'owner', lastVerifiedAt: NOW.toISOString() });
    });
    it('thiếu điều kiện khác ngoài nguồn xác nhận: 400 kèm mã, DB giữ nguyên', async () => {
      const id = await insert({ status: 'draft' });
      await expect(service.verify(id, 'owner', NOW)).rejects.toMatchObject({
        body: { code: 'VALIDATION_FAILED', details: [{ code: 'hours_invalid' }] },
      });
      expect(await dbDoc(id)).toMatchObject({ status: 'draft' });
      expect(await dbDoc(id)).not.toHaveProperty('lastVerifiedAt');
    });
    it('chỗ đã ẩn, đã đóng cửa: 400; id không có: 404', async () => {
      for (const status of ['hidden', 'closed']) {
        const id = await insert({ ...COMPLETE, status });
        await expect(service.verify(id, 'owner', NOW)).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
      }
      await expect(service.verify(new Types.ObjectId().toString(), 'owner', NOW)).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
  });

  describe('changeStatus', () => {
    it('ẩn rồi hiện lại; đánh dấu đóng cửa rồi mở lại; giữ ngày xác minh', async () => {
      const id = await insert({ ...COMPLETE, lastVerifiedAt: NOW });
      expect((await service.changeStatus(id, 'hide')).status).toBe('hidden');
      expect((await service.changeStatus(id, 'unhide')).status).toBe('active');
      expect((await service.changeStatus(id, 'close')).status).toBe('closed');
      const reopened = await service.changeStatus(id, 'reopen');
      expect(reopened).toMatchObject({ status: 'active', lastVerifiedAt: NOW.toISOString() });
    });
    it('document có updatedAt: null (sửa tay trong DB) vẫn đổi được trạng thái, không kẹt 409', async () => {
      const id = await insert({ ...COMPLETE, updatedAt: null });
      expect((await service.changeStatus(id, 'hide')).status).toBe('hidden');
      expect((await service.verify(await insert({ ...PINNED, status: 'draft', updatedAt: null }), 'owner', NOW)).status).toBe('active');
    });
    it('bấm lại thao tác vừa xong (hai tab, bấm hai lần): trả trạng thái hiện tại, không lỗi', async () => {
      const id = await insert({ ...COMPLETE, status: 'hidden' });
      expect((await service.changeStatus(id, 'hide')).status).toBe('hidden');
    });
    it('thao tác không hợp trạng thái (ẩn một nháp, mở lại chỗ đang ẩn): 400, DB giữ nguyên', async () => {
      const draft = await insert({ ...COMPLETE, status: 'draft' });
      await expect(service.changeStatus(draft, 'hide')).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
      const hidden = await insert({ ...COMPLETE, status: 'hidden' });
      await expect(service.changeStatus(hidden, 'reopen')).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
      expect((await dbDoc(draft))?.status).toBe('draft');
      expect((await dbDoc(hidden))?.status).toBe('hidden');
    });
    it('hiện lại chỗ đã ẩn mà dữ liệu không còn đủ điều kiện (nhập thẳng vào DB): 400 kèm mã, vẫn ẩn', async () => {
      const id = await insert({ status: 'hidden' });
      await expect(service.changeStatus(id, 'unhide')).rejects.toMatchObject({
        body: { code: 'VALIDATION_FAILED', details: [{ code: 'hours_invalid' }, { code: 'verify_source_missing' }] },
      });
      expect((await dbDoc(id))?.status).toBe('hidden');
    });
    it('repository không đổi khi document đã đổi sau lúc đọc (trạng thái hoặc updatedAt khác)', async () => {
      const id = await insert(COMPLETE);
      const repo = t.app.get(PlacesRepository);
      expect(await repo.transition(id, { status: 'active', updatedAt: new Date('2000-01-01T00:00:00Z') }, { status: 'hidden' })).toBeNull();
      expect(await repo.transition(id, { status: 'draft', updatedAt: null }, { status: 'hidden' })).toBeNull();
      expect((await dbDoc(id))?.status).toBe('active');
    });
  });

  describe('deleteDraft', () => {
    it('xoá hẳn nháp', async () => {
      const id = await insert({ status: 'draft' });
      await service.deleteDraft(id);
      expect(await dbDoc(id)).toBeNull();
    });
    it('chỗ đã công khai (đang hiển thị, bị nghi ngờ, đã ẩn, đã đóng cửa): 400, không xoá', async () => {
      for (const status of ['active', 'suspected', 'hidden', 'closed']) {
        const id = await insert({ ...COMPLETE, status });
        await expect(service.deleteDraft(id)).rejects.toMatchObject({ body: { code: 'VALIDATION_FAILED' } });
        expect(await dbDoc(id)).not.toBeNull();
      }
    });
    it('id không có: 404', async () => {
      await expect(service.deleteDraft(new Types.ObjectId().toString())).rejects.toMatchObject({ body: { code: 'NOT_FOUND' } });
    });
    it('repository chỉ xoá khi còn là nháp (nháp vừa được kích hoạt ở máy khác thì không xoá)', async () => {
      const id = await insert(COMPLETE);
      expect(await t.app.get(PlacesRepository).deleteDraft(id)).toBe(false);
      expect(await dbDoc(id)).not.toBeNull();
    });
  });
});
