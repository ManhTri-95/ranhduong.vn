import { describe, expect, it } from 'vitest';
import { PlaceStatus } from './enums.js';
import { parseOpeningHours } from './opening-hours.js';
import {
  activationIssues,
  AdminPlace,
  AdminPlaceSummary,
  canVerify,
  DuplicateCheckInput,
  PlaceEditInput,
  PlaceStatusInput,
  PlaceVerifyInput,
  statusActionsFor,
  statusActionTarget,
  statusAfter,
  ZoneSuggestQuery,
} from './place-admin.js';

// Dữ liệu giả, tên rõ là giả; toạ độ quanh [0, 0].
const POINT = { type: 'Point', coordinates: [0.2, 0.2] };
const FAKE_PHOTO = { key: 'places/gia-lap/1', source: 'self', credit: 'Người Chụp Giả Lập', license: 'Giấy phép giả lập' };
const COMPLETE = { location: POINT, openingHours: parseOpeningHours('T2-CN 07:00-22:00'), verifySource: 'owner', photos: [FAKE_PHOTO] };
const codes = (subject: Parameters<typeof activationIssues>[0]) => activationIssues(subject).map((i) => i.code);

describe('PlaceEditInput', () => {
  it('nháp chỉ cần tên và danh mục; bỏ khoảng trắng thừa; mảng mặc định rỗng', () => {
    expect(PlaceEditInput.parse({ name: '  Quán Giả Lập  ', category: 'cafe' })).toEqual({
      name: 'Quán Giả Lập',
      category: 'cafe',
      aliases: [],
      alsoCategories: [],
      tags: [],
      openingHours: [],
      bestTime: [],
      transport: [],
      contact: {},
    });
  });
  it('bắt buộc tên (tối đa 120 ký tự) và danh mục', () => {
    expect(PlaceEditInput.safeParse({ name: '   ', category: 'cafe' }).success).toBe(false);
    expect(PlaceEditInput.safeParse({ name: 'a'.repeat(121), category: 'cafe' }).success).toBe(false);
    expect(PlaceEditInput.safeParse({ name: 'Quán Giả Lập' }).success).toBe(false);
  });
  it('nguồn xác nhận trong form chỉ là owner hoặc admin', () => {
    expect(PlaceEditInput.safeParse({ name: 'Quán Giả Lập', category: 'cafe', verifySource: 'owner' }).success).toBe(true);
    expect(PlaceEditInput.safeParse({ name: 'Quán Giả Lập', category: 'cafe', verifySource: 'ctv' }).success).toBe(false);
  });
  it('giờ, toạ độ, cụm, thời gian tham quan phải đúng dạng', () => {
    const base = { name: 'Quán Giả Lập', category: 'cafe' };
    expect(PlaceEditInput.safeParse({ ...base, openingHours: [{ day: 1, open: '', close: '22:00' }] }).success).toBe(false);
    expect(PlaceEditInput.safeParse({ ...base, location: { type: 'Point', coordinates: [0.2, 95] } }).success).toBe(false);
    expect(PlaceEditInput.safeParse({ ...base, zone: 'Cụm A' }).success).toBe(false);
    expect(PlaceEditInput.safeParse({ ...base, visitDurationMin: 4 }).success).toBe(false);
    expect(PlaceEditInput.safeParse({ ...base, visitDurationMin: 90, priceLevel: 2, cover: 'none', location: POINT }).success).toBe(true);
  });
  it('danh mục phụ: tối đa 2, không lặp, khác danh mục chính; lỗi nằm ở alsoCategories', () => {
    const base = { name: 'Quán Giả Lập', category: 'cafe' };
    expect(PlaceEditInput.parse({ ...base, alsoCategories: ['food'] }).alsoCategories).toEqual(['food']);
    const same = PlaceEditInput.safeParse({ ...base, alsoCategories: ['cafe'] });
    expect(same.success).toBe(false);
    if (!same.success) expect(same.error.issues.map((i) => i.path.join('.'))).toEqual(['alsoCategories']);
    expect(PlaceEditInput.safeParse({ ...base, alsoCategories: ['food', 'activity', 'attraction'] }).success).toBe(false);
  });
  it('mức mái che thay cho trong nhà/ngoài trời', () => {
    expect(PlaceEditInput.parse({ name: 'Quán Giả Lập', category: 'cafe', cover: 'partial' }).cover).toBe('partial');
    expect(PlaceEditInput.safeParse({ name: 'Quán Giả Lập', category: 'cafe', cover: true }).success).toBe(false);
  });
});

