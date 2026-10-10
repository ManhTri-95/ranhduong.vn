import { describe, expect, it } from 'vitest';
import { absoluteUrl, breadcrumbJsonLd, serializeJsonLd, sitemapIndexXml, sitemapXml, robotsText } from './seo';

describe('S17 shared SEO output', () => {
  it('canonicalizes without tracking, fragments or trailing slash', () => {
    expect(absoluteUrl('https://ranhduong.vn/', '/da-lat/?q=a#map')).toBe('https://ranhduong.vn/da-lat');
  });
  it('escapes script termination without changing JSON values', () => {
    const value = { name: '</script><script>alert(1)</script>\u2028&' };
    const serialized = serializeJsonLd(value);
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual(value);
  });
  it('uses absolute breadcrumb items in order', () => {
    expect(breadcrumbJsonLd('https://ranhduong.vn', [{ name: 'Đà Lạt', path: '/da-lat' }])).toMatchObject({ '@type': 'BreadcrumbList', itemListElement: [{ position: 1, name: 'Đà Lạt', item: 'https://ranhduong.vn/da-lat' }] });
  });
  it('renders root sitemap index and escaped canonical XML with real lastmod', () => {
    expect(sitemapIndexXml('https://ranhduong.vn')).toContain('<loc>https://ranhduong.vn/sitemap-places.xml</loc>');
    const xml = sitemapXml('https://ranhduong.vn', [{ path: '/da-lat', lastmod: '2026-10-09T00:00:00.000Z' }, { path: '/a&b' }]);
    expect(xml).toContain('<lastmod>2026-10-09T00:00:00.000Z</lastmod>');
    expect(xml).toContain('/a&amp;b</loc>');
    expect(xml.match(/<lastmod>/g)).toHaveLength(1);
  });
  it('blocks private areas and parameterized search, with staging fully blocked', () => {
    const text = robotsText('https://ranhduong.vn', true);
    for (const rule of ['/admin', '/owner', '/l/', '/*/tim-kiem?', 'Sitemap: https://ranhduong.vn/sitemap.xml']) expect(text).toContain(rule);
    expect(robotsText('https://staging.ranhduong.vn', false)).toBe('User-agent: *\nDisallow: /\n');
  });
});
