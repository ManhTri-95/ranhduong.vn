import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createServer as createPortServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const city = {
  slug: 'da-lat', name: 'Thành phố Giả Lập', accent: '#f4bd33',
  center: { type: 'Point', coordinates: [0.5, 0.5] }, mapBounds: [0, 0, 1, 1],
  zones: [{ slug: 'trung-tam', name: 'Trung tâm Giả Lập', center: { type: 'Point', coordinates: [0.25, 0.25] } }, { slug: 'phia-nam', name: 'Phía Nam Giả Lập', center: { type: 'Point', coordinates: [0.75, 0.75] } }],
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
let seasonMode: 'flower' | 'rain' | 'sunflower' | 'none' = 'none';
let seasonFailed = false;
let weatherMode: 'fog' | 'sun' | 'cloud' | 'rain' | 'expired' | 'none' = 'none';
let homeEmpty = false;
let homePlacesFailed = false;
let geographicRequests = 0;
let templatePreviewRequests = 0;
let areaWithPhotos = false;
const areaQueries: URLSearchParams[] = [];
const mapQueries: URLSearchParams[] = [];
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
    const paths: Record<string, string[]> = { pages: ['/da-lat', '/da-lat/tao-lich-trinh', '/da-lat/ca-phe', '/da-lat/khu-vuc/trung-tam'], places: ['/da-lat/dia-diem/quan-gia-lap-1', '/da-lat/dia-diem/closed'], lists: ['/da-lat/top/danh-sach-gia-lap'], itineraries: ['/da-lat/lich-trinh/lich-trinh-gia-lap'] };
    res.end(JSON.stringify({ items: (paths[kind ?? ''] ?? []).map((path) => ({ path, lastmod: '2026-10-09T08:30:00.000Z' })) }));
  } else if (url.pathname === '/v1/cities/da-lat') {
    res.end(JSON.stringify(city));
  } else if (url.pathname === '/v1/cities/da-lat/now') {
    if (seasonFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi mùa Giả Lập' }));
    const accents = { flower: '#E58FA8', rain: '#8DB3CF', sunflower: '#E9B824', none: city.accent };
    // Keep fresh fixtures inside the 15-minute window; a 1ms clock skew must not invalidate them.
    // Expired is a full minute old: the test and Nuxt server are separate processes whose Windows clocks can differ by a few ms.
    // Exact freshness boundaries are covered by contracts/weather.test.ts.
    res.end(JSON.stringify({ accent: accents[seasonMode], season: seasonMode === 'none' ? null : { key: `mua-${seasonMode}`, kind: seasonMode === 'rain' ? 'rain' : 'flower', from: '01-01', to: '12-31', accent: accents[seasonMode], title: 'Banner mùa Giả Lập', sub: 'Mô tả mùa Giả Lập', illustration: seasonMode === 'flower' ? 'cherry-blossom' : seasonMode === 'sunflower' ? 'wild-sunflower' : 'rain' }, featuredItinerary: seasonMode === 'none' ? null : { slug: 'noi-bat-gia-lap', title: 'Lịch trình mùa Giả Lập', days: 1, transport: 'motorbike', pace: 'relaxed' }, weather: weatherMode === 'none' ? null : { state: weatherMode === 'expired' ? 'rain' : weatherMode, temperatureC: 18.4, isDay: true, rainSoon: false, observedAt: new Date(Date.now() - 60_000).toISOString(), expiresAt: new Date(Date.now() + (weatherMode === 'expired' ? -60_000 : 840_000)).toISOString() }, expiresAt: new Date(Date.now() + 900_000).toISOString() }));
  } else if (url.pathname === '/v1/cities/da-lat/places') {
    const areaRequest = url.searchParams.has('zone') && !url.searchParams.has('bbox');
    if (areaRequest) areaQueries.push(new URLSearchParams(url.searchParams));
    if (url.searchParams.has('bbox')) { geographicRequests++; mapQueries.push(new URLSearchParams(url.searchParams)); }
    if (homePlacesFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi địa điểm Giả Lập' }));
    if (url.searchParams.get('limit') === '6' && url.searchParams.has('q')) suggestionRequests++;
    if (url.searchParams.has('bbox') && mapFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi bản đồ Giả Lập' }));
    res.end(JSON.stringify({
      items: (homeEmpty ? [] : url.searchParams.has('bbox') ? items.map((place) => ({ ...place, location: { type: 'Point', coordinates: [0.5, 0.5] } })) : url.searchParams.has('cursor') ? items.slice(20) : url.searchParams.has('tags') ? items.slice(0, 5) : items.slice(0, 20)).map((place, index) => areaWithPhotos && areaRequest && index === 0 ? { ...place, coverKey: 'fake/area-photo' } : place),
      nextCursor: homeEmpty || url.searchParams.has('q') || url.searchParams.has('cursor') || url.searchParams.has('tags') ? undefined : cursor,
      tags: areaRequest ? homeEmpty ? [] : [{ slug: 'chill', count: 25 }, { slug: 'an-sang', count: 8 }, { slug: 'gia-dinh', count: 6 }] : [{ slug: 'chill', count: 25 }],
    }));
  } else if (url.pathname === '/v1/cities/da-lat/itineraries/templates') {
    res.end(JSON.stringify({ items: homeEmpty ? [] : [{ slug: 'lich-trinh-gia-lap', title: 'Lịch trình Giả Lập', days: 2, transport: 'motorbike', pace: 'relaxed', stopCount: 4, season: 'Mùa lịch Giả Lập' }] }));
  } else if (url.pathname.startsWith('/v1/cities/da-lat/itineraries/templates/')) {
    templatePreviewRequests++;
    if (templateFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi lịch trình Giả Lập' }));
    const slug = url.pathname.split('/').at(-1);
    if (!['lich-trinh-gia-lap', 'rong-gia-lap', 'anh-lich-trinh-gia-lap'].includes(slug ?? '')) return res.writeHead(404).end(JSON.stringify({ code: 'NOT_FOUND', message: 'Không tìm thấy lịch trình' }));
    res.end(JSON.stringify({
      slug, title: 'Lịch trình Giả Lập', description: 'Mô tả lịch trình Giả Lập', seoTitle: 'Lịch trình Google Giả Lập', seoDescription: 'Mô tả Google Giả Lập',
      season: 'Mùa Giả Lập', style: 'Đi chậm', transport: 'motorbike', pace: 'relaxed',
      days: [{ day: 1, stops: slug === 'rong-gia-lap' ? [] : [templateStop(1, 1), slug === 'anh-lich-trinh-gia-lap' ? { ...templateStop(2, 1), place: { ...templateStop(2, 1).place, coverKey: 'fake/journey-photo' } } : templateStop(2, 1), templateStop(3, 1, false)] }, { day: 2, stops: slug === 'rong-gia-lap' ? [] : [templateStop(1, 2)] }],
    }));
  } else if (url.pathname.startsWith('/v1/cities/da-lat/curated-lists')) {
    if (curatedFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi danh sách Giả Lập' }));
    const list = { slug: 'danh-sach-gia-lap', title: 'Danh sách Giả Lập', description: 'Mô tả Giả Lập theo thứ tự đã chọn.' };
    if (url.pathname === '/v1/cities/da-lat/curated-lists') res.end(JSON.stringify({ items: homeEmpty ? [] : [{ ...list, placeCount: 3 }] }));
    else if (url.pathname.endsWith('/danh-sach-gia-lap')) res.end(JSON.stringify({ ...list, places: [items[2], items[0], items[1]] }));
    else if (url.pathname.endsWith('/rong-gia-lap')) res.end(JSON.stringify({ ...list, slug: 'rong-gia-lap', places: [] }));
    else if (url.pathname.endsWith('/nhat-ky-dai-gia-lap')) res.end(JSON.stringify({ ...list, slug: 'nhat-ky-dai-gia-lap', title: 'Tiêu đề tiếng Việt rất dài Giả Lập '.repeat(5), description: 'Mô tả biên tập Giả Lập chỉ hiển thị một lần. '.repeat(8), places: items.slice(0, 22) }));
    else if (url.pathname.endsWith('/mot-diem-gia-lap')) res.end(JSON.stringify({ ...list, slug: 'mot-diem-gia-lap', title: 'Giả Lập', description: '', places: [items[2]] }));
    else res.writeHead(404).end(JSON.stringify({ code: 'NOT_FOUND', message: 'Không tìm thấy danh sách' }));
  } else if (url.pathname === '/v1/cities/da-lat/places/old-slug') {
    res.writeHead(301, { location: '/v1/cities/da-lat/places/quan-gia-lap-1' }).end();
  } else if (['quan-gia-lap-1', 'closed', 'with-photo', 'missing-info', 'focus-gia-lap'].some((slug) => url.pathname === `/v1/cities/da-lat/places/${slug}`)) {
    if (detailFailed) return res.writeHead(503).end(JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Lỗi chi tiết Giả Lập' }));
    const slug = url.pathname.split('/').at(-1);
    res.end(JSON.stringify({
      place: { ...detailPlace, slug, status: slug === 'closed' ? 'closed' : 'active',
        ...(slug === 'focus-gia-lap' ? { name: 'Điểm mở từ ghi chép Giả Lập' } : {}),
        photos: slug === 'with-photo' ? Array.from({ length: 3 }, (_, index) => ({ key: index === 0 ? 'fake/photo' : `fake/photo-${index + 1}`, source: 'self', credit: 'Người Chụp Giả Lập', license: 'Giấy phép Giả Lập', sourceUrl: 'https://example.com/fake' })) : [],
        ...(slug === 'with-photo' ? { bestTime: ['morning', 'sunset'], transport: ['motorbike'], cover: 'partial', priceLevel: 2 } : {}),
        ...(slug === 'missing-info' ? { category: 'attraction', unconfirmed: false, location: undefined, address: undefined, practicalNotes: undefined, contact: {}, openingHours: [], lastVerifiedAt: undefined } : {}) },
      nearby: items.slice(1, 7),
    }));
  } else {
    res.writeHead(404).end(JSON.stringify({ code: 'NOT_FOUND', message: 'Không tìm thấy thành phố Giả Lập' }));
  }
});

describe('S38 itinerary creation production SSR', () => {
  it('renders an indexable form with canonical, one-hour SWR and no initial map', async () => {
    const response = await fetch(`${base}/da-lat/tao-lich-trinh`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    const html = await response.text();
    expect(html).toContain('rel="canonical" href="https://ranhduong.vn/da-lat/tao-lich-trinh"');
    expect(html).toContain('name="robots" content="index, follow"');
    for (const text of ['Mình đi mấy ngày?', 'Khi nào mình lên đường?', 'di chuyển bằng gì?', 'đi cùng ai?', 'Bạn thích ghé những đâu?', 'Đi thong thả', 'Bạn ở khu nào?', 'Bỏ qua', 'Ghim trên bản đồ', 'Trung tâm Giả Lập', 'Lên lịch giúp mình', 'không hiện trong lịch chia sẻ']) expect(html).toContain(text);
    expect(html).not.toContain('<canvas');
    expect(html).not.toMatch(/<link[^>]*maplibre-gl-worker[^>]*>/);
    expect(html).not.toContain('"stayLocation"');
    expect(html).toContain('type="date"');
  });
  it('has crawlable entry links on home and template pages and a pages sitemap URL', async () => {
    for (const path of ['/da-lat?audit=s38-entry', '/da-lat/lich-trinh/lich-trinh-gia-lap']) {
      expect(await (await fetch(`${base}${path}`)).text()).toContain('href="/da-lat/tao-lich-trinh"');
    }
    expect(await (await fetch(`${base}/sitemap-pages.xml`)).text()).toContain('<loc>https://ranhduong.vn/da-lat/tao-lich-trinh</loc>');
  });
  it('keeps unavailable and missing city responses no-store and recovers the same URL', async () => {
    apiFailed = true;
    const path = '/da-lat/tao-lich-trinh?audit=s38-error';
    try {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toContain('name="robots" content="noindex, follow"');
    } finally { apiFailed = false; }
    expect((await fetch(`${base}${path}`)).status).toBe(200);
    const missing = await fetch(`${base}/thanh-pho-khong-co/tao-lich-trinh`);
    expect(missing.status).toBe(404);
    expect(missing.headers.get('cache-control')).toBe('no-store');
  });
});

describe('S20 static legal pages production SSR', () => {
  it('S37 explains the guest cookie and approximate private accommodation in SSR', async () => {
    const html = await (await fetch(`${base}/quyen-rieng-tu`)).text();
    for (const text of ['gid', '1 năm', '0,005°', 'nơi ở', 'không công khai']) expect(html).toContain(text);
    expect(html).toContain('21/10/2026');
  });
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
        const lastmod = path === '/ghi-nguon' ? '2026-10-22T00:00:00.000Z' : path === '/quyen-rieng-tu' ? '2026-10-21T00:00:00.000Z' : '2026-10-12T00:00:00.000Z';
        const entry = `<url><loc>https://ranhduong.vn${path}</loc><lastmod>${lastmod}</lastmod></url>`;
        if (kind === 'pages') expect(xml).toContain(entry);
        else expect(xml).not.toContain(`<loc>https://ranhduong.vn${path}</loc>`);
      }
    }
  });
});

describe('S16 public itinerary production SSR', () => {
  it('renders both days, saved times, notes, directions, sharing and canonical/OG with seasonal 15-minute SWR', async () => {
    const response = await fetch(`${base}/da-lat/lich-trinh/lich-trinh-gia-lap`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=900');
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

describe('S30 itinerary ticket production SSR', () => {
  const meta = (html: string, attr: string) => html.match(new RegExp(`<meta ${attr}="([^"]+)"`))?.[1];
  it('uses the template ticket as OG image and links the story ticket for sharing', async () => {
    const html = await (await fetch(`${base}/da-lat/lich-trinh/lich-trinh-gia-lap?audit=s30-og`)).text();
    const og = `${apiBase}/cities/da-lat/itineraries/templates/lich-trinh-gia-lap/ticket.png?format=og`;
    expect(meta(html, 'property="og:image" content')).toBe(og);
    expect(meta(html, 'name="twitter:image" content')).toBe(og);
    expect(og).not.toContain('0123456789abcdef01234567');
    expect(html).toMatch(new RegExp(`href="${apiBase}/cities/da-lat/itineraries/templates/lich-trinh-gia-lap/ticket\\.png\\?format=story"[^>]*>\\s*Tạo vé để chia sẻ`));
  });
  it('falls back to the default OG image when the template cannot load', async () => {
    templateFailed = true;
    try {
      const html = await (await fetch(`${base}/da-lat/lich-trinh/lich-trinh-gia-lap?audit=s30-og-down`)).text();
      expect(meta(html, 'property="og:image" content')).toBe('https://ranhduong.vn/og-default.png');
    } finally { templateFailed = false; }
  });
  it('credits the ticket fonts on /ghi-nguon', async () => {
    const html = await (await fetch(`${base}/ghi-nguon`)).text();
    for (const text of ['id="font-ve"', 'Lora', 'Be Vietnam Pro', 'Patrick Hand', 'SIL Open Font License']) expect(html).toContain(text);
  });
});

describe('Journey Atlas production SSR', () => {
  it('keeps every chapter, genuine schedule and share action accessible without loading a map', async () => {
    const html = await (await fetch(`${base}/da-lat/lich-trinh/lich-trinh-gia-lap?audit=journey-atlas`)).text();
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('Cuốn bản đồ hành trình');
    expect(html).toContain('aria-label="Tổng quan từng ngày"');
    expect(html).toContain('href="#day-2"');
    expect(html).toMatch(/<section[^>]*class="rd-atlas-day"[^>]*>/);
    expect(html).not.toMatch(/<section[^>]*class="rd-atlas-day"[^>]*display:\s*none/);
    expect(html.indexOf('id="itinerary-share-title"')).toBeLessThan(html.indexOf('id="journey-chapters"'));
    expect(html.match(/id="itinerary-share-title"/g)).toHaveLength(1);
    expect(html).toContain('Ảnh điểm đến · Thành phố Giả Lập');
    expect(html).toContain('Ảnh đang cập nhật');
    expect(html).toContain('(dự kiến)');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('Đã hoàn thành');
    expect(html).toContain('href="/da-lat#kham-pha"');
  });

  it('uses supplied stop photography for cover and postcard instead of substituting a destination image', async () => {
    const html = await (await fetch(`${base}/da-lat/lich-trinh/anh-lich-trinh-gia-lap?audit=atlas-photo`)).text();
    expect(html).toContain('fake/journey-photo');
    expect(html).toContain('Trong hành trình · Quán Giả Lập 2');
    expect(html).toMatch(/<img[^>]*fake\/journey-photo[^>]*loading="eager"[^>]*fetchpriority="high"/);
    expect(html).toMatch(/<img[^>]*fake\/journey-photo[^>]*loading="lazy"/);
    expect(html).not.toContain('/images/home/city-');
    expect(html).toContain('id="stop-1-3"');
    expect(html).toContain('Điểm ghé đang cập nhật');
  });
});

describe('S24 weather production SSR', () => {
  it.each([['fog', 'Có sương'], ['sun', 'Nắng đẹp'], ['cloud', 'Nhiều mây'], ['rain', 'Mưa']] as const)('renders fresh %s weather and keeps source/disclaimer visible', async (mode, label) => {
    weatherMode = mode;
    try {
      const response = await fetch(`${base}/da-lat?audit=s24-${mode}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const html = await response.text();
      expect(html).toContain('id="city-weather-title"');
      expect(html).toContain(`${label} · 18°C`);
      expect(html).toContain('WeatherAPI.com');
      expect(html).toContain('Thời tiết chỉ để tham khảo');
      expect(html.includes('Tìm quán có mái che')).toBe(mode === 'rain');
      if (mode === 'rain') expect(html).toContain('href="/da-lat/ban-do?rainSafe=true"');
    } finally { weatherMode = 'none'; }
  });
  it('never extends weather freshness by caching the home HTML on the same URL', async () => {
    const path = '/da-lat?audit=s24-freshness';
    weatherMode = 'rain';
    try {
      expect(await (await fetch(`${base}${path}`)).text()).toContain('id="city-weather-title"');
      weatherMode = 'expired';
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).not.toContain('id="city-weather-title"');
      expect(html).toContain('Quán Giả Lập');
      expect(html).not.toContain('Chưa tải được hết dữ liệu');
      weatherMode = 'none';
      expect(await (await fetch(`${base}${path}`)).text()).not.toContain('id="city-weather-title"');
    } finally { weatherMode = 'none'; }
  });
  it('preselects the rain chip and preserves independent GET category/rain filters', async () => {
    const html = await (await fetch(`${base}/da-lat/ban-do?rainSafe=true&category=food&audit=s24-map`)).text();
    expect(html).toMatch(/name="rainSafe" value="false"[^>]*aria-pressed="true"[^>]*>Trú mưa được/);
    expect(html).toContain('type="hidden" name="rainSafe" value="true"');
    expect(html).toContain('type="hidden" name="category" value="food"');
    const unselected = await (await fetch(`${base}/da-lat/ban-do?rainSafe=false&audit=s24-off`)).text();
    expect(unselected).toMatch(/name="rainSafe" value="true"[^>]*aria-pressed="false"[^>]*>Trú mưa được/);
  });
});

describe('S23 seasonal production SSR', () => {
  it.each([['flower', '#E58FA8'], ['rain', '#8DB3CF'], ['sunflower', '#E9B824']] as const)('renders %s theme, banner and a featured card outside the list limit', async (mode, accent) => {
    seasonMode = mode;
    try {
      const response = await fetch(`${base}/da-lat?audit=s23-${mode}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const html = await response.text();
      expect(html).toContain(`--season-accent:${accent}`);
      expect(html).toContain('id="season-banner-title"');
      expect(html).toContain('Banner mùa Giả Lập');
      expect(html).toContain('Mô tả mùa Giả Lập');
      expect(html).toContain('href="/da-lat/lich-trinh/noi-bat-gia-lap"');
      expect(html.indexOf('Lịch trình mùa Giả Lập', html.indexOf('id="itinerary-strip-title"'))).toBeLessThan(html.indexOf('Lịch trình Giả Lập', html.indexOf('id="itinerary-strip-title"')));
    } finally { seasonMode = 'none'; }
  });
  it('uses city color and no banner without a matching season', async () => {
    const html = await (await fetch(`${base}/da-lat?audit=s23-default`)).text();
    expect(html).toContain('--season-accent:#f4bd33');
    expect(html).not.toContain('id="season-banner-title"');
  });
  it('uses the city default and retry when /now fails, then recovers on the same URL', async () => {
    const path = '/da-lat?audit=s23-retry';
    seasonFailed = true;
    try {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const html = await response.text();
      expect(html).toContain('--season-accent:#f4bd33');
      expect(html).toContain('Thử lại');
      expect(html).not.toContain('id="season-banner-title"');
    } finally { seasonFailed = false; }
    expect((await fetch(`${base}${path}`)).status).toBe(200);
  });
});

describe('S14 curated lists production SSR', () => {
  it('renders a one-place journal without inventing introductory copy or photographs', async () => {
    const html = await (await fetch(`${base}/da-lat/top/mot-diem-gia-lap`)).text();
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
    expect(main).toContain('1 địa điểm');
    expect(main).toContain('Ảnh đang cập nhật');
    expect(main).not.toContain('collection-intro-title');
    expect(main.match(/class="rd-curated-page__rank"/g)).toHaveLength(1);
    expect(main).toContain('Sao chép liên kết');
    expect(main).not.toContain('maplibregl-canvas');
  });
  it('keeps a long description in one introduction and all 22 entries crawlable', async () => {
    const html = await (await fetch(`${base}/da-lat/top/nhat-ky-dai-gia-lap`)).text();
    const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
    expect(main).toContain('collection-intro-title');
    expect(main.match(/Mô tả biên tập Giả Lập chỉ hiển thị một lần\./g)).toHaveLength(8);
    expect(main.match(/class="rd-curated-page__rank"/g)).toHaveLength(22);
    expect(main).toContain('/da-lat/dia-diem/quan-gia-lap-22');
  });
  it('renders title, description and numbered cards in saved order, canonical and SWR 15min', async () => {
    const response = await fetch(`${base}/da-lat/top/danh-sach-gia-lap`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=900');
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
  it('opens a real place independently of result membership while preserving canonical and filter semantics', async () => {
    const response = await fetch(`${base}/da-lat/ban-do?place=focus-gia-lap&category=food`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('Điểm mở từ ghi chép Giả Lập');
    expect(html).toContain('Địa điểm bạn vừa mở nằm ngoài kết quả đang lọc');
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).toContain('rel="canonical" href="https://ranhduong.vn/da-lat/ban-do"');
    expect(html.includes('href="/da-lat/ban-do?category=food"')).toBe(true);
    expect(mapQueries.at(-1)?.has('place')).toBe(false);
    expect(mapQueries.at(-1)?.get('category')).toBe('food');
  });
  it.each([{ slug: 'closed' }, { slug: 'missing-info' }, { slug: 'khong-co-gia-lap' }, { slug: ['quan-gia-lap-1', 'closed'] }])('keeps the city map usable for unavailable focus $slug', async ({ slug }) => {
    const query = Array.isArray(slug) ? slug.map(value => `place=${value}`).join('&') : `place=${slug}`;
    const response = await fetch(`${base}/da-lat/ban-do?${query}`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('Chưa có vị trí để mở cho địa điểm này');
    expect(html).toContain('Quán Giả Lập 1');
    expect(html).toContain('name="robots" content="noindex, follow"');
  });
  it('Living Map renders a journal discovery panel and keyboard alternatives to all three sheet levels', async () => {
    const html = await (await fetch(`${base}/da-lat/ban-do?audit=living-map`)).text();
    for (const text of ['BẢN ĐỒ KHÁM PHÁ', 'Bản đồ biết kể chuyện.', 'Đến danh sách địa điểm', 'Chiều cao danh sách', 'Bản đồ', 'Nửa màn', 'Danh sách', 'Lọc thêm', 'Ghi chép ban đầu của thành phố', 'OpenStreetMap', 'OpenMapTiles', 'OpenFreeMap']) expect(html.includes(text), text).toBe(true);
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html.includes('role="search"')).toBe(true);
    expect(html.includes('id="map-results"')).toBe(true);
    expect(html.includes('href="/da-lat#lich-trinh"')).toBe(true);
    expect(html.includes('aria-label="Xem ghim Quán Giả Lập 1 trên bản đồ"')).toBe(true);
    expect(html.includes('<canvas')).toBe(false);
  });
  it('Living Map preserves supported search/category/zone/tag/rain filters in GET forms and real API queries', async () => {
    const html = await (await fetch(`${base}/da-lat/ban-do?q=c%C3%A0%20ph%C3%AA&category=cafe&zone=trung-tam&tags=chill&rainSafe=true&audit=living-filters`)).text();
    const query = mapQueries.at(-1);
    expect(query?.get('q')).toBe('cà phê');
    for (const [key, value] of [['category', 'cafe'], ['zone', 'trung-tam'], ['tags', 'chill'], ['rainSafe', 'true'], ['bbox', '0,0,1,1']] as const) expect(query?.get(key)).toBe(value);
    for (const text of ['value="cà phê"', 'name="category" value="cafe"', 'name="tags" value="chill"', 'name="zone"', 'Trung tâm Giả Lập', 'Đặc điểm địa điểm', 'Xóa bộ lọc']) expect(html.includes(text), text).toBe(true);
    expect(html.includes('rel="canonical" href="https://ranhduong.vn/da-lat/ban-do"')).toBe(true);
    expect(html.includes('name="robots" content="noindex, follow"')).toBe(true);
    expect(html.includes('name="priceLevel"')).toBe(false);
    expect(html.includes('name="bestTime"')).toBe(false);
  });
  it('Living Map keeps empty states and GET tag-checkbox arrays usable without JavaScript', async () => {
    homeEmpty = true;
    try {
      const response = await fetch(`${base}/da-lat/ban-do?tags=chill&tags=view-doi&audit=living-empty`);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(mapQueries.at(-1)?.get('tags')).toBe('chill,view-doi');
      expect(html.includes('Chưa gặp nơi hợp gu?')).toBe(true);
      expect(html.includes('0 địa điểm')).toBe(true);
      expect(html.includes('0+ địa điểm')).toBe(false);
      expect(html.includes('method="get"')).toBe(true);
    } finally { homeEmpty = false; }
  });
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
      const html = await response.text();
      expect(html).toContain('Thử lại');
      expect(html.includes('Chưa tải được địa điểm')).toBe(true);
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
    expect(res.headers.get('cache-control')).toContain('s-maxage=900');
    const html = await res.text();
    for (const text of ['Quán Giả Lập 1', 'Ghi chú Giả Lập', 'Địa chỉ Giả Lập', 'Ảnh đang cập nhật', 'Thông tin chưa được quán xác nhận', '07:00–22:00', 'Đi tiếp', 'Quán Giả Lập 7', 'tel:+84912345678', 'https://facebook.com/fake']) expect(html).toContain(text);
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

  it('Place Story keeps populated chapters, one H1, deferred maps and a real itinerary action', async () => {
    const geographicBefore = geographicRequests;
    const html = await (await fetch(`${base}/da-lat/dia-diem/with-photo?story=chapters`)).text();
    const chapters = ['place-reveal', 'first-impression', 'photo-journal', 'before-you-go', 'right-moment', 'find-your-way', 'make-it-your-journey', 'next-turn'];
    expect(chapters.every(id => html.includes(`id="${id}"`))).toBe(true);
    const positions = chapters.map(id => html.indexOf(`id="${id}"`));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html.includes('0.3000° B / 0.2000° Đ')).toBe(true);
    expect(html.includes('Tính năng thêm địa điểm vào lịch trình cá nhân chưa được mở.')).toBe(true);
    expect(/<button[^>]*disabled[^>]*>Thêm vào lịch trình/.test(html)).toBe(false);
    expect(html.includes('href="/da-lat#lich-trinh"')).toBe(true);
    expect(html.includes('Sao chép địa chỉ')).toBe(true);
    for (const anchor of ['kham-pha', 'lich-trinh', 'cam-hung']) expect(html.includes(`href="/da-lat#${anchor}"`)).toBe(true);
    expect(html.match(/<canvas|<link[^>]*maplibre[^>]*>/g) ?? []).toEqual([]);
    expect(geographicRequests).toBe(geographicBefore);
  });

  it('Place Story renders only actual photographs, credits and stored visiting moments', async () => {
    const html = await (await fetch(`${base}/da-lat/dia-diem/with-photo?story=photos`)).text();
    expect(html.match(/class="rd-gallery__card(?:\s|"|--)/g)).toHaveLength(3);
    expect(html.includes('loading="lazy"')).toBe(true);
    expect(/href="[^"]*\/fake\/photo\/1200\.webp"/.test(html)).toBe(true);
    expect(html.includes('Nguồn ảnh (3)')).toBe(true);
    expect(html.match(/class="is-recommended"/g)).toHaveLength(2);
    expect(html.includes('Mức 2 / 4')).toBe(true);
    expect(html.includes('Có chỗ che mưa và ngoài trời')).toBe(true);
    expect(html.includes('Đây không phải giờ mở cửa hay dự báo thời tiết.')).toBe(true);
  });

  it('Place Story keeps missing information honest and omits unsupported timing and map controls', async () => {
    const html = await (await fetch(`${base}/da-lat/dia-diem/missing-info`)).text();
    for (const text of ['Ảnh đang cập nhật', 'Chưa rõ mức giá', 'Chưa rõ mái che', 'Giờ mở cửa đang cập nhật', 'Địa chỉ đang cập nhật', 'Chưa có ngày xác minh', 'Thông tin liên hệ đang cập nhật']) expect(html.includes(text), text).toBe(true);
    expect(html.includes('id="right-moment"')).toBe(false);
    expect(html.includes('>Xem vị trí trên bản đồ<')).toBe(false);
    expect(html.includes('https://www.google.com/maps/dir/')).toBe(false);
    expect(html.includes('Ghi chép đã được địa điểm xác nhận')).toBe(false);
  });

  it('closed places keep 200 without directions', async () => {
    const res = await fetch(`${base}/da-lat/dia-diem/closed`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Đã đóng cửa');
    expect(html).toContain('Đi tiếp');
    expect(html).not.toContain('https://www.google.com/maps/dir/');
    for (const id of ['right-moment', 'find-your-way', 'make-it-your-journey']) expect(html.includes(`id="${id}"`)).toBe(false);
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
/** Gốc API giả (có /v1), cũng là NUXT_PUBLIC_API_BASE của Nuxt test. */
let apiBase: string;

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
  apiBase = `http://127.0.0.1:${address.port}/v1`;
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

describe('Local Field Guide production SSR', () => {
  const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]!.replaceAll('&amp;', '&'));
  it('renders a single area identity, top navigation, genuine tag moments and an honest visual-first collection', async () => {
    const geographicBefore = geographicRequests;
    const html = await (await fetch(`${base}/da-lat/khu-vuc/trung-tam?audit=field-guide`)).text();
    expect(geographicRequests).toBe(geographicBefore);
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('SỔ TAY ĐỊA PHƯƠNG');
    expect(html.indexOf('aria-label="Khám phá theo khu vực"')).toBeLessThan(html.indexOf('id="place-listing-title"'));
    expect(html).toContain('Đang hiển thị 20 địa điểm');
    expect(html).toContain('Ảnh đang cập nhật');
    expect(html).toContain('id="field-moments-title"');
    expect(html).toContain('HỌA TIẾT TRANG TRÍ · CHƯA TẢI BẢN ĐỒ');
    expect(html).toContain('name="q"');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('Đang mở');
    expect(html).not.toMatch(/<link[^>]*maplibre-gl-worker/);
    expect(hrefs(html)).toContain('/da-lat/khu-vuc/phia-nam');
    expect(html).not.toContain('chỗ nào cũng được hỏi lại');
  });
  it('passes supported search filters to the existing API and preserves them across area and map links', async () => {
    const html = await (await fetch(`${base}/da-lat/khu-vuc/trung-tam?q=cafe&category=food&tags=chill&rainSafe=true&cursor=${cursor}&audit=field-query`)).text();
    const query = areaQueries.at(-1)!;
    for (const [key, value] of [['q', 'cafe'], ['category', 'food'], ['tags', 'chill'], ['rainSafe', 'true'], ['zone', 'trung-tam']] as const) expect(query.get(key)).toBe(value);
    expect(query.has('cursor')).toBe(false);
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).toContain('rel="canonical" href="https://ranhduong.vn/da-lat/khu-vuc/trung-tam"');
    const other = new URL(hrefs(html).find(href => href.startsWith('/da-lat/khu-vuc/phia-nam?'))!, base);
    expect(Object.fromEntries(other.searchParams)).toEqual({ q: 'cafe', tags: 'chill', category: 'food', rainSafe: 'true' });
    const map = new URL(hrefs(html).find(href => href.startsWith('/da-lat/ban-do?'))!, base);
    expect(map.searchParams.get('zone')).toBe('trung-tam');
    expect(map.searchParams.get('q')).toBe('cafe');
    expect(map.searchParams.get('rainSafe')).toBe('true');
    expect(map.searchParams.has('cursor')).toBe(false);
    expect(html).toContain('tối đa 20 nơi');
  });
  it('retains category and shelter context in crawlable next-page links', async () => {
    const html = await (await fetch(`${base}/da-lat/khu-vuc/trung-tam?category=cafe&rainSafe=true&audit=field-page`)).text();
    const next = new URL(hrefs(html).find(href => href.includes('cursor='))!, base);
    expect(Object.fromEntries(next.searchParams)).toEqual({ category: 'cafe', rainSafe: 'true', cursor });
  });
  it('uses only actual place covers with reserved priority/lazy images and preserves result order', async () => {
    areaWithPhotos = true;
    try {
      const html = await (await fetch(`${base}/da-lat/khu-vuc/trung-tam?audit=field-photo`)).text();
      expect(html).toContain('Một nơi trong khu · Quán Giả Lập 1');
      expect(html).toMatch(/<img[^>]*fake\/area-photo[^>]*loading="eager"[^>]*fetchpriority="high"/);
      expect(html).toMatch(/<img[^>]*fake\/area-photo[^>]*loading="lazy"/);
      expect(html).toContain('rd-field-grid__wide');
      const grid = html.slice(html.indexOf('class="rd-field-grid"'));
      expect(grid.indexOf('/dia-diem/quan-gia-lap-1')).toBeLessThan(grid.indexOf('/dia-diem/quan-gia-lap-2'));
      expect(grid.indexOf('/dia-diem/quan-gia-lap-2')).toBeLessThan(grid.indexOf('/dia-diem/quan-gia-lap-3'));
      expect(html).not.toContain('/images/home/');
    } finally { areaWithPhotos = false; }
  });
  it('omits unsupported moments for an empty area and retains real alternative navigation', async () => {
    homeEmpty = true;
    try {
      const html = await (await fetch(`${base}/da-lat/khu-vuc/trung-tam?audit=field-empty`)).text();
      expect(html).toContain('Đang hiển thị 0 địa điểm');
      expect(html).toContain('Khu này mình chưa ghi chép chỗ nào');
      expect(html).not.toContain('id="field-moments-title"');
      expect(html).toContain('Xem trước vị trí');
      expect(hrefs(html)).toContain('/da-lat/khu-vuc/phia-nam');
    } finally { homeEmpty = false; }
  });
});

describe('SSR trang danh mục và khu vực trên bản production', () => {
  it.each([
    '/da-lat/ca-phe', '/da-lat/an-uong', '/da-lat/tham-quan', '/da-lat/hoat-dong',
    '/da-lat/khu-vuc/trung-tam', '/da-lat/ca-phe?tags=chill',
    `/da-lat/ca-phe?cursor=${cursor}`, '/da-lat/khu-vuc/trung-tam?tags=chill',
    `/da-lat/khu-vuc/trung-tam?cursor=${cursor}`,
  ])('%s render nội dung SSR và cache SWR 15 phút', async (path) => {
    const res = await fetch(`${base}${path}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('s-maxage=900');
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
      expect(recovered.headers.get('cache-control')).toContain('s-maxage=900');
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

describe('UX home and itinerary SSR', () => {
  it('renders the seven journal scenes, real city coordinates and deferred authentic previews', async () => {
    const initialTemplateRequests = templatePreviewRequests;
    const html = await (await fetch(`${base}/da-lat?audit=living-route`)).text();
    const scenes = ['home-title', 'interests-title', 'route-story-title', 'featured-places-title', 'map-preview-title', 'lich-trinh', 'closing-title'];
    const positions = scenes.map(id => html.indexOf(`id="${id}"`));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html.match(/class="rd-chapter__number"/g)).toHaveLength(7);
    for (const text of ['Rẽ một chút.', 'Hay cả chuyến đi.', 'Tự tạo lịch trình', '0.5000° B / 0.5000° Đ', 'không phải tuyến chỉ đường', 'Đi khám phá thôi']) expect(html).toContain(text);
    expect(html).toContain('href="/da-lat/tham-quan?tags=view-doi"');
    expect(html).toContain('href="/da-lat/tham-quan?tags=song-ao"');
    expect(html).not.toMatch(/<button(?=[^>]*disabled)(?=[^>]*aria-describedby="journal-coming-note")[^>]*>/);
    expect(templatePreviewRequests).toBe(initialTemplateRequests);
    expect(html).not.toContain('draggable="true"');
  });
  it('keeps discovery, real place details and available itineraries crawlable without initializing a map', async () => {
    const initialGeographicRequests = geographicRequests;
    const response = await fetch(`${base}/da-lat?audit=editorial-discovery`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const path of ['/da-lat/ca-phe', '/da-lat/an-uong', '/da-lat/tham-quan', '/da-lat/hoat-dong', '/da-lat/dia-diem/quan-gia-lap-1', '/da-lat/lich-trinh/lich-trinh-gia-lap', '/da-lat/ban-do?rainSafe=true']) {
      expect(html).toContain(`href="${path}"`);
    }
    expect(html).toMatch(/<img(?=[^>]*loading="eager")(?=[^>]*fetchpriority="high")(?=[^>]*srcset="[^"]*city-1280.webp)[^>]*>/);
    expect(html).toContain('href="/ghi-nguon#anh-trang-chu"');
    expect(html).toContain('Vị trí từ dữ liệu địa điểm');
    expect(html).toContain('Xem trước vị trí');
    expect(html).not.toMatch(/<button[^>]*rd-home-map__pin/);
    expect(html).toContain('href="/da-lat/tao-lich-trinh"');
    expect(html).not.toContain('<canvas');
    expect(html.match(/<link[^>]*maplibre[^>]*>/g) ?? []).toEqual([]);
    expect(geographicRequests).toBe(initialGeographicRequests);
  });

  it('shows useful empty states without fabricating places, articles or map pins', async () => {
    homeEmpty = true;
    try {
      const response = await fetch(`${base}/da-lat?audit=editorial-empty`);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain('Mình chưa ghi chép quán nào ở đây');
      expect(html).toContain('Mình đang soạn mấy lịch trình đầu tiên');
      expect(html).toContain('Những ghi chép đầu tiên đang được biên soạn');
      expect(html).not.toMatch(/<button[^>]*rd-home-map__pin/);
      expect(html).not.toContain('href="/da-lat/dia-diem/quan-gia-lap-1"');
      expect(html).toContain('href="/da-lat/ban-do"');
    } finally { homeEmpty = false; }
  });

  it('preserves partial content and retry on a place-data failure, then recovers', async () => {
    const path = '/da-lat?audit=editorial-place-failure';
    homePlacesFailed = true;
    try {
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      const html = await response.text();
      expect(html).toContain('Chưa tải được hết dữ liệu');
      expect(html).toContain('Thử lại');
      expect(html).toContain('href="/da-lat/lich-trinh/lich-trinh-gia-lap"');
      expect(html).not.toMatch(/<button[^>]*rd-home-map__pin/);
    } finally { homePlacesFailed = false; }
    expect((await fetch(`${base}${path}`)).status).toBe(200);
  });

  it('shows the overview line, day spans and compact stops without the client-only action bar', async () => {
    const html = await (await fetch(`${base}/da-lat/lich-trinh/lich-trinh-gia-lap?audit=ux-itinerary`)).text();
    expect(html).toMatch(/class="rd-itinerary-detail__summary"[^>]*>4 điểm</);
    expect(html).toContain('08:00 → 11:45');
    expect(html).not.toMatch(/<div[^>]*class="[^"]*rd-itinerary-action-bar/);
    expect(html).not.toContain('aria-label="Chia sẻ lịch trình"');
    expect(html).not.toContain('Xem bản đồ lịch trình');
    expect(html.match(/data-rd-event="direction_click"/g)).toHaveLength(3);
  });
  it('renders the ticket card meta and season on the home page', async () => {
    const html = await (await fetch(`${base}/da-lat?audit=ux-ticket`)).text();
    expect(html).toContain('4 điểm · xe máy · thong thả');
    expect(html).toContain('Mùa lịch Giả Lập');
    expect(html).toMatch(/class="rd-itin__top rd-itin__top--stub"/);
  });
  it('puts search before the weather tile and links zones and the map list', async () => {
    weatherMode = 'sun';
    try {
      const html = await (await fetch(`${base}/da-lat?audit=ux-home`)).text();
      expect(html.indexOf('role="search"')).toBeGreaterThan(-1);
      expect(html.indexOf('role="search"')).toBeLessThan(html.indexOf('id="city-weather-title"'));
      expect(html).toContain('href="/da-lat/khu-vuc/trung-tam"');
      expect(html).toContain('Xem tất cả trên bản đồ');
    } finally { weatherMode = 'none'; }
  });
  it('summarises a curated list and keeps ranked places in an ordered list', async () => {
    const html = await (await fetch(`${base}/da-lat/top/danh-sach-gia-lap?audit=ux-curated`)).text();
    expect(html).toMatch(/class="rd-curated-page__summary"/);
    expect(html).toContain('3 địa điểm');
    expect(html).toContain('Mỗi nơi, một lý do để ghé.');
    expect(html).toContain('Những nơi này nằm đâu?');
    expect(html).toContain('Có người cũng sẽ thích những nơi này.');
    expect(html).toMatch(/class="rd-curated-page__rank"[^>]*>01</);
    expect(html.indexOf('/da-lat/dia-diem/quan-gia-lap-3')).toBeLessThan(html.indexOf('/da-lat/dia-diem/quan-gia-lap-1'));
  });
  it('keeps the season banner inside the itinerary section', async () => {
    seasonMode = 'flower';
    try {
      const html = await (await fetch(`${base}/da-lat?audit=ux-season`)).text();
      expect(html.indexOf('id="itinerary-strip-title"')).toBeGreaterThan(-1);
      expect(html.indexOf('id="itinerary-strip-title"')).toBeLessThan(html.indexOf('id="season-banner-title"'));
    } finally { seasonMode = 'none'; }
  });
});

describe('Discovery Collection production SSR', () => {
  it('renders category identity and crawlable discovery alternatives without initializing a map', async () => {
    const initialGeographicRequests = geographicRequests;
    const response = await fetch(`${base}/da-lat/ca-phe?audit=collection-cover`);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('Cà phê ở Thành phố Giả Lập');
    expect(html).toContain('aria-label="Khám phá theo danh mục"');
    expect(html).toContain('Tìm địa điểm trong danh mục');
    expect(html).toContain('href="/da-lat/ban-do?category=cafe"');
    for (const path of ['an-uong', 'tham-quan', 'hoat-dong']) expect(html).toContain(`href="/da-lat/${path}"`);
    expect(html).toContain('Ảnh địa điểm đang cập nhật');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('href="/da-lat/tao-lich-trinh"');
    expect(geographicRequests).toBe(initialGeographicRequests);
  });
  it('preserves category, area and shelter context in filtered SSR links and metadata', async () => {
    const html = await (await fetch(`${base}/da-lat/ca-phe?q=Yen&zone=trung-tam&rainSafe=true&tags=chill&audit=collection-context`)).text();
    expect(html).toContain('name="robots" content="noindex, follow"');
    expect(html).toContain('rel="canonical" href="https://ranhduong.vn/da-lat/ca-phe"');
    expect(html).toContain('name="zone" value="trung-tam"');
    expect(html).toContain('name="rainSafe" value="true"');
    expect(html).toContain('href="/da-lat/ban-do?category=cafe&amp;rainSafe=true&amp;q=Yen&amp;zone=trung-tam&amp;tags=chill"');
    expect(html).toContain('href="/da-lat/an-uong?zone=trung-tam&amp;rainSafe=true"');
  });
  it('uses an actual supplied cover eagerly and preserves order in the lazy place collection', async () => {
    areaWithPhotos = true;
    try {
      const html = await (await fetch(`${base}/da-lat/ca-phe?zone=trung-tam&audit=collection-photo`)).text();
      expect(html).toMatch(/<img(?=[^>]*loading="eager")(?=[^>]*fetchpriority="high")(?=[^>]*src="[^"]*fake\/area-photo)[^>]*>/);
      expect(html).toMatch(/<img(?=[^>]*loading="lazy")(?=[^>]*src="[^"]*fake\/area-photo)[^>]*>/);
      const grid = html.slice(html.indexOf('class="rd-field-grid"'));
      expect(grid.indexOf('/dia-diem/quan-gia-lap-1')).toBeLessThan(grid.indexOf('/dia-diem/quan-gia-lap-2'));
    } finally { areaWithPhotos = false; }
  });
});

describe('UX category tabs and tag filter SSR', () => {
  it('shows categories as navigation tabs and tags as labelled filter chips with counts and a clear link', async () => {
    const html = await (await fetch(`${base}/da-lat/ca-phe?tags=chill&audit=ux-tags`)).text();
    expect(html).toContain('aria-label="Khám phá theo danh mục"');
    expect(html).toMatch(/<a(?=[^>]*aria-current="page")(?=[^>]*href="\/da-lat\/ca-phe")[^>]*>/);
    expect(html).toContain('aria-label="Lọc theo sở thích"');
    expect(html).toMatch(/<button(?=[^>]*data-slug="chill")(?=[^>]*aria-pressed="true")[^>]*>/);
    expect(html).toContain('<small>25');
    expect(html).toMatch(/class="rd-field-filters__active"[^>]*>Đang lọc/);
    expect(html).toContain('href="/da-lat/ca-phe"');
  });
});
