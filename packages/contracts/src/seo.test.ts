import { describe, expect, it } from 'vitest';
import { SitemapEntry, SitemapResponse, sitemapSources } from './seo.js';

describe('S17 sitemap contracts', () => {
  it('skips invalid legacy slugs and omits missing/invalid dates', () => {
    expect(sitemapSources([{ slug: 'gia-lap', updatedAt: new Date('2026-10-09') }, { slug: 'khong-ngay' }, { slug: 'ngay-loi', updatedAt: new Date('invalid') }, { slug: '../admin' }, { slug: null }])).toEqual([{ slug: 'gia-lap', updatedAt: '2026-10-09T00:00:00.000Z' }, { slug: 'khong-ngay' }, { slug: 'ngay-loi' }]);
  });
  it('accepts public relative paths and actual dates but rejects query/external URLs', () => {
    expect(SitemapResponse.safeParse({ items: [{ path: '/da-lat/top/gia-lap' }] }).success).toBe(true);
    for (const path of ['https://example.com', '//example.com', '/da-lat?tag=x', '/da-lat#map', '/da-lat/../admin']) expect(SitemapEntry.safeParse({ path }).success).toBe(false);
    expect(SitemapEntry.safeParse({ path: '/da-lat', lastmod: 'today' }).success).toBe(false);
  });
});
