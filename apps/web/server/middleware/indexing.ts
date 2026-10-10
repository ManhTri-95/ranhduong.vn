export default defineEventHandler((event) => {
  if (!useRuntimeConfig(event).public.indexable) setResponseHeader(event, 'x-robots-tag', 'noindex, nofollow');
});
