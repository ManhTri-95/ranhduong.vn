import { describe, expect, it } from 'vitest';
import { cardNote, compareFeatured, searchPlaces, toPlaceCard, type ListedPlace } from './place-listing';

// Dữ liệu giả, tên rõ là giả.
const place = (overrides: Partial<ListedPlace> = {}): ListedPlace => ({
  slug: 'quan-gia-lap',
  name: 'Quán Giả Lập',
  aliases: [],
  category: 'cafe',
  openingHours: [],
  ...overrides,
});

describe('compareFeatured', () => {
  it('quán đã xác nhận trước, rồi xác minh gần nhất, chưa xác minh cuối, cùng hạng theo slug', () => {
    const list = [
      place({ slug: 'e', verifySource: 'admin' }),
      place({ slug: 'c', verifySource: 'admin', lastVerifiedAt: new Date('2026-10-01') }),
      place({ slug: 'a', verifySource: 'owner', lastVerifiedAt: new Date('2026-09-01') }),
      place({ slug: 'd', verifySource: 'admin', lastVerifiedAt: new Date('2026-10-01') }),
      place({ slug: 'b', verifySource: 'owner' }),
    ];
    expect(list.sort(compareFeatured).map((p) => p.slug)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('searchPlaces', () => {
  const list = [
    place({ slug: 'quan-khac', name: 'Quán Giả Lập Khác', category: 'food' }),
    place({ slug: 'tiem-may', name: 'Tiệm Giả Lập Mây', verifySource: 'owner' }),
    place({ slug: 'may-gia-lap', name: 'Mây Giả Lập' }),
    place({ slug: 'goc-may', name: 'Góc Giả Lập', aliases: ['Góc Mây'] }),
  ];
  it('chỉ giữ chỗ khớp; khớp tên tốt hơn đứng trước', () => {
    expect(searchPlaces(list, 'may').map((p) => p.slug)).toEqual(['may-gia-lap', 'tiem-may', 'goc-may']);
  });
  it('khớp tên danh mục; cùng mức khớp thì theo thứ tự nổi bật', () => {
    expect(searchPlaces(list, 'ca phe').map((p) => p.slug)).toEqual(['tiem-may', 'goc-may', 'may-gia-lap']);
  });
  it('không khớp gì thì rỗng', () => {
    expect(searchPlaces(list, 'khong co gi')).toEqual([]);
  });
});

describe('cardNote', () => {
  it('lấy câu đầu tiên; dấu chấm trong số không tính là hết câu', () => {
    expect(cardNote('Câu ghi chú giả lập thứ nhất. Câu thứ hai.')).toBe('Câu ghi chú giả lập thứ nhất.');
    expect(cardNote('Bản 2.0 của ghi chú giả lập. Câu thứ hai.')).toBe('Bản 2.0 của ghi chú giả lập.');
    expect(cardNote('Ghi chú giả lập không có dấu chấm')).toBe('Ghi chú giả lập không có dấu chấm');
  });
  it('chỉ lấy dòng đầu; rỗng thì không có', () => {
    expect(cardNote('Dòng giả lập một\nDòng giả lập hai')).toBe('Dòng giả lập một');
    expect(cardNote(undefined)).toBeUndefined();
    expect(cardNote('   ')).toBeUndefined();
  });
  it('dài quá 90 ký tự thì cắt ở ranh giới từ và thêm dấu …', () => {
    const long = `Một câu ghi chú giả lập rất dài ${'chữ '.repeat(30)}`;
    const note = cardNote(long) ?? '';
    expect(note.length).toBeLessThanOrEqual(90);
    expect(note.endsWith('…')).toBe(true);
    const kept = note.slice(0, -1);
    expect(long.startsWith(kept)).toBe(true);
    expect(long.charAt(kept.length)).toBe(' ');
  });
});

describe('toPlaceCard', () => {
  const zoneNames = new Map([['0123456789abcdef01234567', 'Cụm Giả Lập A']]);

  it('đủ trường: tên cụm, câu ghi chú, ảnh bìa, quán đã xác nhận', () => {
    const card = toPlaceCard(
      place({
        zoneId: '0123456789abcdef01234567',
        practicalNotes: 'Câu một giả lập. Câu hai.',
        verifySource: 'owner',
        coverKey: 'gia-lap/1',
        openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
      }),
      zoneNames,
    );
    expect(card).toEqual({
      slug: 'quan-gia-lap',
      name: 'Quán Giả Lập',
      category: 'cafe',
      zoneName: 'Cụm Giả Lập A',
      note: 'Câu một giả lập.',
      openingHours: [{ day: 1, open: '07:00', close: '22:00' }],
      unconfirmed: false,
      coverKey: 'gia-lap/1',
    });
  });
  it('thiếu trường tuỳ chọn vẫn ra thẻ; cụm không còn thì bỏ tên cụm', () => {
    const card = toPlaceCard(place({ zoneId: 'ffffffffffffffffffffffff' }), zoneNames);
    expect(card).toMatchObject({ unconfirmed: true, openingHours: [] });
    expect(card.zoneName).toBeUndefined();
    expect(card.note).toBeUndefined();
    expect(card.coverKey).toBeUndefined();
  });
});
