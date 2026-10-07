import { z } from 'zod';

/**
 * Khoá xếp hạng "nổi bật" của một địa điểm: quán đã xác nhận trước, rồi xác minh gần nhất (chưa xác minh xếp cuối),
 * cùng hạng theo slug. Cursor phân trang là khoá của chỗ cuối trang trước; trang sau lấy các chỗ đứng sau khoá đó,
 * nên có chỗ mới thêm hay bị ẩn giữa hai lần gọi cũng không trùng, không sót (technical-design mục 6).
 */
export interface FeaturedKey {
  owner: boolean;
  /** lastVerifiedAt tính bằng mili giây; null khi chưa xác minh. */
  verifiedAt: number | null;
  slug: string;
}

// `{owner}.{verifiedAt | -}.{slug}`, ví dụ `1.1759622400000.ca-phe-gia-lap`. Slug không có dấu chấm nên tách được;
// tối đa 15 chữ số để Number() không mất chính xác.
const CURSOR_PATTERN = /^[01]\.(?:0|[1-9]\d{0,14}|-)\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Cursor trong query `?cursor=`, đọc ra FeaturedKey; sai định dạng thì báo lỗi. */
export const PlaceCursor = z
  .string()
  .regex(CURSOR_PATTERN, 'Cursor không hợp lệ')
  .transform((s): FeaturedKey => {
    const [owner, verifiedAt, slug = ''] = s.split('.');
    return { owner: owner === '1', verifiedAt: verifiedAt === '-' ? null : Number(verifiedAt), slug };
  });

/** Ngược lại của PlaceCursor. verifiedAt là Date.getTime() của ngày xác minh (số nguyên không âm). */
export function encodePlaceCursor(key: FeaturedKey): string {
  return `${key.owner ? 1 : 0}.${key.verifiedAt ?? '-'}.${key.slug}`;
}
