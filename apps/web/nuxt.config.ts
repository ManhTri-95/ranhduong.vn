// Cấu hình Nuxt cho web khách (Spec UI, tài liệu thiết kế kỹ thuật mục 11). Admin là app riêng ở apps/admin.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  css: ['@ranhduong/ui/tokens.css', '@ranhduong/ui/components.css', '~/assets/base.css'],
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
    /** SSR gọi API qua mạng nội bộ Docker (http://api:3001/v1, ADR 0003); để trống thì dùng public.apiBase. */
    apiInternalBase: '',
    public: {
      apiBase: 'http://localhost:3001/v1',
      /** Ảnh trên R2 (media.ranhduong.vn); local là bucket MinIO. */
      mediaBase: 'http://localhost:9000/ranhduong-media',
      mapStyleUrl: 'https://tiles.openfreemap.org/styles/positron',
    },
  },
  routeRules: {
    // Trang chủ thành phố: SWR 1 giờ (technical-design mục 11). Trang lỗi (từ 400) Nitro không cache.
    '/:city': { swr: 3600 },
    '/:city/tim-kiem': { headers: { 'x-robots-tag': 'noindex' } },
    '/:city/dia-diem/**': { swr: 3600 },
    '/:city/lich-trinh/**': { swr: 86400 },
    '/l/**': { headers: { 'x-robots-tag': 'noindex' } },
  },
  typescript: { strict: true },
});
