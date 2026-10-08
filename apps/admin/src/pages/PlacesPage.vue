<script setup lang="ts">
import { RouterLink } from 'vue-router';
import RdPlaceList from '@/widgets/place-list/ui/RdPlaceList.vue';
</script>

<template>
  <div class="page">
    <header class="head">
      <h1 class="title">Địa điểm</h1>
      <RouterLink class="rd-btn rd-btn--primary" to="/dia-diem/moi">Thêm địa điểm</RouterLink>
    </header>
    <RdPlaceList />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: var(--space-5); }
.head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.title { margin: 0; font: 700 28px/1.2 var(--font-display); }
</style>
