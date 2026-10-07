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
  it('thẻ đang chọn mà không còn chỗ nào có vẫn hiện ở cuối để bỏ chọn được', () => {
    expect(tagChips(available, ['khong-con'])).toEqual([
      { slug: 'chill', label: 'Chill', pressed: false, value: 'chill,khong-con' },
      { slug: 'view-doi', label: 'View đồi', pressed: false, value: 'khong-con,view-doi' },
      { slug: 'khong-con', label: 'Khong con', pressed: true, value: '' },
    ]);
  });
  it('không có thẻ nào thì không có chip', () => {
    expect(tagChips([], [])).toEqual([]);
  });
});
