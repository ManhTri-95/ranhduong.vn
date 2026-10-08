import { describe, expect, it } from 'vitest';
import { failureMessages } from './errors';

describe('failureMessages', () => {
  it('câu chính rồi tới từng câu trong details (lỗi từng trường, điều kiện kích hoạt)', () => {
    const failure = {
      status: 400,
      error: {
        code: 'VALIDATION_FAILED' as const,
        message: 'Chưa đủ điều kiện kích hoạt.',
        details: [{ code: 'location_missing', message: 'Chưa ghim toạ độ' }, { path: 'zone', message: 'Không có cụm này trong thành phố' }],
      },
    };
    expect(failureMessages(failure)).toEqual(['Chưa đủ điều kiện kích hoạt.', 'Chưa ghim toạ độ', 'Không có cụm này trong thành phố']);
  });
  it('không có details thì chỉ câu chính; lỗi mạng thì rỗng', () => {
    expect(failureMessages({ status: 409, error: { code: 'CONFLICT', message: 'Địa điểm vừa được sửa ở nơi khác.' } })).toEqual([
      'Địa điểm vừa được sửa ở nơi khác.',
    ]);
    expect(failureMessages({ status: 0, error: null })).toEqual([]);
  });
});
