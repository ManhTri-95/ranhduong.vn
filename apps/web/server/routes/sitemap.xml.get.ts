import { sitemapIndexXml } from '../../app/shared/lib/seo';

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'application/xml; charset=utf-8');
  return sitemapIndexXml(useRuntimeConfig(event).public.siteUrl);
});
