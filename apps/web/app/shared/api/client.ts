/** Client gọi API dùng chung (lớp shared trong FSD). */
export function useApiBase(): string {
  return useRuntimeConfig().public.apiBase as string;
}

export interface HealthResponse { status: 'ok'; db: 'up' | 'down'; time: string }
