import { describe, expect, it } from 'vitest';
import { formatDocumentTitle } from './document-title';

describe('formatDocumentTitle', () => {
  it('ghép tên trang với tên admin', () => {
    expect(formatDocumentTitle('Quán Giả Lập')).toBe('Quán Giả Lập · Rành Đường Quản trị');
  });
  it('không có tên trang thì dùng tên như index.html', () => {
    expect(formatDocumentTitle('  ')).toBe('Rành Đường · Quản trị');
  });
});
