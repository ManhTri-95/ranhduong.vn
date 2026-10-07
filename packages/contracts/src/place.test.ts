import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CHECKIN_RADIUS_M,
  needsOwnerConfirmation,
  PHOTO_WIDTHS,
  photoVariantKey,
  Place,
  PlaceListQuery,
} from './place.js';

// Dữ liệu giả, tên rõ là giả; toạ độ quanh [0, 0].
const DRAFT = {
  cityId: '0123456789abcdef01234567',
  slug: 'quan-gia-lap',
  name: 'Quán Giả Lập',
  nameNorm: 'gia lap',
  category: 'cafe',
  location: { type: 'Point', coordinates: [0.001, 0.001] },
  source: 'admin',
};
const FAKE_PHOTO = { key: 'places/gia-lap/1.webp', source: 'self', credit: 'Người Chụp Giả Lập', license: 'Giấy phép giả lập' };

describe('Place', () => {
  it('nháp tối thiểu được nhận và điền giá trị mặc định', () => {
    expect(DEFAULT_CHECKIN_RADIUS_M).toBe(100);
    expect(Place.parse(DRAFT)).toMatchObject({
      status: 'draft',
      checkinRadiusM: 100,
      vipTier: 'free',
      suspicionScore: 0,
      ratingCount: 0,
      slugHistory: [],
      aliases: [],
      tags: [],
      openingHours: [],
      bestTime: [],
      transport: [],
      photos: [],
      contact: {},
      ids: {},
    });
  });
  it('bắt buộc cityId, slug, name, category, location, source', () => {
    for (const key of ['cityId', 'slug', 'name', 'category', 'location', 'source']) {
      const rest: Record<string, unknown> = { ...DRAFT };
      delete rest[key];
      expect(Place.safeParse(rest).success, key).toBe(false);
    }
  });
  it('ảnh phải có nguồn hợp lệ, người giữ bản quyền và giấy phép', () => {
    expect(Place.safeParse({ ...DRAFT, photos: [FAKE_PHOTO] }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, photos: [{ ...FAKE_PHOTO, credit: '  ' }] }).success).toBe(false);
    const noLicense: Record<string, unknown> = { ...FAKE_PHOTO };
    delete noLicense.license;
    expect(Place.safeParse({ ...DRAFT, photos: [noLicense] }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, photos: [{ ...FAKE_PHOTO, source: 'google' }] }).success).toBe(false);
  });
  it('số điện thoại phải dạng +84, không khoảng trắng', () => {
    expect(Place.safeParse({ ...DRAFT, contact: { phone: '+84900000000' } }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, contact: { phone: '0900000000' } }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, contact: { phone: '+84 900 000 000' } }).success).toBe(false);
  });
  it('fanpage và website chỉ nhận link http/https (không nhận javascript:, data:)', () => {
    const ok = { fanpage: 'https://gia-lap.example/fanpage', website: 'http://gia-lap.example' };
    expect(Place.safeParse({ ...DRAFT, contact: ok }).success).toBe(true);
    for (const url of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'ftp://gia-lap.example']) {
      expect(Place.safeParse({ ...DRAFT, contact: { fanpage: url } }).success, url).toBe(false);
      expect(Place.safeParse({ ...DRAFT, contact: { website: url } }).success, url).toBe(false);
    }
  });
  it('mức giá chỉ từ 1 đến 4', () => {
    expect(Place.safeParse({ ...DRAFT, priceLevel: 4 }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, priceLevel: 0 }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, priceLevel: 5 }).success).toBe(false);
  });
  it('tags và slugHistory phải là slug', () => {
    expect(Place.safeParse({ ...DRAFT, tags: ['view-doi'] }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, tags: ['View đồi'] }).success).toBe(false);
    expect(Place.safeParse({ ...DRAFT, slugHistory: ['Slug Cu'] }).success).toBe(false);
  });
  it('giờ mở cửa dùng OpeningSlot (ngày 0 = Chủ nhật, tối đa 6)', () => {
    expect(Place.safeParse({ ...DRAFT, openingHours: [{ day: 0, open: '07:00', close: '22:00' }] }).success).toBe(true);
    expect(Place.safeParse({ ...DRAFT, openingHours: [{ day: 7, open: '07:00', close: '22:00' }] }).success).toBe(false);
  });
});

describe('photoVariantKey', () => {
  it('ghép khoá bản WebP theo chiều rộng (S06 sinh đúng các khoá này)', () => {
    expect(PHOTO_WIDTHS).toEqual([400, 800, 1200]);
    expect(photoVariantKey('places/gia-lap/1', 800)).toBe('places/gia-lap/1/800.webp');
  });
});

describe('needsOwnerConfirmation', () => {
  it('quán chưa được chủ xác nhận thì hiện nhãn', () => {
    expect(needsOwnerConfirmation({ category: 'cafe', verifySource: 'admin' })).toBe(true);
    expect(needsOwnerConfirmation({ category: 'food', verifySource: 'ctv' })).toBe(true);
    expect(needsOwnerConfirmation({ category: 'activity' })).toBe(true);
  });
  it('quán đã xác nhận và điểm tham quan công cộng thì không', () => {
    expect(needsOwnerConfirmation({ category: 'cafe', verifySource: 'owner' })).toBe(false);
    expect(needsOwnerConfirmation({ category: 'attraction', verifySource: 'admin' })).toBe(false);
    expect(needsOwnerConfirmation({ category: 'attraction' })).toBe(false);
  });
});

describe('PlaceListQuery', () => {
  it('mặc định 20 kết quả, không lọc, không từ khoá', () => {
    const query = PlaceListQuery.parse({});
    expect(query.limit).toBe(20);
    expect(query.q).toBeUndefined();
    expect(query.category).toBeUndefined();
  });
  it('bỏ khoảng trắng thừa ở từ khoá; chỉ có khoảng trắng thì coi như không có', () => {
    expect(PlaceListQuery.parse({ q: '  ca phe  ' }).q).toBe('ca phe');
    expect(PlaceListQuery.parse({ q: '   ' }).q).toBeUndefined();
  });
  it('từ khoá tối đa 100 ký tự', () => {
    expect(PlaceListQuery.safeParse({ q: 'a'.repeat(100) }).success).toBe(true);
    expect(PlaceListQuery.safeParse({ q: 'a'.repeat(101) }).success).toBe(false);
  });
  it('đọc nhiều danh mục cách nhau bằng dấu phẩy', () => {
    expect(PlaceListQuery.parse({ category: 'cafe,food' }).category).toEqual(['cafe', 'food']);
    expect(PlaceListQuery.parse({ category: ' cafe , ' }).category).toEqual(['cafe']);
    expect(PlaceListQuery.parse({ category: '' }).category).toBeUndefined();
    expect(PlaceListQuery.safeParse({ category: 'cafe,bar' }).success).toBe(false);
  });
  it('limit đọc từ chuỗi query, số nguyên trong khoảng 1–50', () => {
    expect(PlaceListQuery.parse({ limit: '6' }).limit).toBe(6);
    for (const limit of ['0', '51', 'abc', '2.5']) {
      expect(PlaceListQuery.safeParse({ limit }).success, limit).toBe(false);
    }
  });
});
