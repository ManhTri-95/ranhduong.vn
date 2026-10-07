import { describe, expect, it } from 'vitest';
import { pickCoverKey, toItineraryCard, type TemplateSummary } from './itinerary-card';

const SUMMARY: TemplateSummary = {
  id: '0123456789abcdef01234567',
  slug: 'lich-trinh-gia-lap',
  title: 'Lịch trình Giả Lập',
  days: 2,
  transport: 'car',
  pace: 'packed',
  stopPlaceIds: ['a', 'b', 'c'],
};

describe('pickCoverKey', () => {
  it('lấy ảnh của điểm dừng đầu tiên có ảnh', () => {
    const covers = new Map([['b', 'anh-b'], ['c', 'anh-c']]);
    expect(pickCoverKey(['a', 'b', 'c'], covers)).toBe('anh-b');
    expect(pickCoverKey(['a'], covers)).toBeUndefined();
    expect(pickCoverKey([], covers)).toBeUndefined();
  });
});

describe('toItineraryCard', () => {
  it('đổi bản tóm tắt thành thẻ kèm ảnh bìa', () => {
    expect(toItineraryCard(SUMMARY, new Map([['c', 'anh-c']]))).toEqual({
      slug: 'lich-trinh-gia-lap',
      title: 'Lịch trình Giả Lập',
      days: 2,
      transport: 'car',
      pace: 'packed',
      coverKey: 'anh-c',
    });
  });
  it('dữ liệu hỏng (số ngày sai, thiếu slug, phương tiện lạ) thì trả null', () => {
    expect(toItineraryCard({ ...SUMMARY, days: 9 }, new Map())).toBeNull();
    expect(toItineraryCard({ ...SUMMARY, slug: undefined }, new Map())).toBeNull();
    expect(toItineraryCard({ ...SUMMARY, transport: 'bike' }, new Map())).toBeNull();
  });
});
