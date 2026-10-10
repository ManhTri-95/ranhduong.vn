import { robotsText } from '../../app/shared/lib/seo';

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event).public;
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8');
  return robotsText(config.siteUrl, config.indexable);
});
