/** API trả 404 (thành phố không có hoặc đã tắt) thì hiện trang 404 của Nuxt. */
export function throwIfNotFound(error: { statusCode?: number } | null | undefined): void {
  if (error?.statusCode === 404) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true });
}

/**
 * Khi SSR mà có lời gọi API lỗi thì trả 503 thay vì 200. Nitro chỉ cache phản hồi dưới 400 và Cloudflare không cache 503,
 * nên trang thiếu dữ liệu không bị giữ lại suốt thời gian SWR.
 */
export function markUnavailableOnServer(failed: boolean): void {
  if (!import.meta.server || !failed) return;
  const event = useRequestEvent();
  if (event) setResponseStatus(event, 503);
}
