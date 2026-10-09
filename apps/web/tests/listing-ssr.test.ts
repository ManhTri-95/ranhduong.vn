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
const detailPlace = {
  id: '0123456789abcdef01234567', slug: 'quan-gia-lap-1', name: 'Quán Giả Lập 1', category: 'cafe',
  status: 'active', unconfirmed: true, location: { type: 'Point', coordinates: [0.2, 0.3] },
  address: 'Địa chỉ Giả Lập', practicalNotes: 'Ghi chú Giả Lập. Chỗ gửi xe ở bên hông.',
  openingHours: [{ day: 1, open: '07:00', close: '22:00' }], lastVerifiedAt: '2026-01-01T00:00:00.000Z',
  contact: { phone: '+84912345678', fanpage: 'https://facebook.com/fake' },
};
let apiFailed = false;
let detailFailed = false;
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
  } else if (url.pathname === '/v1/cities/da-lat/places/old-slug') {
    res.writeHead(301, { location: '/v1/cities/da-lat/places/quan-gia-lap-1' }).end();
  } else if (['quan-gia-lap-1', 'closed', 'with-photo'].some((slug) => url.pathname === `/v1/cities/da-lat/places/${slug}`)) {
    if (detailFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi chi tiết Giả Lập' }));
    const slug = url.pathname.split('/').at(-1);
    res.end(JSON.stringify({
      place: { ...detailPlace, slug, status: slug === 'closed' ? 'closed' : 'active',
        photos: slug === 'with-photo' ? [{ key: 'fake/photo', source: 'self', credit: 'Người Chụp Giả Lập', license: 'Giấy phép Giả Lập', sourceUrl: 'https://example.com/fake' }] : [] },
      nearby: items.slice(1, 7),
    }));
  } else {
    res.writeHead(404).end(JSON.stringify({ code: 'NOT_FOUND', message: 'Không tìm thấy thành phố Giả Lập' }));
  }
});

describe('S11 detail production SSR', () => {
  it('partial API failure keeps successful SSR data inline for hydration even on HTTP 503', async () => {
    detailFailed = true;
    try {
      const res = await fetch(`${base}/da-lat/dia-diem/quan-gia-lap-1?audit=partial`);
      expect(res.status).toBe(503);
      const html = await res.text();
      expect(html).toContain('Thành phố Giả Lập');
      expect(html).toContain('"data":');
      expect(html).not.toMatch(/id="__NUXT_DATA__"[^>]*data-src=/);
    } finally { detailFailed = false; }
  });
  it('renders editorial content, contacts and six nearby cards with SWR and no cached current status', async () => {
    const res = await fetch(`${base}/da-lat/dia-diem/quan-gia-lap-1`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600');
    const html = await res.text();
    for (const text of ['Quán Giả Lập 1', 'Ghi chú Giả Lập', 'Địa chỉ Giả Lập', 'Ảnh đang cập nhật', 'Thông tin chưa được quán xác nhận', '07:00–22:00', 'Tiện đường ghé thêm', 'Quán Giả Lập 7', 'tel:+84912345678', 'https://facebook.com/fake']) expect(html).toContain(text);
    expect(html).toContain('https://www.google.com/maps/dir/?api=1');
    expect(html).toContain('rel="canonical" href="https://ranhduong.vn/da-lat/dia-diem/quan-gia-lap-1"');
    expect(html).not.toContain('>Đang mở<');
    expect(html).not.toContain('>Đang đóng');
  });

  it('renders responsive cover and attribution', async () => {
    const html = await (await fetch(`${base}/da-lat/dia-diem/with-photo`)).text();
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('/fake/photo/1200.webp');
    expect(html).toContain('Người Chụp Giả Lập');
    expect(html).toContain('Giấy phép Giả Lập');
  });

  it('closed places keep 200 without directions', async () => {
    const res = await fetch(`${base}/da-lat/dia-diem/closed`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Đã đóng cửa');
    expect(html).toContain('Chỗ tương tự gần đây');
    expect(html).not.toContain('https://www.google.com/maps/dir/');
  });

  it('historical URL redirects 301 to canonical URL', async () => {
    const res = await fetch(`${base}/da-lat/dia-diem/old-slug`, { redirect: 'manual' });
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('/da-lat/dia-diem/quan-gia-lap-1');
  });

  it('missing detail is 404 no-store and API failure is 503 no-store with retry and recovery', async () => {
    const missing = await fetch(`${base}/da-lat/dia-diem/absent`);
    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toBe('no-store');
    const path = '/da-lat/dia-diem/quan-gia-lap-1?audit=down';
    apiFailed = true;
    try {
      const failed = await fetch(`${base}${path}`);
      expect(failed.status).toBe(503);
      expect(failed.headers.get('cache-control')).toBe('no-store');
      expect(await failed.text()).toContain('Thử lại');
    } finally { apiFailed = false; }
    expect((await fetch(`${base}${path}`)).status).toBe(200);
  });
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
