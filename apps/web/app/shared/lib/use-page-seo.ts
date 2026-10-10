import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { absoluteUrl, breadcrumbJsonLd, serializeJsonLd, type Breadcrumb, type JsonLd } from './seo';

interface PageSeo {
  path: MaybeRefOrGetter<string>;
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  image?: MaybeRefOrGetter<string | undefined>;
  breadcrumbs: MaybeRefOrGetter<Breadcrumb[]>;
  jsonLd?: MaybeRefOrGetter<JsonLd[]>;
  noindex?: MaybeRefOrGetter<boolean>;
}

export function usePageSeo(page: PageSeo): void {
  const config = useRuntimeConfig().public;
  const canonical = computed(() => absoluteUrl(config.siteUrl, toValue(page.path)));
  const image = computed(() => toValue(page.image) || absoluteUrl(config.siteUrl, '/og-default.png'));
  useSeoMeta({
    title: () => toValue(page.title), description: () => toValue(page.description),
    ogTitle: () => toValue(page.title), ogDescription: () => toValue(page.description), ogUrl: () => canonical.value,
    ogType: 'website', ogSiteName: 'Rành Đường', ogLocale: 'vi_VN', ogImage: () => image.value,
    ogImageWidth: 1200, ogImageHeight: 630,
    twitterCard: 'summary_large_image', twitterTitle: () => toValue(page.title), twitterDescription: () => toValue(page.description), twitterImage: () => image.value,
    robots: () => !config.indexable || toValue(page.noindex) ? 'noindex, follow' : 'index, follow',
  });
  useHead(() => ({
    link: [{ rel: 'canonical', href: canonical.value }],
    script: [{ key: 'rd-json-ld', type: 'application/ld+json', innerHTML: serializeJsonLd([
      ...toValue(page.jsonLd) ?? [], breadcrumbJsonLd(config.siteUrl, toValue(page.breadcrumbs)),
    ]) }],
  }));
}
