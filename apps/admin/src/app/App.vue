<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { sessionState } from '@/entities/session';
import { logout } from '@/features/auth';

const route = useRoute();
const router = useRouter();
const logoutFailed = ref(false);

async function onLogout(): Promise<void> {
  logoutFailed.value = false;
  try {
    await logout();
    await router.replace('/dang-nhap');
  } catch {
    logoutFailed.value = true;
  }
}
</script>

<template>
  <RouterView v-if="route.meta.public" />
  <div v-else class="layout">
    <nav class="side" aria-label="Quản trị">
      <div class="logo">Rành Đường</div>
      <div class="sub">Quản trị · Đà Lạt</div>
      <RouterLink class="nav" to="/dia-diem">Địa điểm</RouterLink>
      <div class="account">
        <span v-if="sessionState.status === 'signed-in'" class="email">{{ sessionState.session.email }}</span>
        <button type="button" class="logout" @click="onLogout">Đăng xuất</button>
        <span v-if="logoutFailed" class="logout-error" role="alert">Chưa đăng xuất được, thử lại.</span>
      </div>
    </nav>
    <main class="main"><RouterView /></main>
  </div>
</template>

<style>
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--font-body); }
.layout { display: flex; min-height: 100vh; }
.side { width: 232px; background: var(--ink); color: var(--paper-raised); padding: 20px 14px; box-sizing: border-box; display: flex; flex-direction: column; gap: 4px; }
.logo { font-family: var(--font-display); font-weight: 700; font-size: 22px; padding: 0 10px; }
.sub { font-size: 12px; opacity: .8; padding: 0 10px 18px; }
.nav { color: var(--paper-raised); text-decoration: none; height: 44px; display: flex; align-items: center; padding: 0 12px; border-radius: 10px; font-size: 14px; }
.nav.router-link-active { background: rgba(255, 253, 248, .14); font-weight: 700; }
.main { flex: 1; min-width: 0; padding: 28px 32px; }
:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
.account { margin-top: auto; display: flex; flex-direction: column; gap: 6px; padding: 0 10px; }
.email { font-size: 12px; overflow-wrap: anywhere; }
.logout { min-height: 44px; border: 1.5px solid var(--paper-raised); border-radius: var(--radius-chip); background: transparent; color: var(--paper-raised); font: inherit; font-size: 14px; cursor: pointer; }
.logout-error { font-size: 12px; }

/* Điện thoại: thanh bên thành thanh trên cùng, nội dung một cột (form địa điểm dùng trên điện thoại, ui-spec mục 12). */
@media (max-width: 767px) {
  .layout { flex-direction: column; }
  .side { width: auto; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 8px var(--page-gutter); }
  .logo { font-size: 18px; padding: 0; }
  .sub, .email { display: none; }
  .nav { padding: 0 10px; }
  .account { margin: 0 0 0 auto; flex-direction: row; align-items: center; padding: 0; }
  .main { padding: 16px var(--page-gutter) 0; }
}
</style>
