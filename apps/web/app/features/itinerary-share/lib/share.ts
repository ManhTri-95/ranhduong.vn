export type ShareChannel = 'zalo' | 'messenger' | 'copy';
export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'manual';
export interface ShareEnvironment {
  share?: (data: { title: string; url: string }) => Promise<void>;
  copy?: (text: string) => Promise<void>;
}

/** Native sharing lets the visitor choose the installed messaging app. */
export async function shareItinerary(channel: ShareChannel, data: { title: string; url: string }, env: ShareEnvironment): Promise<ShareResult> {
  if (channel !== 'copy' && env.share) {
    try { await env.share(data); return 'shared'; }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  if (env.copy) {
    try { await env.copy(data.url); return 'copied'; }
    catch { /* Leave the visible link selectable when clipboard access is blocked. */ }
  }
  return 'manual';
}
