import { describe, expect, it } from 'vitest';
import { Slug } from './common.js';
import { PlaceCategory } from './enums.js';
import {
  CATEGORY_LABEL,
  CATEGORY_URL_SLUG,
  categoryFromUrlSlug,
  formatTripLength,
  itineraryMeta,
  PUBLIC_CATEGORIES,
  TAG_LABEL,
  tagLabel,
} from './labels.js';

describe('danh mục', () => {
  it('slug URL đúng bảng technical-design mục 11, hợp lệ và không trùng', () => {
    expect(CATEGORY_URL_SLUG).toEqual({ cafe: 'ca-phe', food: 'an-uong', attraction: 'tham-quan', activity: 'hoat-dong' });
    const slugs = Object.values(CATEGORY_URL_SLUG);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(Slug.safeParse(slug).success, slug).toBe(true);
  });
  it('mọi danh mục có tên tiếng Việt; trang chủ hiện 4 danh mục theo thứ tự', () => {
    for (const category of PlaceCategory.options) expect(CATEGORY_LABEL[category].length, category).toBeGreaterThan(0);
    expect(PUBLIC_CATEGORIES.map((c) => CATEGORY_LABEL[c])).toEqual(['Cà phê', 'Ăn uống', 'Tham quan', 'Hoạt động']);
  });
  it('đọc danh mục từ slug URL; slug lạ hay danh mục chưa có trang thì không có', () => {
    for (const category of PUBLIC_CATEGORIES) expect(categoryFromUrlSlug(CATEGORY_URL_SLUG[category])).toBe(category);
    for (const slug of ['cafe', 'luu-tru', 'mua-sam', 'CA-PHE', '', 'constructor', 'khu-vuc', 'tim-kiem']) {
      expect(categoryFromUrlSlug(slug), slug).toBeUndefined();
    }
  });
});

describe('nhãn lịch trình', () => {
  it('số ngày kèm số đêm', () => {
    expect(formatTripLength(1)).toBe('1 ngày');
    expect(formatTripLength(3)).toBe('3 ngày 2 đêm');
  });
  it('dòng meta trên thẻ: số ngày · phương tiện · nhịp độ', () => {
    expect(itineraryMeta({ days: 1, transport: 'motorbike', pace: 'relaxed' })).toBe('1 ngày · xe máy · thong thả');
    expect(itineraryMeta({ days: 2, transport: 'car', pace: 'packed' })).toBe('2 ngày 1 đêm · ô tô · dày lịch');
  });
});

describe('thẻ', () => {
  it('thẻ có trong TAG_LABEL hiện tên tiếng Việt; mọi khoá là slug hợp lệ', () => {
    expect(tagLabel('view-doi')).toBe('View đồi');
    expect(tagLabel('song-ao')).toBe('Sống ảo');
    for (const slug of Object.keys(TAG_LABEL)) expect(Slug.safeParse(slug).success, slug).toBe(true);
  });
  it('thẻ chưa có tên thì hiện slug, viết hoa chữ đầu; không lấy nhầm thuộc tính của Object', () => {
    expect(tagLabel('cho-dau-xe-rong')).toBe('Cho dau xe rong');
    expect(tagLabel('constructor')).toBe('Constructor');
  });
});
