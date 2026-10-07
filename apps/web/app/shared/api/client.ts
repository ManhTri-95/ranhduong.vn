/** Client gọi API dùng chung (lớp shared trong FSD). */

/** API đọc có p95 dưới 300 ms (architecture mục 8); quá 5 giây thì coi như lỗi để trang không treo. */
export const API_TIMEOUT_MS = 5000;

/**
 * Địa chỉ API. Khi SSR, gọi qua mạng nội bộ nếu có NUXT_API_INTERNAL_BASE (ADR 0003);
 * trên trình duyệt luôn dùng địa chỉ công khai NUXT_PUBLIC_API_BASE.
 */
export function useApiBase(): string {
  const config = useRuntimeConfig();
  if (import.meta.server && config.apiInternalBase) return config.apiInternalBase;
  return config.public.apiBase;
}

export interface HealthResponse { status: 'ok'; db: 'up' | 'down'; time: string }
