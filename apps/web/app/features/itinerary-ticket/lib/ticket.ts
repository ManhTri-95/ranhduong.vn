/** Câu rủ trên cuống vé (Spec UI mục 3, 9), gửi kèm khi chia sẻ ảnh. */
export const TICKET_SHARE_TEXT = 'Mình đi theo lịch này nè, bạn đi chung không?';

export type TicketLoad = { status: 'ready'; blob: Blob } | { status: 'pending' } | { status: 'failed' };

/** API trả 200 PNG khi vé đã in, 503 khi worker chưa in xong; mọi trường hợp khác coi như lỗi để khách thử lại. */
export async function loadTicket(url: string, fetcher: (url: string) => Promise<Response>): Promise<TicketLoad> {
  try {
    const response = await fetcher(url);
    if (response.status === 503) return { status: 'pending' };
    if (response.ok && response.headers.get('content-type')?.startsWith('image/png')) return { status: 'ready', blob: await response.blob() };
    return { status: 'failed' };
  } catch {
    return { status: 'failed' };
  }
}

export interface TicketShareEnv {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}

/** Web Share kèm file: chỉ khi trình duyệt nói nhận được file ảnh này. */
export function canShareTicket(file: File, env: TicketShareEnv): boolean {
  if (!env.share || !env.canShare) return false;
  try { return env.canShare({ files: [file] }); }
  catch { return false; }
}

export async function shareTicket(file: File, data: { title: string; url: string }, env: TicketShareEnv): Promise<'shared' | 'cancelled' | 'failed'> {
  if (!env.share) return 'failed';
  try {
    await env.share({ files: [file], title: data.title, text: `${TICKET_SHARE_TEXT} ${data.url}` });
    return 'shared';
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

/** Clipboard bị chặn hoặc không có thì để khách chép tay từ ô đường dẫn. */
export async function copyTicketLink(url: string, copy?: (text: string) => Promise<void>): Promise<'copied' | 'manual'> {
  if (!copy) return 'manual';
  try { await copy(url); return 'copied'; }
  catch { return 'manual'; }
}
