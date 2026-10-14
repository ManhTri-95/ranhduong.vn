<script setup lang="ts">
import type { PlaceCategory, PlacePhoto } from '@ranhduong/contracts';
import { ref } from 'vue';
import { photoSrcset, photoUrl } from '~/shared/lib/media';
import RdCategoryGlyph from './RdCategoryGlyph.vue';

defineProps<{ photos: PlacePhoto[]; name: string; category: PlaceCategory }>();
const mediaBase = useRuntimeConfig().public.mediaBase;
const failed = ref<number[]>([]);
const sourceLabels: Record<PlacePhoto['source'], string> = {
  self: 'Rành Đường tự chụp', owner: 'Chủ địa điểm cung cấp', ctv: 'Cộng tác viên cung cấp',
  user: 'Người đóng góp cung cấp', cc: 'Creative Commons',
};
</script>

<template>
  <section class="rd-gallery" aria-label="Ảnh địa điểm">
    <!-- Chưa có ảnh: dải gọn thay cho ô trống lớn, để tên quán và trạng thái nằm trong màn hình đầu. -->
    <div v-if="!photos.length" class="rd-gallery__empty"><RdCategoryGlyph :category="category" />Ảnh đang cập nhật</div>
    <template v-else>
      <figure class="rd-gallery__photo rd-gallery__photo--cover">
        <img v-if="!failed.includes(0)" :src="photoUrl(mediaBase, photos[0]!.key, 1200)" :srcset="photoSrcset(mediaBase, photos[0]!.key)"
          sizes="(min-width: 1024px) 780px, 100vw" :alt="`Ảnh 1 của ${name}`" width="1200" height="800"
          loading="eager" fetchpriority="high" decoding="async" @error="failed.push(0)">
        <div v-else class="rd-gallery__placeholder"><RdCategoryGlyph :category="category" />Ảnh đang cập nhật</div>
      </figure>
      <!-- Ảnh còn lại một hàng cuộn ngang, dừng theo từng ảnh; ảnh bìa đứng yên. -->
      <ul v-if="photos.length > 1" class="rd-gallery__strip">
        <li v-for="(photo, offset) in photos.slice(1)" :key="photo.key" class="rd-gallery__photo">
          <img v-if="!failed.includes(offset + 1)" :src="photoUrl(mediaBase, photo.key, 400)" :srcset="photoSrcset(mediaBase, photo.key)"
            sizes="200px" :alt="`Ảnh ${offset + 2} của ${name}`" width="1200" height="800"
            loading="lazy" decoding="async" @error="failed.push(offset + 1)">
          <div v-else class="rd-gallery__placeholder"><RdCategoryGlyph :category="category" />Ảnh đang cập nhật</div>
        </li>
      </ul>
    </template>
    <details v-if="photos.length" open class="rd-gallery__credits">
      <summary>Nguồn ảnh ({{ photos.length }})</summary>
      <ol>
        <li v-for="(photo, index) in photos" :key="photo.key">
          Ảnh {{ index + 1 }} · {{ sourceLabels[photo.source] }} · {{ photo.credit }} · {{ photo.license }}
          <a v-if="photo.sourceUrl" :href="photo.sourceUrl" target="_blank" rel="noopener noreferrer">Xem nguồn ảnh {{ index + 1 }}</a>
        </li>
      </ol>
      <p>Ảnh được chuyển sang WebP và thay đổi kích thước; khung hiển thị có thể cắt ảnh. <NuxtLink to="/ghi-nguon#anh-dia-diem">Về quyền sử dụng ảnh</NuxtLink></p>
    </details>
  </section>
</template>

<style scoped>
.rd-gallery { min-width: 0; }
.rd-gallery__photo { margin: 0; }
.rd-gallery__strip { list-style: none; margin: var(--space-3) 0 0; padding: 0 0 var(--space-1); display: flex; gap: var(--space-3); overflow-x: auto; scroll-snap-type: x proximity; overscroll-behavior-x: contain; }
.rd-gallery__strip .rd-gallery__photo { flex: 0 0 200px; scroll-snap-align: start; }
.rd-gallery__photo img { display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: var(--radius-card); background: var(--mist); }
.rd-gallery__placeholder, .rd-gallery__empty { display: flex; align-items: center; gap: var(--space-3); background: var(--mist); color: var(--ink-soft); border-radius: var(--radius-card); font-size: 14px; }
.rd-gallery__placeholder { justify-content: center; flex-direction: column; aspect-ratio: 3 / 2; }
.rd-gallery__empty { min-height: 72px; padding: var(--space-3) var(--space-4); box-sizing: border-box; }
.rd-gallery__empty :deep(.rd-place__glyph), .rd-gallery__placeholder :deep(.rd-place__glyph) { flex: 0 0 auto; width: 36px; height: 36px; }
.rd-gallery__credits { font-size: 13px; line-height: 1.6; color: var(--ink-soft); }
.rd-gallery__credits summary { display: flex; align-items: center; min-height: var(--tap-min); cursor: pointer; text-decoration: underline; }
.rd-gallery__credits ol { padding-left: var(--space-5); margin: 0; }
.rd-gallery__credits li { overflow-wrap: anywhere; }
.rd-gallery__credits p { margin: var(--space-2) 0 0; }
.rd-gallery__credits a { display: inline-flex; align-items: center; min-height: var(--tap-min); margin-left: var(--space-2); }
</style>
