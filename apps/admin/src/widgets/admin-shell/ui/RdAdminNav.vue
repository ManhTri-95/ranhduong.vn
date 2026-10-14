<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { NavGroupView } from '../model/nav';

defineProps<{ groups: readonly NavGroupView[]; active: string | null; email: string | null; logoutFailed: boolean }>();
const emit = defineEmits<{ logout: [] }>();
</script>

<template>
  <div class="rd-admin-nav">
    <div class="rd-admin-nav__logo">Rành Đường</div>
    <div class="rd-admin-nav__sub">Quản trị · Đà Lạt</div>
    <template v-for="group in groups" :key="group.label">
      <p class="rd-admin-nav__group">{{ group.label }}</p>
      <RouterLink v-for="item in group.items" :key="item.path" v-slot="{ href, navigate }" :to="item.to" custom>
        <a :href="href" class="rd-admin-nav__link" :aria-current="active === item.path ? 'page' : undefined" @click="navigate">{{ item.label }}</a>
      </RouterLink>
    </template>
    <div class="rd-admin-nav__account">
      <span v-if="email" class="rd-admin-nav__email">{{ email }}</span>
      <button type="button" class="rd-admin-nav__logout" @click="emit('logout')">Đăng xuất</button>
      <span v-if="logoutFailed" class="rd-admin-nav__email" role="alert">Chưa đăng xuất được, thử lại.</span>
    </div>
  </div>
</template>
