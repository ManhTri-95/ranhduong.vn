import { ApiError } from '@ranhduong/contracts';
import { FetchError } from 'ofetch';

/** Lỗi khi gọi API: mã HTTP (0 là không kết nối được) và thân lỗi `{ code, message, details? }` nếu đọc được. */
export interface ApiFailure {
  status: number;
  error: ApiError | null;
}

export function toApiFailure(err: unknown): ApiFailure {
  if (err instanceof FetchError) {
    const parsed = ApiError.safeParse(err.data);
    return { status: err.statusCode ?? 0, error: parsed.success ? parsed.data : null };
  }
  return { status: 0, error: null };
}

/** Câu lỗi để hiện: câu chính rồi từng mục `details` có `message` (lỗi từng trường, điều kiện kích hoạt). */
export function failureMessages(failure: ApiFailure): string[] {
  if (!failure.error) return [];
  const details: unknown[] = Array.isArray(failure.error.details) ? failure.error.details : [];
  const detailMessages = details.flatMap((d) =>
    typeof d === 'object' && d !== null && 'message' in d && typeof d.message === 'string' ? [d.message] : [],
  );
  return [failure.error.message, ...detailMessages];
}
