import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dia-diem' },
    { path: '/dia-diem', component: () => import('@/pages/PlacesPage.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/dia-diem' },
  ],
});