describe('activationIssues', () => {
  it('đủ toạ độ, giờ hợp lệ, nguồn xác nhận, ảnh có nguồn (hoặc chưa có ảnh) thì kích hoạt được', () => {
    expect(activationIssues(COMPLETE)).toEqual([]);
    expect(activationIssues({ ...COMPLETE, photos: [] })).toEqual([]);
  });
  it('thiếu từng điều kiện thì báo đúng mã', () => {
    expect(codes({ ...COMPLETE, location: undefined })).toEqual(['location_missing']);
    expect(codes({ ...COMPLETE, openingHours: [] })).toEqual(['hours_invalid']);
    expect(codes({ ...COMPLETE, openingHours: [{ day: 1, open: '07:00', close: '07:00' }] })).toEqual(['hours_invalid']);
    expect(codes({ ...COMPLETE, verifySource: undefined })).toEqual(['verify_source_missing']);
    expect(codes({ location: undefined, openingHours: [], photos: [] })).toEqual(['location_missing', 'hours_invalid', 'verify_source_missing']);
  });
  it('ảnh thiếu người giữ bản quyền hoặc giấy phép thì báo theo thứ tự ảnh', () => {
    expect(activationIssues({ ...COMPLETE, photos: [FAKE_PHOTO, { key: 'places/gia-lap/2', source: 'owner' }] })).toEqual([
      { code: 'photo_source_missing', message: 'Ảnh 2 chưa ghi đủ nguồn, người giữ bản quyền và giấy phép' },
    ]);
  });
  it('toạ độ đọc từ DB sai dạng coi như chưa ghim', () => {
    expect(codes({ ...COMPLETE, location: { type: 'Point', coordinates: [0.2] } })).toEqual(['location_missing']);
  });
});

describe('AdminPlace', () => {
  it('đọc được dữ liệu đã lưu nhưng sai (giờ 25:00, ảnh thiếu nguồn, tên dài) để form vẫn mở và báo lỗi', () => {
    const stored = {
      id: '0123456789abcdef01234567',
      status: 'draft',
      slug: 'quan-gia-lap',
      name: 'Quán Giả Lập '.repeat(20),
      aliases: [],
      category: 'cafe',
      tags: ['the-chua-co-ten'],
      openingHours: [{ day: 1, open: '25:00', close: '22:00' }],
      bestTime: [],
      transport: [],
      contact: {},
      ids: {},
      photos: [{ key: 'places/gia-lap/1' }],
      updatedAt: '2026-10-08T03:00:00.000Z',
    };
    expect(AdminPlace.safeParse(stored).success).toBe(true);
    expect(AdminPlace.parse(stored).alsoCategories).toEqual([]);
  });
});

describe('DuplicateCheckInput', () => {
  it('cần tên; toạ độ, số điện thoại, fanpage không bắt buộc', () => {
    expect(DuplicateCheckInput.safeParse({ name: 'Quán Giả Lập' }).success).toBe(true);
    expect(DuplicateCheckInput.safeParse({ name: ' ' }).success).toBe(false);
  });
});

describe('ZoneSuggestQuery', () => {
  it('đọc toạ độ từ query; rỗng, chữ, thiếu hoặc ngoài phạm vi thì lỗi', () => {
    expect(ZoneSuggestQuery.parse({ lng: '0.2', lat: '-0.3' })).toEqual({ lng: 0.2, lat: -0.3 });
    for (const query of [{ lng: '', lat: '0' }, { lng: 'abc', lat: '0' }, { lng: '181', lat: '0' }, { lng: '0', lat: '91' }, { lng: '0' }]) {
      expect(ZoneSuggestQuery.safeParse(query).success, JSON.stringify(query)).toBe(false);
    }
  });
});

