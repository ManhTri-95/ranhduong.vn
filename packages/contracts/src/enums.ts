import { z } from 'zod';

export const PlaceCategory = z.enum(['attraction', 'cafe', 'food', 'activity', 'stay', 'shop']);
export type PlaceCategory = z.infer<typeof PlaceCategory>;

export const PlaceStatus = z.enum(['draft', 'active', 'suspected', 'hidden', 'closed', 'merged']);
export type PlaceStatus = z.infer<typeof PlaceStatus>;

/** owner: quán đã xác nhận; admin: chỉ dựa trên Facebook hoặc điểm công cộng. */
export const VerifySource = z.enum(['owner', 'admin', 'ctv', 'user']);
export type VerifySource = z.infer<typeof VerifySource>;

export const BestTime = z.enum(['sunrise', 'morning', 'afternoon', 'sunset', 'evening']);
export type BestTime = z.infer<typeof BestTime>;
export const Transport = z.enum(['motorbike', 'car']);
export type Transport = z.infer<typeof Transport>;

/** Cụm khu vực Đà Lạt (slug). */
export const DalatZone = z.enum(['trung-tam', 'phia-nam', 'phia-bac', 'phia-dong']);
export type DalatZone = z.infer<typeof DalatZone>;

/** Nguồn ảnh: tự chụp, quán gửi, cộng tác viên, người dùng, Creative Commons (ADR 0013). */
export const PhotoSource = z.enum(['self', 'owner', 'ctv', 'user', 'cc']);
export type PhotoSource = z.infer<typeof PhotoSource>;

/** Ai tạo địa điểm. */
export const PlaceSource = z.enum(['admin', 'ctv', 'user', 'owner']);
export type PlaceSource = z.infer<typeof PlaceSource>;

export const VipTier = z.enum(['free', 'starter', 'vip']);
export type VipTier = z.infer<typeof VipTier>;

/** Mức mái che (thay cho trong nhà/ngoài trời): full che hết; partial có cả chỗ che mưa và chỗ ngoài trời; none không chỗ che mưa. */
export const PlaceCover = z.enum(['full', 'partial', 'none']);
export type PlaceCover = z.infer<typeof PlaceCover>;
