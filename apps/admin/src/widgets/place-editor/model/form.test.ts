import { AdminPlace, parseOpeningHours } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import { setDayKind } from '@/features/opening-hours-editor/lib/week';
import { emptyForm, formActivationIssues, formFromPlace, formToInput, PlaceFormState, sameForm } from './form';

// Dữ liệu giả, tên rõ là giả; toạ độ quanh [0, 0].
const PLACE = AdminPlace.parse({
  id: '0123456789abcdef01234567',
  status: 'draft',
  slug: 'quan-gia-lap',
  name: 'Quán Giả Lập',
  aliases: ['Giả Lập Một', 'Giả Lập Hai'],
  category: 'cafe',
  alsoCategories: ['food'],
  zone: 'cum-gia-lap-a',
  tags: ['chill'],
  location: { type: 'Point', coordinates: [0.2, 0.3] },
  address: 'Địa chỉ giả lập',
  openingHours: parseOpeningHours('T2-T6 07:00-22:00; T7 18:00-02:00'),
  visitDurationMin: 60,
  bestTime: ['morning'],
  cover: 'none',
  priceLevel: 2,
  transport: ['motorbike'],
  practicalNotes: 'Ghi chú giả lập.',
  contact: { phone: '+84900000001', fanpage: 'https://gia-lap.example/fanpage' },
  ids: {},
  photos: [],
  verifySource: 'admin',
  updatedAt: '2026-10-08T03:00:00.000Z',
});
const NAMED = { ...emptyForm(), name: 'Quán Giả Lập', category: 'cafe' as const };

describe('formFromPlace và formToInput', () => {
  it('đọc địa điểm vào form rồi gửi lại ra đúng các trường', () => {
    expect(formToInput(formFromPlace(PLACE))).toEqual({
      ok: true,
      input: {
        name: 'Quán Giả Lập',
        aliases: ['Giả Lập Một', 'Giả Lập Hai'],
        category: 'cafe',
        alsoCategories: ['food'],
        zone: 'cum-gia-lap-a',
        tags: ['chill'],
        location: { type: 'Point', coordinates: [0.2, 0.3] },
        address: 'Địa chỉ giả lập',
        openingHours: PLACE.openingHours,
        visitDurationMin: 60,
        bestTime: ['morning'],
        cover: 'none',
        priceLevel: 2,
        transport: ['motorbike'],
        practicalNotes: 'Ghi chú giả lập.',
        contact: { phone: '+84900000001', fanpage: 'https://gia-lap.example/fanpage' },
        verifySource: 'admin',
      },
    });
  });
  it('mái che "Chưa rõ" thì không gửi cover; danh mục phụ trùng danh mục chính thì báo ở ô Cũng phục vụ', () => {
    const result = formToInput({ ...NAMED, cover: '' });
    expect(result.ok).toBe(true);
    expect(result.ok ? result.input.cover : 'lỗi').toBeUndefined();
    expect(formToInput({ ...NAMED, alsoCategories: ['cafe'] })).toMatchObject({
      ok: false,
      errors: { alsoCategories: 'Chọn tối đa 2 danh mục phụ, khác danh mục chính' },
    });
  });
  it('form trống: chỉ báo thiếu tên và danh mục (nháp chưa cần toạ độ, giờ)', () => {
    const result = formToInput(emptyForm());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['category', 'name']);
  });
  it('số điện thoại gõ kiểu trong nước được chuẩn hoá về +84; không đọc được thì báo ở ô số điện thoại', () => {
    expect(formToInput({ ...NAMED, phone: '0900 000 001' })).toMatchObject({ ok: true, input: { contact: { phone: '+84900000001' } } });
    expect(formToInput({ ...NAMED, phone: '12345' })).toMatchObject({ ok: false, errors: { phone: 'Số điện thoại dạng 0912 345 678 hoặc +84912345678' } });
  });
  it('báo lỗi tiếng Việt đúng ô: thời gian tham quan, link, ca chưa nhập giờ, tên chỉ có biểu tượng', () => {
    expect(formToInput({ ...NAMED, visitDurationText: 'một tiếng' })).toMatchObject({
      ok: false,
      errors: { visitDurationText: 'Thời gian tham quan là số phút, từ 5 đến 720' },
    });
    expect(formToInput({ ...NAMED, fanpage: 'facebook.com/gialap' })).toMatchObject({ ok: false, errors: { fanpage: 'Dán link đầy đủ, bắt đầu bằng https://' } });
    expect(formToInput({ ...NAMED, hours: setDayKind(NAMED.hours, 1, 'shifts') })).toMatchObject({
      ok: false,
      errors: { hours: 'Có ca chưa nhập đủ giờ mở và giờ đóng' },
    });
    expect(formToInput({ ...NAMED, name: '☕' })).toMatchObject({ ok: false, errors: { name: expect.any(String) } });
  });
  it('tên khác tách bằng dấu ;, bỏ ô trống', () => {
    expect(formToInput({ ...NAMED, aliasesText: ' Giả Lập Một ;; Giả Lập Hai ' })).toMatchObject({
      ok: true,
      input: { aliases: ['Giả Lập Một', 'Giả Lập Hai'] },
    });
  });
});

describe('formActivationIssues', () => {
  it('form mới có tên: thiếu toạ độ, giờ, nguồn xác nhận', () => {
    expect(formActivationIssues(NAMED, []).map((i) => i.code)).toEqual(['location_missing', 'hours_invalid', 'verify_source_missing']);
  });
  it('đủ điều kiện; ảnh trên server thiếu nguồn thì vẫn chặn', () => {
    const form = formFromPlace(PLACE);
    expect(formActivationIssues(form, [])).toEqual([]);
    expect(formActivationIssues(form, [{ key: 'places/gia-lap/1', source: 'self' }]).map((i) => i.code)).toEqual(['photo_source_missing']);
  });
});

describe('sameForm và PlaceFormState', () => {
  it('so nội dung, không phụ thuộc thứ tự khoá; bản lưu trên máy đọc lại được', () => {
    const form = formFromPlace(PLACE);
    expect(sameForm(form, PlaceFormState.parse(JSON.parse(JSON.stringify(form))))).toBe(true);
    expect(sameForm(form, { ...form, name: 'Quán Giả Lập Khác' })).toBe(false);
    expect(PlaceFormState.safeParse(emptyForm()).success).toBe(true);
  });
});
