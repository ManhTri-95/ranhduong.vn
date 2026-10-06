import { z } from 'zod';

/** Slug không dấu, chữ thường, gạch nối: khớp kết quả `slugify` trong packages/geo (ADR 0010). */
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm a-z, 0-9 và dấu gạch nối');
export type Slug = z.infer<typeof Slug>;

/** ObjectId của MongoDB dạng chuỗi 24 ký tự hex thường. */
export const ObjectIdString = z.string().regex(/^[0-9a-f]{24}$/, 'ObjectId không hợp lệ');
export type ObjectIdString = z.infer<typeof ObjectIdString>;

/** Màu dạng #RRGGBB. */
export const HexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải có dạng #RRGGBB');
export type HexColor = z.infer<typeof HexColor>;

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Ngày trong năm dạng MM-DD, dùng cho mùa trong City.seasons. */
export const MonthDay = z
  .string()
  .regex(/^\d{2}-\d{2}$/, 'Ngày phải có dạng MM-DD')
  .refine((s) => {
    const max = DAYS_IN_MONTH[Number(s.slice(0, 2)) - 1];
    const day = Number(s.slice(3, 5));
    return max !== undefined && day >= 1 && day <= max;
  }, 'Ngày MM-DD không tồn tại');
export type MonthDay = z.infer<typeof MonthDay>;
