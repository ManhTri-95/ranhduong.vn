import { ofetch } from 'ofetch';

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3101/v1';

/** Client gọi API dùng chung cho admin: luôn gửi cookie phiên (.ranhduong.vn). */
export const api = ofetch.create({ baseURL: API_BASE, credentials: 'include' });

export interface HealthResponse { status: 'ok'; db: 'up' | 'down'; time: string }
