import { describe, expect, it } from 'vitest';
import { isSameRecordId, LEAVE_CONFIRM, shouldConfirmLeave } from './unsaved-guard';

describe('shouldConfirmLeave', () => {
  it('chỉ hỏi khi có thay đổi mà không giữ được trên máy', () => {
    expect(shouldConfirmLeave(true, false)).toBe(true);
    expect(shouldConfirmLeave(true, true)).toBe(false);
    expect(shouldConfirmLeave(false, false)).toBe(false);
  });
  it('câu hỏi rời trang là thao tác nguy hiểm', () => {
    expect(LEAVE_CONFIRM.tone).toBe('danger');
  });
});

describe('isSameRecordId', () => {
  it('vừa tạo xong, URL đổi sang đúng id mới thì không hỏi', () => {
    expect(isSameRecordId({ params: { id: '0123456789abcdef01234567' } }, '0123456789abcdef01234567')).toBe(true);
  });
  it('sang bản ghi khác, rời form hay chưa tạo thì vẫn kiểm', () => {
    expect(isSameRecordId({ params: { id: 'khac' } }, '0123456789abcdef01234567')).toBe(false);
    expect(isSameRecordId({ params: {} }, '0123456789abcdef01234567')).toBe(false);
    expect(isSameRecordId({ params: { id: 'moi' } }, null)).toBe(false);
  });
});
