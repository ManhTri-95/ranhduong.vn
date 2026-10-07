import { CitySeed } from '@ranhduong/contracts';
import { Types } from 'mongoose';

// Dữ liệu giả cho test, tên rõ là giả, toạ độ quanh [0, 0] để không trùng địa điểm thật nào.

const square = (w: number, s: number, e: number, n: number) => ({
  type: 'Polygon',
  coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
});

/** Thành phố giả có hai cụm A và B. */
export function fakeCitySeed(opts: { slug?: string; active?: boolean } = {}): CitySeed {
  return CitySeed.parse({
    city: {
      slug: opts.slug ?? 'thanh-pho-gia-lap',
      name: 'Thành phố Giả Lập',
      center: { type: 'Point', coordinates: [0.5, 0.5] },
      timezone: 'Asia/Ho_Chi_Minh',
      active: opts.active ?? true,
      accent: '#123456',
      mapBounds: [0, 0, 1, 1],
    },
    zones: [
      { slug: 'cum-gia-lap-a', name: 'Cụm Giả Lập A', area: square(0.1, 0.1, 0.4, 0.4) },
      { slug: 'cum-gia-lap-b', name: 'Cụm Giả Lập B', area: square(0.6, 0.6, 0.9, 0.9) },
    ],
  });
}

/** Nguồn ảnh giả, ghép thêm `key` khi dùng. */
export const FAKE_PHOTO = { source: 'self', credit: 'Người Chụp Giả Lập', license: 'Giấy phép giả lập' } as const;

/** Document Place giả, active, đủ trường như khi ghi qua Mongoose; chèn thẳng vào collection `places`. */
export function fakePlaceDoc(cityId: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    cityId: new Types.ObjectId(cityId),
    slug: 'quan-gia-lap',
    slugHistory: [],
    name: 'Quán Giả Lập',
    aliases: [],
    nameNorm: 'gia lap',
    category: 'cafe',
    tags: [],
    location: { type: 'Point', coordinates: [0.2, 0.2] },
    checkinRadiusM: 100,
    openingHours: [],
    bestTime: [],
    transport: [],
    photos: [],
    status: 'active',
    suspicionScore: 0,
    source: 'admin',
    vipTier: 'free',
    ratingCount: 0,
    ...overrides,
  };
}
