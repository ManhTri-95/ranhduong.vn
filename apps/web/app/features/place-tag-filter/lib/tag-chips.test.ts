import { describe, expect, it } from 'vitest';
import { tagChips, visibleTagChips } from './tag-chips';

describe('tagChips', () => {
  const available = [
    { slug: 'chill', count: 5 },
    { slug: 'view-doi', count: 2 },
  ];
  it('chưa chọn gì: mỗi chip chọn đúng thẻ của nó', () => {
    expect(tagChips(available, [])).toEqual([
      { slug: 'chill', label: 'Chill', count: 5, pressed: false, value: 'chill' },
      { slug: 'view-doi', label: 'View đồi', count: 2, pressed: false, value: 'view-doi' },
    ]);
  });
  it('đang chọn: bấm chip đã chọn thì bỏ thẻ đó, bấm chip khác thì thêm vào bộ đang chọn', () => {
    expect(tagChips(available, ['chill'])).toEqual([
      { slug: 'chill', label: 'Chill', count: 5, pressed: true, value: '' },
      { slug: 'view-doi', label: 'View đồi', count: 2, pressed: false, value: 'chill,view-doi' },
    ]);
  });
  it('thẻ đang chọn có tên trong TAG_LABEL mà không còn chỗ nào có vẫn hiện ở cuối để bỏ chọn được', () => {
    expect(tagChips(available, ['an-sang'])).toEqual([
      { slug: 'chill', label: 'Chill', count: 5, pressed: false, value: 'an-sang,chill' },
      { slug: 'view-doi', label: 'View đồi', count: 2, pressed: false, value: 'an-sang,view-doi' },
      { slug: 'an-sang', label: 'Ăn sáng', pressed: true, value: '' },
    ]);
  });
  it('chữ tuỳ ý trên URL (không có trong dữ liệu, không có tên) không thành chip và bị bỏ khi bấm chip khác', () => {
    expect(tagChips(available, ['chill', 'lua-dao-chuyen-khoan-0123456789'])).toEqual([
      { slug: 'chill', label: 'Chill', count: 5, pressed: true, value: '' },
      { slug: 'view-doi', label: 'View đồi', count: 2, pressed: false, value: 'chill,view-doi' },
    ]);
  });
  it('không có thẻ nào thì không có chip', () => {
    expect(tagChips([], [])).toEqual([]);
  });
});

describe('visibleTagChips', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({ slug: `the-${i}`, count: 10 - i }));
  it('không quá ngưỡng thì hiện hết', () => {
    const chips = tagChips(many.slice(0, 8), []);
    expect(visibleTagChips(chips)).toEqual({ shown: chips, hidden: [] });
  });
  it('quá ngưỡng: hiện 8 thẻ đầu (nhiều quán nhất), phần còn lại gom vào "Thêm thẻ"', () => {
    const { shown, hidden } = visibleTagChips(tagChips(many, []));
    expect(shown.map((chip) => chip.slug)).toEqual(['the-0', 'the-1', 'the-2', 'the-3', 'the-4', 'the-5', 'the-6', 'the-7']);
    expect(hidden.map((chip) => chip.slug)).toEqual(['the-8', 'the-9']);
  });
  it('thẻ đang chọn luôn hiện, kể cả khi nằm sau ngưỡng', () => {
    const { shown, hidden } = visibleTagChips(tagChips(many, ['the-9']));
    expect(shown.map((chip) => chip.slug)).toContain('the-9');
    expect(hidden.map((chip) => chip.slug)).toEqual(['the-8']);
  });
});
