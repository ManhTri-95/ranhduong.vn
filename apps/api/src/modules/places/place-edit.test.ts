import { PlaceEditInput } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { FAKE_PHOTO } from '../../testing/fixtures';
import { editUpdate, toAdminPlace, toAdminPlaceSummary, type EditRow } from './place-edit';

describe('editUpdate', () => {
  it('ghi trường có giá trị, $unset trường tuỳ chọn để trống; contact bỏ ô trống', () => {
    const zoneId = new Types.ObjectId().toString();
    const input = PlaceEditInput.parse({
      name: 'Quán Giả Lập',
      category: 'cafe',
      alsoCategories: ['food'],
      address: 'Địa chỉ giả lập',
      contact: { phone: '+84900000001' },
      cover: 'none',
    });
    const { $set, $unset } = editUpdate(input, { nameNorm: 'gia lap', slug: 'quan-gia-lap', zoneId });
    expect($set).toMatchObject({
      name: 'Quán Giả Lập',
      nameNorm: 'gia lap',
      slug: 'quan-gia-lap',
      address: 'Địa chỉ giả lập',
      cover: 'none',
      alsoCategories: ['food'],
      contact: { phone: '+84900000001' },
    });
    expect(String($set.zoneId)).toBe(zoneId);
    expect(Object.keys($unset).sort()).toEqual(['location', 'practicalNotes', 'priceLevel', 'verifySource', 'visitDurationMin']);
  });
  it('không có cụm thì $unset zoneId', () => {
    const { $unset } = editUpdate(PlaceEditInput.parse({ name: 'Quán Giả Lập', category: 'cafe' }), { nameNorm: 'gia lap', slug: 'quan-gia-lap' });
    expect($unset).toHaveProperty('zoneId', '');
    expect($unset).toHaveProperty('cover', '');
  });
});

describe('toAdminPlace', () => {
  it('đổi id cụm thành slug, bỏ null, ngày giờ dạng ISO; ảnh thiếu nguồn vẫn trả về', () => {
    const row: EditRow = {
      _id: new Types.ObjectId('0123456789abcdef01234567'),
      cityId: new Types.ObjectId(),
      status: 'draft',
      slug: 'quan-gia-lap',
      name: 'Quán Giả Lập',
      category: 'cafe',
      zoneId: new Types.ObjectId('0123456789abcdef0123456a'),
      location: null,
      address: null,
      contact: { phone: null },
      photos: [{ key: 'places/gia-lap/1', source: 'self', credit: null, license: null }],
      updatedAt: new Date('2026-10-08T03:00:00Z'),
    };
    expect(toAdminPlace(row, new Map([['0123456789abcdef0123456a', 'cum-gia-lap-a']]))).toEqual({
      id: '0123456789abcdef01234567',
      status: 'draft',
      slug: 'quan-gia-lap',
      name: 'Quán Giả Lập',
      aliases: [],
      category: 'cafe',
      alsoCategories: [],
      zone: 'cum-gia-lap-a',
      tags: [],
      openingHours: [],
      bestTime: [],
      transport: [],
      contact: {},
      ids: {},
      photos: [{ key: 'places/gia-lap/1', source: 'self' }],
      updatedAt: '2026-10-08T03:00:00.000Z',
    });
  });
  it('document cũ còn trường indoor: bỏ qua, mái che là chưa rõ', () => {
    const legacy = {
      _id: new Types.ObjectId('0123456789abcdef01234567'),
      cityId: new Types.ObjectId(),
      status: 'draft' as const,
      slug: 'quan-gia-lap',
      name: 'Quán Giả Lập',
      category: 'cafe' as const,
      indoor: true,
      updatedAt: new Date('2026-10-08T03:00:00Z'),
    };
    const place = toAdminPlace(legacy, new Map());
    expect(place.cover).toBeUndefined();
    expect(place).not.toHaveProperty('indoor');
    expect(place.alsoCategories).toEqual([]);
  });
});

describe('toAdminPlaceSummary', () => {
  const base: EditRow = {
    _id: new Types.ObjectId(),
    cityId: new Types.ObjectId(),
    status: 'draft',
    slug: 'quan-gia-lap',
    name: 'Quán Giả Lập',
    category: 'cafe',
  };

  it('nháp chèn thẳng: thiếu mảng, thiếu updatedAt vẫn đọc được; mã điều kiện còn thiếu, mỗi mã một lần', () => {
    const summary = toAdminPlaceSummary(
      {
        ...base,
        openingHours: [
          { day: 1, open: '22:00', close: '22:00' },
          { day: 2, open: '23:00', close: '23:00' },
        ],
      },
      new Map(),
    );
    expect(summary).toEqual({
      id: base._id.toString(),
      status: 'draft',
      slug: 'quan-gia-lap',
      name: 'Quán Giả Lập',
      aliases: [],
      category: 'cafe',
      alsoCategories: [],
      photoCount: 0,
      activationIssues: ['location_missing', 'hours_invalid', 'verify_source_missing'],
      updatedAt: base._id.getTimestamp().toISOString(),
    });
  });
  it('đủ dữ liệu: slug cụm, ngày xác minh ISO, số ảnh; ảnh thiếu nguồn là điều kiện còn thiếu', () => {
    const zoneId = new Types.ObjectId();
    const summary = toAdminPlaceSummary(
      {
        ...base,
        status: 'active',
        zoneId,
        aliases: ['Mây Giả Lập'],
        alsoCategories: ['food'],
        verifySource: 'owner',
        location: { type: 'Point', coordinates: [0.2, 0.2] },
        openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
        photos: [{ key: 'places/gia-lap/1', ...FAKE_PHOTO }, { key: 'places/gia-lap/2', source: 'self' }],
        lastVerifiedAt: new Date('2026-10-01T03:00:00Z'),
        updatedAt: new Date('2026-10-02T03:00:00Z'),
      },
      new Map([[zoneId.toString(), 'cum-gia-lap-a']]),
    );
    expect(summary).toMatchObject({
      status: 'active',
      zone: 'cum-gia-lap-a',
      aliases: ['Mây Giả Lập'],
      alsoCategories: ['food'],
      verifySource: 'owner',
      lastVerifiedAt: '2026-10-01T03:00:00.000Z',
      updatedAt: '2026-10-02T03:00:00.000Z',
      photoCount: 2,
      activationIssues: ['photo_source_missing'],
    });
  });
});
