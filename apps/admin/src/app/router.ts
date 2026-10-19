import { createRouter, createWebHistory } from 'vue-router';
import { loadSession } from '@/entities/session';

declare module 'vue-router' {
  interface RouteMeta {
    /** Trang mở được khi chưa đăng nhập. */
    public?: boolean;
    /** Tên trên tab trình duyệt; trang có RdPageHeader tự đặt tên cụ thể hơn (tên địa điểm, lịch trình). */
    title?: string;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  // Back/Forward trả lại chỗ cũ. Cùng một trang (đổi bộ lọc, /moi thành /{id} sau khi tạo) giữ nguyên chỗ đang cuộn.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.matched.at(-1) === from.matched.at(-1)) return false;
    return { top: 0 };
  },
  routes: [
    { path: '/', redirect: '/dia-diem' },
    { path: '/dang-nhap', component: () => import('@/pages/LoginPage.vue'), meta: { public: true, title: 'Đăng nhập' } },
    { path: '/dia-diem', component: () => import('@/pages/PlacesPage.vue'), meta: { title: 'Địa điểm' } },
    { path: '/import', component: () => import('@/pages/PlaceImportPage.vue'), meta: { title: 'Import CSV' } },
    { path: '/dia-diem/:id', component: () => import('@/pages/PlaceEditPage.vue'), meta: { title: 'Địa điểm' } },
    { path: '/danh-sach', component: () => import('@/pages/CuratedListsPage.vue'), meta: { title: 'Danh sách gợi ý' } },
    { path: '/danh-sach/:id', component: () => import('@/pages/CuratedListEditPage.vue'), meta: { title: 'Danh sách gợi ý' } },
    { path: '/lich-trinh', component: () => import('@/pages/TemplatesPage.vue'), meta: { title: 'Lịch trình mẫu' } },
    { path: '/lich-trinh/:id', component: () => import('@/pages/TemplateEditPage.vue'), meta: { title: 'Lịch trình mẫu' } },
    { path: '/bao-cao', component: () => import('@/pages/MetricsPage.vue'), meta: { title: 'Báo cáo' } },
    { path: '/mua', component: () => import('@/pages/SeasonsPage.vue'), meta: { title: 'Mùa & giao diện' } },
    { path: '/:pathMatch(.*)*', redirect: '/dia-diem' },
  ],
});

// Mỗi lần chuyển trang đều hỏi API; API (AdminGuard) mới là nơi quyết định, router chỉ chuyển hướng cho dễ dùng.
// Chỉ đổi query trên cùng trang (bộ lọc danh sách) thì không hỏi lại; lần vào đầu tiên `from.matched` rỗng nên vẫn hỏi.
router.beforeEach(async (to, from) => {
  if (to.meta.public) return true;
  if (from.matched.length > 0 && to.path === from.path) return true;
  const state = await loadSession();
  if (state.status === 'signed-in') return true;
  const query: Record<string, string> = { returnTo: to.fullPath };
  if (state.status === 'forbidden') query.error = 'not_allowed';
  if (state.status === 'unavailable') query.error = 'unavailable';
  return { path: '/dang-nhap', query };
});
