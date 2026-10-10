import { SitemapResponse, type SitemapKind } from '@ranhduong/contracts';
import { sitemapXml } from '../../app/shared/lib/seo';

export function sitemapHandler(kind: SitemapKind) {
  return defineEventHandler(async (event) => {
    const config = useRuntimeConfig(event);
    setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8');
    if (!config.public.indexable) return sitemapXml(config.public.siteUrl, []);
    try {
      const base = (config.apiInternalBase || config.public.apiBase).replace(/\/+$/, '');
      const result = SitemapResponse.parse(await $fetch(`${base}/seo/sitemap/${kind}`, { timeout: 5000 }));
      return sitemapXml(config.public.siteUrl, result.items);
    } catch {
      throw createError({ statusCode: 503, statusMessage: 'Sitemap temporarily unavailable' });
    }
  });
}
