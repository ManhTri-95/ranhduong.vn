import { describe, expect, it } from 'vitest';
import { alsoCategoryChoices, withoutPrimary } from './also-categories';

describe('alsoCategoryChoices', () => {
  it('các danh mục công khai trừ danh mục chính', () => {
    expect(alsoCategoryChoices('cafe', []).map((c) => c.value)).toEqual(['food', 'attraction', 'activity']);
    expect(alsoCategoryChoices('', []).map((c) => c.value)).toEqual(['cafe', 'food', 'attraction', 'activity']);
  });
  it('đã chọn đủ 2 thì các ô chưa chọn bị khoá, ô đã chọn vẫn bỏ được', () => {
    const choices = alsoCategoryChoices('cafe', ['food', 'activity']);
    expect(choices.filter((c) => c.disabled).map((c) => c.value)).toEqual(['attraction']);
  });
});

describe('withoutPrimary', () => {
  it('bỏ danh mục chính khỏi danh mục phụ', () => {
    expect(withoutPrimary(['food', 'activity'], 'food')).toEqual(['activity']);
    expect(withoutPrimary(['food'], '')).toEqual(['food']);
  });
});
