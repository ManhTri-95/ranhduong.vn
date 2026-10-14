import { describe, expect, it } from 'vitest';
import { activationChecklist } from './checklist';

describe('activationChecklist', () => {
  it('đủ 4 dòng theo thứ tự, mỗi dòng trỏ tới đúng mục và giữ câu chi tiết', () => {
    const items = activationChecklist([
      { code: 'hours_invalid', message: 'Thứ Hai: giờ đóng trước giờ mở' },
      { code: 'photo_source_missing', message: 'Ảnh 2 chưa ghi đủ nguồn, người giữ bản quyền và giấy phép' },
    ]);
    expect(items.map((item) => [item.label, item.target, item.ok])).toEqual([
      ['Vị trí', 'sec-location', true],
      ['Giờ mở cửa', 'sec-hours', false],
      ['Nguồn xác nhận', 'sec-verify', true],
      ['Nguồn ảnh', 'sec-photos', false],
    ]);
    expect(items[1]?.messages).toEqual(['Thứ Hai: giờ đóng trước giờ mở']);
  });
});
