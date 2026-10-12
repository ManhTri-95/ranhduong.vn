// Cấu hình Nuxt cho web khách (Spec UI, tài liệu thiết kế kỹ thuật mục 11). Admin là app riêng ở apps/admin.
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // Cổng local 3100 (API 3101) để không trùng các dự án khác đang dùng 3000–3002 trên cùng máy.
  devServer: { port: 3100 },
  // Inline initial SSR data even on 503; an extracted _payload.json returning 503 cannot hydrate partial content.
  // Keep extracted payloads for subsequent client navigation (supported by Nuxt 4.5).
  experimental: { payloadExtraction: 'client' },
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
      apiBase: 'http://localhost:3101/v1',
      /** Ảnh trên R2 (media.ranhduong.vn); local là bucket MinIO. */
      mediaBase: 'http://localhost:9000/ranhduong-media',
      mapStyleUrl: '/maps/notebook/style.json',
      siteUrl: 'https://ranhduong.vn',
      indexable: true,
      googleSiteVerification: '',
      trackingEnabled: true,
      umamiScriptUrl: '',
      umamiWebsiteId: '',
      legalContactEmail: '',
    },
  },
  routeRules: {
    // Chỉ cache trang chủ Đà Lạt: '/:city' cũng khớp đường dẫn '/_' mà Nitro dùng cho renderer '/**',
    // làm renderer mặc định cache cả trang tìm kiếm dù route đó có cache:false.
    '/da-lat': { swr: 900 },
    '/da-lat/ban-do': { swr: 900 },
    // Trang thành phố: SWR 15 phút để cập nhật màu mùa, kể cả bản có ?tags= hay ?cursor= (Nitro cache theo cả query).
    // radix3 ưu tiên nhánh tĩnh '/da-lat', che các handler '/:city/...': ghi cùng prefix để cache có hiệu lực.
    // Thêm thành phố thì thêm rule tương ứng; giữ khớp CATEGORY_URL_SLUG (contracts chưa build lúc postinstall).
    '/da-lat/ca-phe': { swr: 900 },
    '/da-lat/an-uong': { swr: 900 },
    '/da-lat/tham-quan': { swr: 900 },
    '/da-lat/hoat-dong': { swr: 900 },
    '/da-lat/khu-vuc/**': { swr: 900 },
    '/da-lat/dia-diem/**': { swr: 900 },
    '/da-lat/top/**': { swr: 900 },
    '/da-lat/lich-trinh/**': { swr: 900 },
    '/:city/tim-kiem': { cache: false, headers: { 'x-robots-tag': 'noindex', 'cache-control': 'no-store' } },
    '/:city/dia-diem/**': { swr: 900 },
    '/:city/top/**': { swr: 900 },
    '/:city/lich-trinh/**': { swr: 900 },
    '/l/**': { cache: false, headers: { 'x-robots-tag': 'noindex', 'cache-control': 'no-store' } },
    '/owner/**': { cache: false, headers: { 'x-robots-tag': 'noindex', 'cache-control': 'no-store' } },
    '/admin/**': { cache: false, headers: { 'x-robots-tag': 'noindex', 'cache-control': 'no-store' } },
    '/sitemap.xml': { swr: 3600 },
    '/sitemap-pages.xml': { swr: 3600 },
    '/sitemap-places.xml': { swr: 3600 },
    '/sitemap-lists.xml': { swr: 3600 },
    '/sitemap-itineraries.xml': { swr: 3600 },
    '/robots.txt': { cache: false },
  },
  typescript: { strict: true },
});
