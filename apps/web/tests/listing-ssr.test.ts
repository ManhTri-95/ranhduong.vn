import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createServer as createPortServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const city = {
  slug: 'da-lat', name: 'Thành phố Giả Lập', accent: '#f4bd33',
  center: { type: 'Point', coordinates: [0.5, 0.5] }, mapBounds: [0, 0, 1, 1],
  zones: [{ slug: 'trung-tam', name: 'Trung tâm Giả Lập' }],
};
const items = Array.from({ length: 25 }, (_, i) => ({
  slug: `quan-gia-lap-${i + 1}`, name: `Quán Giả Lập ${i + 1}`, category: 'cafe',
  alsoCategories: [], openingHours: [], unconfirmed: true,
}));
const cursor = '0.-.quan-gia-lap-20';
let apiFailed = false;
const api = createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (apiFailed) {
    res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi API Giả Lập' }));
  } else if (url.pathname === '/v1/cities/da-lat') {
    res.end(JSON.stringify(city));
  } else if (url.pathname === '/v1/cities/da-lat/places') {
    res.end(JSON.stringify({
      items: url.searchParams.has('cursor') ? items.slice(20) : url.searchParams.has('tags') ? items.slice(0, 5) : items.slice(0, 20),
      nextCursor: url.searchParams.has('cursor') || url.searchParams.has('tags') ? undefined : cursor,
      tags: [{ slug: 'chill', count: 25 }],
    }));
  } else if (url.pathname === '/v1/cities/da-lat/itineraries/templates') {
    res.end(JSON.stringify({ items: [] }));
  } else {
    res.writeHead(404).end(JSON.stringify({ code: 'NOT_FOUND', message: 'Không tìm thấy thành phố Giả Lập' }));
  }
});
let web: ChildProcess | undefined;
let base: string;

async function unusedPort(): Promise<number> {
  const server = createPortServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Không có cổng test');
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

beforeAll(async () => {
  api.listen(0, '127.0.0.1');
  await once(api, 'listening');
  const address = api.address();
  if (!address || typeof address === 'string') throw new Error('Không có cổng API test');
  const port = await unusedPort();
  const apiBase = `http://127.0.0.1:${address.port}/v1`;
  base = `http://127.0.0.1:${port}`;
  web = spawn(process.execPath, [fileURLToPath(new URL('../.output/server/index.mjs', import.meta.url))], {
    env: {
      ...process.env, PORT: String(port), HOST: '127.0.0.1', NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1',
      NITRO_UNIX_SOCKET: '', NITRO_SSL_CERT: '', NITRO_SSL_KEY: '',
      NUXT_API_INTERNAL_BASE: apiBase, NUXT_PUBLIC_API_BASE: apiBase,
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const child = web;
  await new Promise<void>((resolve, reject) => {
    let output = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
      if (output.includes('Listening on ')) resolve();
    });
    child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Nuxt test dừng (${code}). Chạy build trước test:ssr. ${output}`)));
  });
});

afterAll(async () => {
  if (web && web.exitCode === null && web.signalCode === null) {
    const exited = once(web, 'exit');
    web.kill();
    await exited;
  }
  await new Promise<void>((resolve, reject) => api.close((error) => error ? reject(error) : resolve()));
});

describe('SSR trang danh mục và khu vực trên bản production', () => {
  it.each([
    '/da-lat/ca-phe', '/da-lat/an-uong', '/da-lat/tham-quan', '/da-lat/hoat-dong',
    '/da-lat/khu-vuc/trung-tam', '/da-lat/ca-phe?tags=chill',
    `/da-lat/ca-phe?cursor=${cursor}`, '/da-lat/khu-vuc/trung-tam?tags=chill',
    `/da-lat/khu-vuc/trung-tam?cursor=${cursor}`,
  ])('%s render nội dung SSR và cache SWR 1 giờ', async (path) => {
    const res = await fetch(`${base}${path}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600');
    expect(res.headers.get('cache-control')).toContain('stale-while-revalidate');
    const html = await res.text();
    expect(html).toContain('Quán Giả Lập');
    if (path.includes('?')) expect(html).toContain('name="robots" content="noindex, follow"');
    else expect(html).not.toContain('name="robots" content="noindex');
  });

  it('cache riêng từng query và thực sự giữ HTML khi API tạm lỗi', async () => {
    const path = '/da-lat/ca-phe?audit=cache';
    const first = await fetch(`${base}${path}`);
    const html = await first.text();
    expect(first.status).toBe(200);
    expect(html).toContain('Quán Giả Lập 20');
    apiFailed = true;
    try {
      const cached = await fetch(`${base}${path}`);
      expect(cached.status).toBe(200);
      expect(await cached.text()).toBe(html);
      const fresh = await fetch(`${base}${path}&tags=chill`);
      expect(fresh.status).toBe(503);
      expect(fresh.headers.get('cache-control')).toBe('no-store');
    } finally { apiFailed = false; }
  });

  it('lỗi API trả 503 no-store và hồi phục cùng URL khi API hoạt động lại', async () => {
    for (const path of ['/da-lat/ca-phe?audit=down', '/da-lat/khu-vuc/trung-tam?audit=down']) {
      apiFailed = true;
      try {
        const res = await fetch(`${base}${path}`);
        expect(res.status).toBe(503);
        expect(res.headers.get('cache-control')).toBe('no-store');
        expect(await res.text()).toContain('Chưa tải được hết dữ liệu');
      } finally { apiFailed = false; }
      const recovered = await fetch(`${base}${path}`);
      expect(recovered.status).toBe(200);
      expect(recovered.headers.get('cache-control')).toContain('s-maxage=3600');
    }
  });

  it.each(['/da-lat/cafe', '/da-lat/luu-tru', '/da-lat/khu-vuc/khong-co', '/khong-co/ca-phe']
    .flatMap((path) => ['text/html', 'application/json'].map((accept) => ({ path, accept }))))('$path trả 404 no-store ($accept)', async ({ path, accept }) => {
    const res = await fetch(`${base}${path}`, { headers: { accept } });
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('tìm kiếm giữ no-store sau khi cache các trang S10', async () => {
    const res = await fetch(`${base}/da-lat/tim-kiem?q=gia-lap`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).toContain('name="robots" content="noindex, follow"');
  });
});
