// Cấu hình Nuxt cho web khách (Spec UI, tài liệu thiết kế kỹ thuật mục 11).
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  css: ['@ranhduong/ui/tokens.css', '~/assets/base.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'vi' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&family=Lora:wght@700&family=Patrick+Hand&display=swap',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:3001/v1',
      mapStyleUrl: 'https://tiles.openfreemap.org/styles/positron',
    },
  },
  routeRules: {
    '/:city/dia-diem/**': { swr: 3600 },
    '/:city/lich-trinh/**': { swr: 86400 },
    '/l/**': { headers: { 'x-robots-tag': 'noindex' } },
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex' } },
  },
  typescript: { strict: true },
});
