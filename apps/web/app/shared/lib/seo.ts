import { SitemapKind, type SitemapEntry } from '@ranhduong/contracts';

export type JsonLd = Record<string, unknown>;
export interface Breadcrumb { name: string; path: string }

export function absoluteUrl(siteUrl: string, path: string): string {
  const url = new URL(path, `${siteUrl.replace(/\/+$/, '')}/`);
  url.search = ''; url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function breadcrumbJsonLd(siteUrl: string, crumbs: Breadcrumb[]): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.name, item: absoluteUrl(siteUrl, crumb.path) })) };
}

export function itemListJsonLd(siteUrl: string, citySlug: string, places: { slug: string; name: string }[], name?: string): JsonLd {
  return { '@context': 'https://schema.org', '@type': 'ItemList', ...(name ? { name } : {}), itemListElement: places.map((place, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'Place', name: place.name, url: absoluteUrl(siteUrl, `/${citySlug}/dia-diem/${place.slug}`) } })) };
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
export function sitemapIndexXml(siteUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${SitemapKind.options.map((kind) => `<sitemap><loc>${escapeXml(absoluteUrl(siteUrl, `/sitemap-${kind}.xml`))}</loc></sitemap>`).join('')}</sitemapindex>`;
}
export function sitemapXml(siteUrl: string, entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map((entry) => `<url><loc>${escapeXml(absoluteUrl(siteUrl, entry.path))}</loc>${entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ''}</url>`).join('')}</urlset>`;
}
export function robotsText(siteUrl: string, indexable: boolean): string {
  if (!indexable) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\nDisallow: /l/\nDisallow: /owner\nDisallow: /admin\nDisallow: /*/tim-kiem?\nSitemap: ${absoluteUrl(siteUrl, '/sitemap.xml')}\n`;
}
