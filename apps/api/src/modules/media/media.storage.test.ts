import { describe, expect, it } from 'vitest';
import { testEnv } from '../../testing/env';
import { MediaStorage } from './media.storage';
import { createServer } from 'node:http';
import { MAX_PHOTO_BYTES } from '@ranhduong/contracts';

describe('R2 presigned URL', () => {
  it.each([true, false])('bounded stream: chặn ảnh quá 8 MiB (Content-Length=%s)', async (withLength) => {
    const server = createServer((_req, res) => {
      if (withLength) res.setHeader('Content-Length', String(MAX_PHOTO_BYTES));
      res.end(Buffer.alloc(MAX_PHOTO_BYTES));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Không có địa chỉ test');
    const storage = new MediaStorage(testEnv({ R2_ENDPOINT: `http://127.0.0.1:${address.port}` }));
    try { await expect(storage.read('gia-lap')).rejects.toThrow(/8 MB/); }
    finally { storage.onApplicationShutdown(); await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }); }
  });
  it('PUT vào bucket riêng tư, hết hạn 300s, ký cả MIME và Content-Length', async () => {
    const storage = new MediaStorage(testEnv());
    try {
      const url = new URL(await storage.presign('uploads/gia-lap', 'image/png', 1234));
      expect(url.pathname).toBe('/ranhduong-uploads/uploads/gia-lap');
      expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
      expect(url.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toEqual(expect.arrayContaining(['content-type', 'content-length']));
    } finally { storage.onApplicationShutdown(); }
  });
});
