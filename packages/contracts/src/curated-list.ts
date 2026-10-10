import { z } from 'zod';
import { ObjectIdString, Slug } from './common.js';
import { PlaceCard } from './place.js';

export const CuratedListStatus = z.enum(['draft', 'published']);
export type CuratedListStatus = z.infer<typeof CuratedListStatus>;

/** Local recovery accepts incomplete text; server saves use CuratedListEditInput. */
export const CuratedListLocalDraft = z.object({
  title: z.string(), description: z.string(), placeIds: z.array(ObjectIdString).max(50), status: CuratedListStatus,
});
export type CuratedListLocalDraft = z.infer<typeof CuratedListLocalDraft>;

export const CuratedListEditInput = z.object({
  title: z.string().trim().min(1, 'Nhập tiêu đề danh sách').max(200, 'Tiêu đề tối đa 200 ký tự'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
  placeIds: z.array(ObjectIdString).max(50, 'Tối đa 50 địa điểm')
    .refine((ids) => new Set(ids).size === ids.length, 'Mỗi địa điểm chỉ xuất hiện một lần'),
  status: CuratedListStatus,
}).superRefine((input, ctx) => {
  if (input.status === 'published' && input.placeIds.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['placeIds'], message: 'Chọn ít nhất một địa điểm trước khi công khai' });
  }
});
export type CuratedListEditInput = z.infer<typeof CuratedListEditInput>;

export const AdminCuratedList = CuratedListEditInput.extend({
  id: ObjectIdString, cityId: ObjectIdString, slug: Slug,
});
export type AdminCuratedList = z.infer<typeof AdminCuratedList>;
export const AdminCuratedListResponse = z.object({ items: z.array(AdminCuratedList) });
export type AdminCuratedListResponse = z.infer<typeof AdminCuratedListResponse>;

export const CuratedListDetail = z.object({
  slug: Slug, title: z.string(), description: z.string(), places: z.array(PlaceCard),
});
export type CuratedListDetail = z.infer<typeof CuratedListDetail>;
export const CuratedListSummary = CuratedListDetail.omit({ places: true }).extend({
  placeCount: z.number().int().nonnegative(), coverKey: z.string().optional(),
});
export type CuratedListSummary = z.infer<typeof CuratedListSummary>;
export const CuratedListResponse = z.object({ items: z.array(CuratedListSummary) });
export type CuratedListResponse = z.infer<typeof CuratedListResponse>;
