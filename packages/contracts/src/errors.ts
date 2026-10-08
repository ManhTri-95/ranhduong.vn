import { z } from 'zod';

/** Mã lỗi API (technical-design mục 6); CONFLICT khi bản ghi vừa bị request khác đổi; INTERNAL_ERROR cho lỗi không lường trước. */
export const ErrorCode = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'CHECKIN_TOO_FAR',
  'CHECKIN_LOW_ACCURACY',
  'CHECKIN_ALREADY_TODAY',
  'DUPLICATE_SUSPECTED',
  'VOUCHER_SOLD_OUT',
  'VOUCHER_ALREADY_CLAIMED',
  'VOUCHER_EXPIRED',
  'VOUCHER_OUT_OF_WINDOW',
  'CONTACT_REQUIRED',
  'NOT_ENOUGH_PLACES',
  'CONFLICT',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

/** Thân lỗi mọi endpoint trả về. */
export const ApiError = z.object({ code: ErrorCode, message: z.string(), details: z.unknown().optional() });
export type ApiError = z.infer<typeof ApiError>;
