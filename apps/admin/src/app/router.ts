import { createRouter, createWebHistory } from 'vue-router';
import { loadSession } from '@/entities/session';

declare module 'vue-router' {
  interface RouteMeta {
    /** Trang mở được khi chưa đăng nhập. */
    public?: boolean;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dia-diem' },
    { path: '/dang-nhap', component: () => import('@/pages/LoginPage.vue'), meta: { public: true } },
    { path: '/dia-diem', component: () => import('@/pages/PlacesPage.vue') },
    { path: '/dia-diem/:id', component: () => import('@/pages/PlaceEditPage.vue') },
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
