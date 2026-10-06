<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
</script>

<template>
  <div class="layout">
    <nav class="side" aria-label="Quản trị">
      <div class="logo">Rành Đường</div>
      <div class="sub">Quản trị · Đà Lạt</div>
      <RouterLink class="nav" to="/dia-diem">Địa điểm</RouterLink>
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
.main { flex: 1; padding: 28px 32px; }
:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
</style>
