import { describe, expect, it } from 'vitest';
import { activeSection, routeChangeEffects } from './nav';

const placesRecord = {};
const editorRecord = {};
const at = (path: string, record: object, params: Record<string, string> = {}) => ({ path, params, matched: [record] });

describe('activeSection', () => {
  it('trang con vẫn đánh dấu mục cha; đường dẫn chỉ trùng phần đầu thì không', () => {
    expect(activeSection('/dia-diem')).toBe('/dia-diem');
    expect(activeSection('/dia-diem/0123456789abcdef01234567')).toBe('/dia-diem');
    expect(activeSection('/lich-trinh/moi')).toBe('/lich-trinh');
    expect(activeSection('/dia-diem-gia-lap')).toBeNull();
    expect(activeSection('/dang-nhap')).toBeNull();
  });
});

describe('routeChangeEffects', () => {
  it('lần vào đầu tiên: đặt tên tab, không dời focus', () => {
    expect(routeChangeEffects(at('/dia-diem', placesRecord), { path: '/', params: {}, matched: [] })).toEqual({ resetTitle: true, moveFocus: false });
  });
  it('sang trang khác: đặt tên tab và dời focus về tiêu đề', () => {
    expect(routeChangeEffects(at('/dia-diem/a', editorRecord, { id: 'a' }), at('/dia-diem', placesRecord))).toEqual({ resetTitle: true, moveFocus: true });
  });
  it('chỉ đổi query (bộ lọc): không làm gì', () => {
    expect(routeChangeEffects(at('/dia-diem', placesRecord), at('/dia-diem', placesRecord))).toEqual({ resetTitle: false, moveFocus: false });
  });
  it('vừa tạo xong (/moi thành /{id}): không đặt lại tên, không dời focus', () => {
    expect(routeChangeEffects(at('/dia-diem/b', editorRecord, { id: 'b' }), at('/dia-diem/moi', editorRecord, { id: 'moi' }))).toEqual({ resetTitle: false, moveFocus: false });
  });
  it('mở địa điểm khác cùng form: dời focus, tên tab do đầu trang đặt', () => {
    expect(routeChangeEffects(at('/dia-diem/b', editorRecord, { id: 'b' }), at('/dia-diem/a', editorRecord, { id: 'a' }))).toEqual({ resetTitle: false, moveFocus: true });
  });
});
