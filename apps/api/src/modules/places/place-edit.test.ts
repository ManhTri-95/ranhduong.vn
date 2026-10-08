import { PlaceEditInput } from '@ranhduong/contracts';
import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { editUpdate, toAdminPlace, type EditRow } from './place-edit';

describe('editUpdate', () => {
  it('ghi trường có giá trị (kể cả false), $unset trường tuỳ chọn để trống; contact bỏ ô trống', () => {
    const zoneId = new Types.ObjectId().toString();
    const input = PlaceEditInput.parse({
      name: 'Quán Giả Lập',
      category: 'cafe',
      address: 'Địa chỉ giả lập',
      contact: { phone: '+84900000001' },
      indoor: false,
    });
    const { $set, $unset } = editUpdate(input, { nameNorm: 'gia lap', slug: 'quan-gia-lap', zoneId });
    expect($set).toMatchObject({
      name: 'Quán Giả Lập',
      nameNorm: 'gia lap',
      slug: 'quan-gia-lap',
      address: 'Địa chỉ giả lập',
      indoor: false,
      contact: { phone: '+84900000001' },
    });
    expect(String($set.zoneId)).toBe(zoneId);
    expect(Object.keys($unset).sort()).toEqual(['location', 'practicalNotes', 'priceLevel', 'verifySource', 'visitDurationMin']);
  });
  it('không có cụm thì $unset zoneId', () => {
    const { $unset } = editUpdate(PlaceEditInput.parse({ name: 'Quán Giả Lập', category: 'cafe' }), { nameNorm: 'gia lap', slug: 'quan-gia-lap' });
    expect($unset).toHaveProperty('zoneId', '');
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
});
