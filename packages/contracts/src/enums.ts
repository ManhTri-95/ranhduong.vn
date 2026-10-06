import { z } from 'zod';

export const PlaceCategory = z.enum(['attraction', 'cafe', 'food', 'activity', 'stay', 'shop']);
export type PlaceCategory = z.infer<typeof PlaceCategory>;

export const PlaceStatus = z.enum(['draft', 'active', 'suspected', 'hidden', 'closed', 'merged']);
export type PlaceStatus = z.infer<typeof PlaceStatus>;

/** owner: quán đã xác nhận; admin: chỉ dựa trên Facebook hoặc điểm công cộng. */
export const VerifySource = z.enum(['owner', 'admin', 'ctv', 'user']);
export type VerifySource = z.infer<typeof VerifySource>;

export const BestTime = z.enum(['sunrise', 'morning', 'afternoon', 'sunset', 'evening']);
export const Transport = z.enum(['motorbike', 'car']);

/** Cụm khu vực Đà Lạt (slug). */
export const DalatZone = z.enum(['trung-tam', 'phia-nam', 'phia-bac', 'phia-dong']);
export type DalatZone = z.infer<typeof DalatZone>;
