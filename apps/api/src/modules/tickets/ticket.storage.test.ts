import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { testEnv } from '../../testing/env';
import { TicketStorage } from './ticket.storage';

const HASH = 'c'.repeat(32);
const PNG = Buffer.from([137, 80, 78, 71, 1, 2, 3]);

describe('S30 lưu ảnh vé trên R2 (server S3 giả)', () => {
  let server: Server;
  let storage: TicketStorage;
  let requests: { method: string; path: string; headers: IncomingHttpHeaders }[] = [];
  beforeAll(async () => {
    server = createServer((req, res) => {
      requests.push({ method: req.method ?? '', path: decodeURIComponent((req.url ?? '').split('?')[0] ?? ''), headers: req.headers });
      req.resume();
      req.on('end', () => {
        if (req.method === 'GET' && req.url?.includes('/co-anh.png')) { res.writeHead(200, { 'content-type': 'image/png', 'content-length': PNG.length }); res.end(PNG); return; }
        if (req.method === 'GET') {
          res.writeHead(404, { 'content-type': 'application/xml' });
          res.end('<?xml version="1.0" encoding="UTF-8"?><Error><Code>NoSuchKey</Code><Message>Không có</Message></Error>');
          return;
        }
        res.writeHead(req.method === 'DELETE' ? 204 : 200, { etag: '"gia-lap"' }).end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Không có địa chỉ test');
    storage = new TicketStorage(testEnv({ R2_ENDPOINT: `http://127.0.0.1:${address.port}` }));
  });
  afterAll(async () => {
    storage.onApplicationShutdown();
    await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
  });
  beforeEach(() => { requests = []; });

  it('ảnh chưa có (NoSuchKey) thì read trả null; có thì trả đúng bytes', async () => {
    expect(await storage.read(`tickets/${HASH}/og.png`)).toBeNull();
    expect(await storage.read(`tickets/${HASH}/co-anh.png`)).toEqual(PNG);
    expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual([`GET /ranhduong-media/tickets/${HASH}/og.png`, `GET /ranhduong-media/tickets/${HASH}/co-anh.png`]);
  });
  it('ghi PNG vào bucket công khai với cache dài hạn', async () => {
    await storage.write(`tickets/${HASH}/og.png`, PNG);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ method: 'PUT', path: `/ranhduong-media/tickets/${HASH}/og.png` });
    expect(requests[0]!.headers['content-type']).toBe('image/png');
    expect(requests[0]!.headers['cache-control']).toContain('immutable');
  });
  it('xoá gửi một DELETE cho mỗi khoá', async () => {
    await storage.remove([`tickets/${HASH}/story.png`, `tickets/${HASH}/og.png`]);
    expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual([`DELETE /ranhduong-media/tickets/${HASH}/story.png`, `DELETE /ranhduong-media/tickets/${HASH}/og.png`]);
  });
});
