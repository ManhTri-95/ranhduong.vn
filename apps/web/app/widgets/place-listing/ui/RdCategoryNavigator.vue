<script setup lang="ts">
import { CATEGORY_LABEL, PUBLIC_CATEGORIES, type PublicCategory } from '@ranhduong/contracts';
import { categorySiblingHref } from '~/entities/place/lib/category-guide';
import type { DiscoveryFilter } from '~/entities/place/lib/discovery-query';
import RdCategoryGlyph from '~/entities/place/ui/RdCategoryGlyph.vue';
defineProps<{ citySlug: string; category: PublicCategory; filter: DiscoveryFilter; basePath: string }>();
defineEmits<{ navigate: [event: MouseEvent, category: PublicCategory] }>();
</script>

<template>
  <nav class="rd-collection-nav" aria-label="Khám phá theo danh mục">
    <p class="rd-field-kicker">Chọn một gu khám phá</p>
    <ul><li v-for="item in PUBLIC_CATEGORIES" :key="item"><NuxtLink :to="item === category ? basePath : categorySiblingHref(citySlug, item, filter)" :aria-current="item === category ? 'page' : undefined" @click="$emit('navigate', $event, item)"><span class="rd-collection-nav__glyph"><RdCategoryGlyph :category="item" /></span><span>{{ CATEGORY_LABEL[item] }}</span><span aria-hidden="true">{{ item === category ? '↓' : '↗' }}</span></NuxtLink></li></ul>
  </nav>
</template>