describe('đổi trạng thái địa điểm', () => {
  it('statusAfter: ẩn, hiện lại, đã đóng cửa (từ đang hiển thị, bị nghi ngờ, đã ẩn), mở lại', () => {
    expect(statusAfter('active', 'hide')).toBe('hidden');
    expect(statusAfter('hidden', 'unhide')).toBe('active');
    expect(statusAfter('active', 'close')).toBe('closed');
    expect(statusAfter('suspected', 'close')).toBe('closed');
    expect(statusAfter('hidden', 'close')).toBe('closed');
    expect(statusAfter('closed', 'reopen')).toBe('active');
  });
  it('statusAfter: không làm được với nháp (xoá thay vì ẩn), chỗ đã gộp, thao tác không hợp trạng thái', () => {
    expect(statusAfter('draft', 'hide')).toBeNull();
    expect(statusAfter('draft', 'close')).toBeNull();
    expect(statusAfter('merged', 'reopen')).toBeNull();
    expect(statusAfter('active', 'reopen')).toBeNull();
    expect(statusAfter('closed', 'hide')).toBeNull();
    expect(statusAfter('closed', 'unhide')).toBeNull();
  });
  it('statusActionsFor: các thao tác làm được, theo thứ tự hiện trong admin', () => {
    expect(statusActionsFor('active')).toEqual(['hide', 'close']);
    expect(statusActionsFor('hidden')).toEqual(['unhide', 'close']);
    expect(statusActionsFor('suspected')).toEqual(['close']);
    expect(statusActionsFor('closed')).toEqual(['reopen']);
    expect(statusActionsFor('draft')).toEqual([]);
    expect(statusActionsFor('merged')).toEqual([]);
  });
  it('statusActionTarget: trạng thái đích của thao tác', () => {
    expect(statusActionTarget('hide')).toBe('hidden');
    expect(statusActionTarget('close')).toBe('closed');
    expect(statusActionTarget('unhide')).toBe('active');
    expect(statusActionTarget('reopen')).toBe('active');
  });
  it('canVerify: xác minh được nháp, chỗ đang hiển thị, chỗ bị nghi ngờ', () => {
    expect(PlaceStatus.options.filter(canVerify)).toEqual(['draft', 'active', 'suspected']);
  });
  it('thân request: nguồn xác nhận chỉ owner hoặc admin; thao tác phải có trong danh sách', () => {
    expect(PlaceVerifyInput.safeParse({ verifySource: 'owner' }).success).toBe(true);
    expect(PlaceVerifyInput.safeParse({ verifySource: 'ctv' }).success).toBe(false);
    expect(PlaceVerifyInput.safeParse({}).success).toBe(false);
    expect(PlaceStatusInput.safeParse({ action: 'hide' }).success).toBe(true);
    expect(PlaceStatusInput.safeParse({ action: 'merge' }).success).toBe(false);
  });
});

describe('AdminPlaceSummary', () => {
  const base = {
    id: '0123456789abcdef01234567',
    status: 'draft',
    slug: 'quan-gia-lap',
    name: 'Quán Giả Lập',
    aliases: [],
    category: 'cafe',
    alsoCategories: ['food'],
    photoCount: 0,
    activationIssues: ['location_missing', 'verify_source_missing'],
    updatedAt: '2026-10-08T03:00:00.000Z',
  };
  it('đọc một dòng danh sách; cụm, nguồn, ngày xác minh tuỳ chọn', () => {
    const row = AdminPlaceSummary.parse(base);
    expect(row.zone).toBeUndefined();
    expect(row.lastVerifiedAt).toBeUndefined();
    expect(row.activationIssues).toEqual(['location_missing', 'verify_source_missing']);
    expect(AdminPlaceSummary.parse({ ...base, zone: 'cum-gia-lap-a', verifySource: 'owner', lastVerifiedAt: '2026-10-01T03:00:00.000Z' })).toMatchObject({
      zone: 'cum-gia-lap-a',
      verifySource: 'owner',
    });
  });
  it('số ảnh âm, mã điều kiện lạ: lỗi', () => {
    expect(AdminPlaceSummary.safeParse({ ...base, photoCount: -1 }).success).toBe(false);
    expect(AdminPlaceSummary.safeParse({ ...base, activationIssues: ['khong-co'] }).success).toBe(false);
  });
});
