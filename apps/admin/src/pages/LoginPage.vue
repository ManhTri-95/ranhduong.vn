<script setup lang="ts">
import type { LoginError } from '@ranhduong/contracts';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { googleLoginUrl } from '@/features/auth';

// 'unavailable' do admin tự đặt khi không gọi được API; các mã còn lại do API gửi về qua ?error=.
const NOTICES: Record<LoginError | 'unavailable', string> = {
  not_allowed: 'Email này chưa có trong danh sách quản trị. Chọn tài khoản Google khác, hoặc nhờ chủ dự án thêm email của bạn.',
  expired: 'Lần đăng nhập vừa rồi đã quá 10 phút. Bấm đăng nhập lại.',
  failed: 'Chưa đăng nhập được. Thử lại; nếu vẫn lỗi thì báo chủ dự án.',
  unavailable: 'Chưa kết nối được máy chủ. Thử lại sau ít phút.',
};

function isNoticeCode(code: unknown): code is keyof typeof NOTICES {
  return typeof code === 'string' && Object.hasOwn(NOTICES, code);
}

const route = useRoute();
const notice = computed(() => {
  const code = route.query.error;
  return isNoticeCode(code) ? NOTICES[code] : null;
});
const loginUrl = computed(() => {
  const returnTo = route.query.returnTo;
  return googleLoginUrl(typeof returnTo === 'string' ? returnTo : '/dia-diem');
});
</script>

<template>
  <main class="login">
    <section class="card" aria-labelledby="login-title">
      <p class="brand">Rành Đường · Quản trị</p>
      <h1 id="login-title">Đăng nhập</h1>
      <p class="hint">Dùng tài khoản Google có trong danh sách quản trị.</p>
      <p v-if="notice" class="notice" role="alert">{{ notice }}</p>
      <a class="google" :href="loginUrl">Đăng nhập bằng Google</a>
    </section>
  </main>
</template>

<style scoped>
.login { min-height: 100vh; display: grid; place-items: center; padding: 0 var(--page-gutter); box-sizing: border-box; }
.card { width: 100%; max-width: 360px; background: var(--paper-raised); border: var(--border); border-radius: var(--radius-card); padding: 28px 24px; box-sizing: border-box; }
.brand { margin: 0 0 4px; font-size: 13px; color: var(--ink-soft); }
h1 { margin: 0 0 8px; font-family: var(--font-display); font-size: 26px; color: var(--ink); }
.hint { margin: 0 0 20px; font-size: 14px; color: var(--ink-soft); }
.notice { margin: 0 0 20px; padding: 12px 14px; background: var(--note); border: 1.5px solid var(--note-edge); border-radius: var(--radius-note); font-size: 14px; color: var(--ink); }
.google { display: flex; align-items: center; justify-content: center; min-height: 48px; border-radius: var(--radius-pill); background: var(--accent); color: var(--ink); font-weight: 700; font-size: 15px; text-decoration: none; }
</style>
