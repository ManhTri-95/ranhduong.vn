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
let mapFailed = false;
let suggestionRequests = 0;
let curatedFailed = false;
let templateFailed = false;
const templateStop = (number: number, day: number, available = true) => ({
  key: `${day}-${number}`, number, start: number === 1 ? '08:00' : '10:15', end: number === 1 ? '09:00' : '11:45', travelMinFromPrev: number === 1 ? 0 : 15,
  kind: 'visit', note: 'Ghi chú lịch trình Giả Lập',
  place: available ? { id: '0123456789abcdef01234567', slug: `quan-gia-lap-${number}`, name: `Quán Giả Lập ${number}`, category: 'cafe', alsoCategories: [], unconfirmed: true, location: { type: 'Point', coordinates: [0.2, 0.3] }, googlePlaceId: 'fake-id' } : null,
});
const api = createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (apiFailed) {
    res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi API Giả Lập' }));
  } else if (url.pathname.startsWith('/v1/seo/sitemap/')) {
    const kind = url.pathname.split('/').at(-1);
    const paths: Record<string, string[]> = { pages: ['/da-lat', '/da-lat/ca-phe', '/da-lat/khu-vuc/trung-tam'], places: ['/da-lat/dia-diem/quan-gia-lap-1', '/da-lat/dia-diem/closed'], lists: ['/da-lat/top/danh-sach-gia-lap'], itineraries: ['/da-lat/lich-trinh/lich-trinh-gia-lap'] };
    res.end(JSON.stringify({ items: (paths[kind ?? ''] ?? []).map((path) => ({ path, lastmod: '2026-10-09T08:30:00.000Z' })) }));
  } else if (url.pathname === '/v1/cities/da-lat') {
    res.end(JSON.stringify(city));
  } else if (url.pathname === '/v1/cities/da-lat/places') {
    if (url.searchParams.get('limit') === '6' && url.searchParams.has('q')) suggestionRequests++;
    if (url.searchParams.has('bbox') && mapFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi bản đồ Giả Lập' }));
    res.end(JSON.stringify({
      items: url.searchParams.has('bbox') ? items.map((place) => ({ ...place, location: { type: 'Point', coordinates: [0.5, 0.5] } })) : url.searchParams.has('cursor') ? items.slice(20) : url.searchParams.has('tags') ? items.slice(0, 5) : items.slice(0, 20),
      nextCursor: url.searchParams.has('cursor') || url.searchParams.has('tags') ? undefined : cursor,
      tags: [{ slug: 'chill', count: 25 }],
    }));
  } else if (url.pathname === '/v1/cities/da-lat/itineraries/templates') {
    res.end(JSON.stringify({ items: [{ slug: 'lich-trinh-gia-lap', title: 'Lịch trình Giả Lập', days: 2, transport: 'motorbike', pace: 'relaxed' }] }));
  } else if (url.pathname.startsWith('/v1/cities/da-lat/itineraries/templates/')) {
    if (templateFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi lịch trình Giả Lập' }));
    const slug = url.pathname.split('/').at(-1);
    if (!['lich-trinh-gia-lap', 'rong-gia-lap'].includes(slug ?? '')) return res.writeHead(404).end(JSON.stringify({ code: 'NOT_FOUND', message: 'Không tìm thấy lịch trình' }));
    res.end(JSON.stringify({
      slug, title: 'Lịch trình Giả Lập', description: 'Mô tả lịch trình Giả Lập', seoTitle: 'Lịch trình Google Giả Lập', seoDescription: 'Mô tả Google Giả Lập',
      season: 'Mùa Giả Lập', style: 'Đi chậm', transport: 'motorbike', pace: 'relaxed',
      days: [{ day: 1, stops: slug === 'rong-gia-lap' ? [] : [templateStop(1, 1), templateStop(2, 1), templateStop(3, 1, false)] }, { day: 2, stops: slug === 'rong-gia-lap' ? [] : [templateStop(1, 2)] }],
    }));
  } else if (url.pathname.startsWith('/v1/cities/da-lat/curated-lists')) {
    if (curatedFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi danh sách Giả Lập' }));
    const list = { slug: 'danh-sach-gia-lap', title: 'Danh sách Giả Lập', description: 'Mô tả Giả Lập theo thứ tự đã chọn.' };
    if (url.pathname === '/v1/cities/da-lat/curated-lists') res.end(JSON.stringify({ items: [{ ...list, placeCount: 3 }] }));
    else if (url.pathname.endsWith('/danh-sach-gia-lap')) res.end(JSON.stringify({ ...list, places: [items[2], items[0], items[1]] }));
    else if (url.pathname.endsWith('/rong-gia-lap')) res.end(JSON.stringify({ ...list, slug: 'rong-gia-lap', places: [] }));
    else res.writeHead(404).end(JSON.stringify({ code: 'NOT_FOUND', message: 'Không tìm thấy danh sách' }));
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

describe('S20 static legal pages production SSR', () => {
  it.each([
    { path: '/dieu-khoan', title: 'Điều khoản sử dụng' },
    { path: '/quyen-rieng-tu', title: 'Quyền riêng tư' },
    { path: '/ghi-nguon', title: 'Ghi nguồn' },
  ])('$path remains readable with a failing API and has public metadata/contact', async ({ path, title }) => {
    apiFailed = true;
    try {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html.match(/<h1\b[^>]*>(.*?)<\/h1>/)?.[1]).toBe(title);
      expect(html).toContain(`rel="canonical" href="https://ranhduong.vn${path}"`);
      expect(html).toContain('name="robots" content="index, follow"');
      expect(html).toContain('mailto:legal-gia-lap@example.com');
      for (const link of ['/dieu-khoan', '/quyen-rieng-tu', '/ghi-nguon']) expect(html).toContain(`href="${link}"`);
      expect(html).not.toContain('<canvas');
    } finally { apiFailed = false; }
  });

  it('provides legal navigation from the home, map, detail and error pages', async () => {
    for (const path of ['/da-lat?audit=s20-footer', '/da-lat/ban-do', '/da-lat/dia-diem/with-photo', '/s20-khong-co/trang-khong-co']) {
      const html = await (await fetch(`${base}${path}`, { headers: { accept: 'text/html' } })).text();
      const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
      expect(footer, path).toBeDefined();
      for (const link of ['/dieu-khoan', '/quyen-rieng-tu', '/ghi-nguon']) expect(footer, path).toContain(`href="${link}"`);
    }
  });

  it('adds web-owned legal URLs to the pages sitemap only, with the content modification date', async () => {
    for (const kind of ['pages', 'places', 'lists', 'itineraries']) {
      const xml = await (await fetch(`${base}/sitemap-${kind}.xml`)).text();
      for (const path of ['/dieu-khoan', '/quyen-rieng-tu', '/ghi-nguon']) {
        const entry = `<url><loc>https://ranhduong.vn${path}</loc><lastmod>2026-10-12T00:00:00.000Z</lastmod></url>`;
        if (kind === 'pages') expect(xml).toContain(entry);
        else expect(xml).not.toContain(`<loc>https://ranhduong.vn${path}</loc>`);
      }
    }
  });
});

describe('S16 public itinerary production SSR', () => {
  it('renders both days, saved times, notes, directions, sharing and canonical/OG with one-day SWR', async () => {
    const response = await fetch(`${base}/da-lat/lich-trinh/lich-trinh-gia-lap`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=86400');
    const html = await response.text();
    for (const text of ['Lịch trình Giả Lập', 'Mô tả lịch trình Giả Lập', 'id="day-1"', 'id="day-2"', '10:15', '11:45', 'khoảng 15 phút', 'Ghi chú lịch trình Giả Lập', 'Điểm ghé đang cập nhật', 'Zalo', 'Messenger', 'Copy link', 'OpenStreetMap', 'destination=0.3%2C0.2', 'destination_place_id=fake-id']) expect(html).toContain(text);
    expect(html).toContain('rel="canonical" href="https://ranhduong.vn/da-lat/lich-trinh/lich-trinh-gia-lap"');
    expect(html).toContain('property="og:title" content="Lịch trình Google Giả Lập · Rành Đường"');
    expect(html.indexOf('id="stop-1-1"')).toBeLessThan(html.indexOf('id="stop-1-2"'));
    expect(html).not.toContain('<canvas');
    expect(html).not.toMatch(/<link[^>]*maplibre-gl-worker[^>]*>/);
    expect(html).not.toContain('name="robots" content="noindex');
    expect(html.match(/data-rd-event="direction_click"/g)).toHaveLength(3);
    expect(html.match(/data-rd-place-id="0123456789abcdef01234567"/g)).toHaveLength(3);
  });
  it('links the template from the home page', async () => {
    expect(await (await fetch(`${base}/da-lat?audit=s16-home`)).text()).toContain('href="/da-lat/lich-trinh/lich-trinh-gia-lap"');
  });
  it('retains the published URL and empty day guidance', async () => {
    const response = await fetch(`${base}/da-lat/lich-trinh/rong-gia-lap`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Ngày này đang được cập nhật');
  });
  it.each(['/da-lat/lich-trinh/khong-co', '/khong-co/lich-trinh/lich-trinh-gia-lap', '/da-lat/lich-trinh/bad_slug'])('returns 404 no-store for %s', async (path) => {
    const response = await fetch(`${base}${path}`);
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('returns partial 503 no-store and recovers on the same URL', async () => {
    const path = '/da-lat/lich-trinh/lich-trinh-gia-lap?audit=s16-down';
    templateFailed = true;
    try {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const html = await response.text();
      expect(html).toContain('Thử lại');
      expect(html).toContain('Thành phố Giả Lập');
    } finally { templateFailed = false; }
    expect((await fetch(`${base}${path}`)).status).toBe(200);
  });
  it('serves cached successful HTML when the API is temporarily unavailable', async () => {
    const path = '/da-lat/lich-trinh/lich-trinh-gia-lap?audit=s16-cache';
    const html = await (await fetch(`${base}${path}`)).text();
    templateFailed = true;
    try {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(html);
    } finally { templateFailed = false; }
  });
});

describe('S14 curated lists production SSR', () => {
  it('renders title, description and numbered cards in saved order, canonical and SWR 1h', async () => {
    const response = await fetch(`${base}/da-lat/top/danh-sach-gia-lap`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    const html = await response.text();
    for (const text of ['Danh sách Giả Lập', 'Mô tả Giả Lập theo thứ tự đã chọn.', '<ol', '/da-lat/dia-diem/quan-gia-lap-3', 'rel="canonical" href="https://ranhduong.vn/da-lat/top/danh-sach-gia-lap"']) expect(html).toContain(text);
    expect(html.indexOf('Quán Giả Lập 3')).toBeLessThan(html.indexOf('Quán Giả Lập 1'));
    expect(html.indexOf('Quán Giả Lập 1')).toBeLessThan(html.indexOf('Quán Giả Lập 2'));
    expect(html).not.toContain('name="robots" content="noindex');
  });
  it('links published lists from the city home in SSR', async () => {
    const response = await fetch(`${base}/da-lat?audit=s14-home`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('href="/da-lat/top/danh-sach-gia-lap"');
  });
  it('keeps a published URL readable when all its places are hidden', async () => {
    const response = await fetch(`${base}/da-lat/top/rong-gia-lap`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Danh sách đang được cập nhật');
  });
  it.each(['/da-lat/top/khong-co', '/khong-co/top/danh-sach-gia-lap', '/da-lat/top/bad_slug'])('returns 404 no-store for %s', async (path) => {
    const response = await fetch(`${base}${path}`);
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('returns partial 503 no-store with retry and recovers on the same URL', async () => {
    const path = '/da-lat/top/danh-sach-gia-lap?audit=s14-down';
    curatedFailed = true;
    try {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const html = await response.text();
      expect(html).toContain('Thử lại');
      expect(html).toContain('Thành phố Giả Lập');
    } finally { curatedFailed = false; }
    expect((await fetch(`${base}${path}`)).status).toBe(200);
  });
});

describe('S13 search production SSR', () => {
  it('renders the accessible GET search form without fetching client-only suggestions', async () => {
    const before = suggestionRequests;
    const response = await fetch(`${base}/da-lat/tim-kiem?q=ca%20phe%20may`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const html = await response.text();
    for (const text of ['method="get"', 'action="/da-lat/tim-kiem"', 'role="combobox"', 'aria-expanded="false"', 'value="ca phe may"', 'noindex, follow']) expect(html).toContain(text);
    expect(suggestionRequests).toBe(before);
    expect(html).not.toContain('role="listbox"');
  });
});

describe('S12 map production SSR', () => {
  it('renders category filters, an accessible place list and visible map attribution', async () => {
    const response = await fetch(`${base}/da-lat/ban-do?category=food`);
    expect(response.status).toBe(200);
    const html = await response.text();
    for (const text of ['Bản đồ', 'Cà phê', 'Ăn uống', 'Quán Giả Lập 1', 'OpenStreetMap', 'OpenFreeMap', 'method="get"', '/da-lat/dia-diem/quan-gia-lap-1']) expect(html).toContain(text);
    expect(html).not.toContain('<canvas');
  });
  it('returns 404 for a missing city', async () => {
    expect((await fetch(`${base}/khong-co/ban-do`)).status).toBe(404);
  });
  it('returns 503 no-store and retry when the map data API fails', async () => {
    mapFailed = true;
    try {
      const response = await fetch(`${base}/da-lat/ban-do?audit=map-down`);
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toContain('Thử lại');
    } finally { mapFailed = false; }
  });
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
    for (const event of ['direction_click', 'call_click', 'fanpage_click']) expect(html).toContain(`data-rd-event="${event}" data-rd-place-id="${detailPlace.id}"`);
    expect(html).not.toMatch(/<script[^>]*data-website-id/);
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
      NUXT_PUBLIC_SITE_URL: 'https://ranhduong.vn', NUXT_PUBLIC_INDEXABLE: 'true', NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION: 'verification-gia-lap',
      NUXT_PUBLIC_LEGAL_CONTACT_EMAIL: 'legal-gia-lap@example.com',
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

function jsonLd(html: string): Record<string, unknown>[] {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].flatMap((match) => JSON.parse(match[1]!) as Record<string, unknown>[]);
}

describe('S17 production technical SEO', () => {
  it.each(['/da-lat', '/da-lat/ca-phe?tags=chill', '/da-lat/khu-vuc/trung-tam', '/da-lat/ban-do', '/da-lat/dia-diem/quan-gia-lap-1', '/da-lat/top/danh-sach-gia-lap', '/da-lat/lich-trinh/lich-trinh-gia-lap', '/da-lat/tim-kiem?q=gia-lap'])('%s has canonical, full social metadata and breadcrumbs in SSR', async (path) => {
    const response = await fetch(`${base}${path}`);
    expect(response.status).toBe(200);
    const html = await response.text();
    const canonical = `https://ranhduong.vn${path.split('?')[0]}`;
    expect(html).toContain(`rel="canonical" href="${canonical}"`);
    expect(html).toContain(`property="og:url" content="${canonical}"`);
    for (const name of ['og:title', 'og:description', 'og:image', 'og:image:width', 'og:image:height', 'og:locale']) expect(html).toContain(`property="${name}"`);
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="google-site-verification" content="verification-gia-lap"');
    const crumbs = jsonLd(html).find((node) => node['@type'] === 'BreadcrumbList');
    expect(crumbs).toBeDefined();
    const elements = crumbs?.itemListElement as { item: string }[];
    expect(elements.at(-1)?.item).toBe(canonical);
  });
  it('renders correct place facts and cover OG derivative, with no fabricated rating', async () => {
    const html = await (await fetch(`${base}/da-lat/dia-diem/with-photo`)).text();
    expect(html).toContain('fake/photo/og.webp');
    const place = jsonLd(html).find((node) => node['@type'] === 'CafeOrCoffeeShop');
    expect(place).toMatchObject({ name: 'Quán Giả Lập 1', geo: { longitude: 0.2, latitude: 0.3 }, openingHoursSpecification: [{ dayOfWeek: 'https://schema.org/Monday', opens: '07:00', closes: '22:00' }] });
    expect(place).not.toHaveProperty('aggregateRating');
    const closed = jsonLd(await (await fetch(`${base}/da-lat/dia-diem/closed`)).text()).find((node) => node['@type'] === 'CafeOrCoffeeShop');
    expect(closed).not.toHaveProperty('openingHoursSpecification');
  });
  it('renders curate and trip item order, preserving repeat visits without unavailable places', async () => {
    const list = jsonLd(await (await fetch(`${base}/da-lat/top/danh-sach-gia-lap`)).text()).find((node) => node['@type'] === 'ItemList');
    const items = list?.itemListElement as { position: number; item: { name: string } }[];
    expect(items.map((item) => item.item.name)).toEqual(['Quán Giả Lập 3', 'Quán Giả Lập 1', 'Quán Giả Lập 2']);
    const trip = jsonLd(await (await fetch(`${base}/da-lat/lich-trinh/lich-trinh-gia-lap`)).text()).find((node) => node['@type'] === 'TouristTrip');
    expect(trip).toMatchObject({ itinerary: { itemListElement: [{ position: 1, item: { name: 'Quán Giả Lập 1' } }, { position: 2, item: { name: 'Quán Giả Lập 2' } }, { position: 3, item: { name: 'Quán Giả Lập 1' } }] } });
  });
  it('serves sitemap index and all child types with actual lastmod and one-hour SWR', async () => {
    const index = await fetch(`${base}/sitemap.xml`);
    expect(index.headers.get('content-type')).toContain('application/xml');
    expect(index.headers.get('cache-control')).toContain('s-maxage=3600');
    const xml = await index.text();
    for (const kind of ['pages', 'places', 'lists', 'itineraries']) {
      expect(xml).toContain(`<loc>https://ranhduong.vn/sitemap-${kind}.xml</loc>`);
      const child = await fetch(`${base}/sitemap-${kind}.xml`);
      expect(child.status).toBe(200);
      expect(child.headers.get('cache-control')).toContain('s-maxage=3600');
      const content = await child.text();
      expect(content).toContain('<lastmod>2026-10-09T08:30:00.000Z</lastmod>');
      expect(content).not.toMatch(/draft|hidden|merged|tim-kiem|\/l\//);
    }
  });
  it('caches successful XML and recovers same URL after an uncached API failure', async () => {
    const cachedPath = '/sitemap-places.xml?audit=s17-cache';
    const first = await (await fetch(`${base}${cachedPath}`)).text();
    const freshPath = '/sitemap-places.xml?audit=s17-failure';
    apiFailed = true;
    try {
      expect(await (await fetch(`${base}${cachedPath}`)).text()).toBe(first);
      const failed = await fetch(`${base}${freshPath}`);
      expect(failed.status).toBe(503);
      expect(failed.headers.get('cache-control')).toBe('no-store');
    } finally { apiFailed = false; }
    const recovered = await fetch(`${base}${freshPath}`);
    expect(recovered.status).toBe(200);
    expect(recovered.headers.get('cache-control')).toContain('s-maxage=3600');
  });
  it('serves crawl rules and an actual 1200×630 default PNG', async () => {
    const robots = await (await fetch(`${base}/robots.txt`)).text();
    for (const rule of ['/admin', '/owner', '/l/', '/*/tim-kiem?', 'Sitemap: https://ranhduong.vn/sitemap.xml']) expect(robots).toContain(rule);
    const image = await fetch(`${base}/og-default.png`);
    expect(image.status).toBe(200);
    const png = Buffer.from(await image.arrayBuffer());
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  });
  it('disables crawling and indexing in staging at runtime and uses the configured origin', async () => {
    const address = api.address();
    if (!address || typeof address === 'string') throw new Error('Missing fixture port');
    const port = await unusedPort();
    const staging = spawn(process.execPath, [fileURLToPath(new URL('../.output/server/index.mjs', import.meta.url))], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: {
      ...process.env, PORT: String(port), HOST: '127.0.0.1', NITRO_PORT: String(port), NITRO_HOST: '127.0.0.1', NITRO_UNIX_SOCKET: '', NITRO_SSL_CERT: '', NITRO_SSL_KEY: '',
      NUXT_API_INTERNAL_BASE: `http://127.0.0.1:${address.port}/v1`, NUXT_PUBLIC_SITE_URL: 'https://staging.ranhduong.vn', NUXT_PUBLIC_INDEXABLE: 'false',
    } });
    try {
      await new Promise<void>((resolve, reject) => {
        staging.stdout?.on('data', (chunk: Buffer) => { if (chunk.toString().includes('Listening on ')) resolve(); });
        staging.once('error', reject); staging.once('exit', () => reject(new Error('Staging server exited')));
      });
      const root = `http://127.0.0.1:${port}`;
      expect(await (await fetch(`${root}/robots.txt`)).text()).toBe('User-agent: *\nDisallow: /\n');
      const page = await fetch(`${root}/da-lat`);
      expect(page.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      const html = await page.text();
      expect(html).toContain('name="robots" content="noindex, follow"');
      expect(html).toContain('href="https://staging.ranhduong.vn/da-lat"');
      expect(await (await fetch(`${root}/sitemap-places.xml`)).text()).not.toContain('<url>');
      expect(await (await fetch(`${root}/sitemap-pages.xml`)).text()).not.toContain('<url>');
      for (const path of ['/dieu-khoan', '/quyen-rieng-tu', '/ghi-nguon']) {
        const legal = await fetch(`${root}${path}`);
        expect(legal.status).toBe(200);
        expect(legal.headers.get('x-robots-tag')).toBe('noindex, nofollow');
        const content = await legal.text();
        expect(content).toContain('name="robots" content="noindex, follow"');
        expect(content).toContain(`href="https://staging.ranhduong.vn${path}"`);
      }
    } finally {
      if (staging.exitCode === null && staging.signalCode === null) { const exited = once(staging, 'exit'); staging.kill(); await exited; }
    }
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
