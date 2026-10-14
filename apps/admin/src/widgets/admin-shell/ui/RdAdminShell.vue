<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { sessionState } from '@/entities/session';
import { logout } from '@/features/auth';
import { cancelPendingConfirms } from '@/shared/lib/confirm';
import { formatDocumentTitle } from '@/shared/lib/document-title';
import { listReturnLocation } from '@/shared/lib/list-return';
import RdConfirmDialog from '@/shared/ui/RdConfirmDialog.vue';
import RdDrawer from '@/shared/ui/RdDrawer.vue';
import RdToast from '@/shared/ui/RdToast.vue';
import { activeSection, NAV_GROUPS, routeChangeEffects, type NavGroupView } from '../model/nav';
import RdAdminNav from './RdAdminNav.vue';

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const logoutFailed = ref(false);
const active = computed(() => activeSection(route.path));
const email = computed(() => (sessionState.value.status === 'signed-in' ? sessionState.value.session.email : null));

/** Mục có danh sách mở lại bộ lọc lần trước; đọc lại mỗi lần đổi trang (sessionStorage không reactive). */
const groups = shallowRef<NavGroupView[]>([]);
watch(
  () => route.fullPath,
  () => {
    groups.value = NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({ ...item, to: item.list ? listReturnLocation(item.list) : item.path })),
    }));
  },
  { immediate: true },
);

document.title = formatDocumentTitle(route.meta.title ?? '');

/** Đưa focus về tiêu đề trang mới để trình đọc màn hình bắt đầu từ đó. */
function focusPageTitle(): void {
  const target =
    document.querySelector<HTMLElement>('[data-rd-page-title]') ??
    document.querySelector<HTMLElement>('.rd-admin-main h1') ??
    document.querySelector<HTMLElement>('.rd-admin-main');
  if (!target) return;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

const stopAfterEach = router.afterEach(async (to, from, failure) => {
  if (failure) return;
  menuOpen.value = false;
  // Hộp hỏi còn mở của trang cũ (bấm Back khi đang hỏi): trả "không" để code của trang cũ không lưu hay xoá gì.
  if (to.path !== from.path) cancelPendingConfirms();
  const effects = routeChangeEffects(to, from);
  if (effects.resetTitle) document.title = formatDocumentTitle(to.meta.title ?? '');
  if (!effects.moveFocus) return;
  await nextTick();
  focusPageTitle();
});
onUnmounted(stopAfterEach);

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
  <div class="rd-admin">
    <header class="rd-admin-topbar">
      <button type="button" class="rd-icon-btn" aria-label="Mở menu" :aria-expanded="menuOpen" aria-controls="rd-admin-menu" @click="menuOpen = true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <span class="rd-admin-topbar__brand">Rành Đường · Quản trị</span>
    </header>
    <nav class="rd-admin-side" aria-label="Quản trị">
      <RdAdminNav :groups="groups" :active="active" :email="email" :logout-failed="logoutFailed" @logout="onLogout" />
    </nav>
    <RdDrawer id="rd-admin-menu" v-model:open="menuOpen" label="Menu quản trị">
      <nav class="rd-admin-drawer__nav" aria-label="Quản trị">
        <RdAdminNav :groups="groups" :active="active" :email="email" :logout-failed="logoutFailed" @logout="onLogout" />
      </nav>
    </RdDrawer>
    <main class="rd-admin-main" tabindex="-1"><slot /></main>
    <RdConfirmDialog />
    <RdToast />
  </div>
</template>
