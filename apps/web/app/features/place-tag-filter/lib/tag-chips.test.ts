import { describe, expect, it } from 'vitest';
import { tagChips } from './tag-chips';

describe('tagChips', () => {
  const available = [
    { slug: 'chill', count: 5 },
    { slug: 'view-doi', count: 2 },
  ];
  it('chưa chọn gì: mỗi chip chọn đúng thẻ của nó', () => {
    expect(tagChips(available, [])).toEqual([
      { slug: 'chill', label: 'Chill', pressed: false, value: 'chill' },
      { slug: 'view-doi', label: 'View đồi', pressed: false, value: 'view-doi' },
    ]);
  });
  it('đang chọn: bấm chip đã chọn thì bỏ thẻ đó, bấm chip khác thì thêm vào bộ đang chọn', () => {
    expect(tagChips(available, ['chill'])).toEqual([
      { slug: 'chill', label: 'Chill', pressed: true, value: '' },
      { slug: 'view-doi', label: 'View đồi', pressed: false, value: 'chill,view-doi' },
    ]);
  });
  it('thẻ đang chọn có tên trong TAG_LABEL mà không còn chỗ nào có vẫn hiện ở cuối để bỏ chọn được', () => {
    expect(tagChips(available, ['an-sang'])).toEqual([
      { slug: 'chill', label: 'Chill', pressed: false, value: 'an-sang,chill' },
      { slug: 'view-doi', label: 'View đồi', pressed: false, value: 'an-sang,view-doi' },
      { slug: 'an-sang', label: 'Ăn sáng', pressed: true, value: '' },
    ]);
  });
  it('chữ tuỳ ý trên URL (không có trong dữ liệu, không có tên) không thành chip và bị bỏ khi bấm chip khác', () => {
    expect(tagChips(available, ['chill', 'lua-dao-chuyen-khoan-0123456789'])).toEqual([
      { slug: 'chill', label: 'Chill', pressed: true, value: '' },
      { slug: 'view-doi', label: 'View đồi', pressed: false, value: 'chill,view-doi' },
    ]);
  });
  it('không có thẻ nào thì không có chip', () => {
    expect(tagChips([], [])).toEqual([]);
  });
});
