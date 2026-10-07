import { ofetch } from 'ofetch';

/** Client gọi API dùng chung cho admin: luôn gửi cookie phiên (.ranhduong.vn). */
export const api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE ?? 'http://localhost:3101/v1',
  credentials: 'include',
});

export interface HealthResponse { status: 'ok'; db: 'up' | 'down'; time: string }
