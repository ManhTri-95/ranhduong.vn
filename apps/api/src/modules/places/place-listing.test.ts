import { PlaceCursor, type FeaturedKey } from '@ranhduong/contracts';
import { describe, expect, it } from 'vitest';
import {
  cardNote,
  compareFeatured,
  countTags,
  featuredKey,
  hasAllTags,
  pageByFeatured,
  searchPlaces,
  toPlaceCard,
  type FeaturedPage,
  type ListedPlace,
} from './place-listing';

// Dữ liệu giả, tên rõ là giả.
const place = (overrides: Partial<ListedPlace> = {}): ListedPlace => ({
  slug: 'quan-gia-lap',
  name: 'Quán Giả Lập',
  aliases: [],
  tags: [],
  category: 'cafe',
  alsoCategories: [],
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
  it('S13 tìm theo thẻ, tên tiếng Việt của thẻ và kết hợp với tên', () => {
    const tagged = place({ name: 'Quán Giả Lập Mây', tags: ['view-doi', 'an-sang', 'banh-can'] });
    for (const q of ['view doi', 'ĂN SÁNG', 'banh ca', 'may an sang']) {
      expect(searchPlaces([tagged], q), q).toEqual([tagged]);
    }
    expect(searchPlaces([tagged], 'may dac san')).toEqual([]);
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

describe('featuredKey', () => {
  it('khoá gồm đã xác nhận hay chưa, ngày xác minh (mili giây) và slug', () => {
    expect(featuredKey(place({ slug: 'a', verifySource: 'owner', lastVerifiedAt: new Date(1000) }))).toEqual({
      owner: true,
      verifiedAt: 1000,
      slug: 'a',
    });
    expect(featuredKey(place({ slug: 'b', verifySource: 'admin' }))).toEqual({ owner: false, verifiedAt: null, slug: 'b' });
  });
});

describe('pageByFeatured', () => {
  // Thứ tự nổi bật: a (owner, có ngày), b (owner, chưa xác minh), c (10/1), d (9/1), e (chưa xác minh).
  const all = [
    place({ slug: 'e' }),
    place({ slug: 'c', verifySource: 'admin', lastVerifiedAt: new Date('2026-10-01') }),
    place({ slug: 'a', verifySource: 'owner', lastVerifiedAt: new Date('2026-09-01') }),
    place({ slug: 'd', verifySource: 'admin', lastVerifiedAt: new Date('2026-09-01') }),
    place({ slug: 'b', verifySource: 'owner' }),
  ];
  const slugsOf = (page: FeaturedPage) => page.items.map((p) => p.slug);

  it('đi hết các trang theo nextCursor: không trùng, không sót, trang cuối không có nextCursor', () => {
    const seen: string[] = [];
    let after: FeaturedKey | undefined;
    for (let i = 0; i < 5; i++) {
      const page = pageByFeatured(all, after, 2);
      seen.push(...slugsOf(page));
      if (!page.nextCursor) break;
      after = PlaceCursor.parse(page.nextCursor);
    }
    expect(seen).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('nextCursor là khoá của chỗ cuối trang; vừa đủ một trang thì không có', () => {
    expect(pageByFeatured(all, undefined, 4).nextCursor).toBe(`0.${new Date('2026-09-01').getTime()}.d`);
    expect(pageByFeatured(all, undefined, 5).nextCursor).toBeUndefined();
    expect(pageByFeatured([], undefined, 5)).toEqual({ items: [] });
  });

  it('chỗ ở cursor bị ẩn, có chỗ mới chen vào trước hay sau cursor: trang sau vẫn tiếp đúng chỗ', () => {
    const first = pageByFeatured(all, undefined, 2);
    expect(slugsOf(first)).toEqual(['a', 'b']);
    const after = PlaceCursor.parse(first.nextCursor ?? '');
    const changed = [
      ...all.filter((p) => p.slug !== 'b'),
      // Mới xác minh, đứng trước cursor: khách đã qua chỗ này nên không hiện lại.
      place({ slug: 'aa', verifySource: 'owner', lastVerifiedAt: new Date('2026-10-05') }),
      // Đứng sau cursor: phải hiện.
      place({ slug: 'cc', verifySource: 'admin', lastVerifiedAt: new Date('2026-10-01') }),
    ];
    expect(slugsOf(pageByFeatured(changed, after, 10))).toEqual(['c', 'cc', 'd', 'e']);
  });

  it('cursor sau chỗ cuối cùng thì trang rỗng; không đổi thứ tự mảng đầu vào', () => {
    const before = all.map((p) => p.slug);
    expect(pageByFeatured(all, { owner: false, verifiedAt: null, slug: 'zzz' }, 2)).toEqual({ items: [] });
    pageByFeatured(all, undefined, 2);
    expect(all.map((p) => p.slug)).toEqual(before);
  });
});

describe('lọc và đếm thẻ', () => {
  const tagged = [
    place({ slug: 'a', tags: ['view-doi', 'chill'] }),
    place({ slug: 'b', tags: ['chill'] }),
    place({ slug: 'c', tags: ['chill', 'chill', 'an-sang'] }),
    place({ slug: 'd' }),
  ];
  const keep = (tags: string[]) => tagged.filter((p) => hasAllTags(p, tags)).map((p) => p.slug);

  it('hasAllTags: phải có đủ mọi thẻ; không lọc thẻ nào thì giữ hết', () => {
    expect(keep(['chill', 'view-doi'])).toEqual(['a']);
    expect(keep(['chill'])).toEqual(['a', 'b', 'c']);
    expect(keep([])).toEqual(['a', 'b', 'c', 'd']);
    expect(keep(['khong-ai-co'])).toEqual([]);
  });

  it('countTags: thẻ lặp trong một chỗ tính một lần; nhiều chỗ trước, bằng nhau theo slug', () => {
    expect(countTags(tagged)).toEqual([
      { slug: 'chill', count: 3 },
      { slug: 'an-sang', count: 1 },
      { slug: 'view-doi', count: 1 },
    ]);
    expect(countTags([])).toEqual([]);
  });
});

describe('danh mục phụ trên thẻ và khi tìm', () => {
  it('thẻ chỉ có alsoCategories khi khác rỗng', () => {
    expect(toPlaceCard(place({ alsoCategories: ['food'] }), new Map()).alsoCategories).toEqual(['food']);
    expect(toPlaceCard(place(), new Map())).not.toHaveProperty('alsoCategories');
  });
  it('tìm "an uong" ra quán có danh mục phụ ăn uống, không kéo theo quán chỉ là cà phê', () => {
    const list = [place({ slug: 'cafe-co-com', alsoCategories: ['food'] }), place({ slug: 'cafe-thuan' })];
    expect(searchPlaces(list, 'an uong').map((p) => p.slug)).toEqual(['cafe-co-com']);
  });
});
