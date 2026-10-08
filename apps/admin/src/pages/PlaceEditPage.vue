<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RdPlaceEditor from '@/widgets/place-editor/ui/RdPlaceEditor.vue';

const route = useRoute();
const router = useRouter();
const routeId = computed(() => String(route.params.id));
const toPlaceId = (id: string) => (id === 'moi' ? null : id);

/** Tăng khi phải dựng lại form (mở địa điểm khác, hoặc lại vào /dia-diem/moi). */
const editorKey = ref(0);
const editorId = ref(toPlaceId(routeId.value));
/** Vừa tạo xong thì URL đổi từ /dia-diem/moi sang /dia-diem/{id}: giữ nguyên form đang mở, không tải lại. */
let createdId: string | null = null;

watch(routeId, (id) => {
  if (id === createdId) {
    createdId = null;
    return;
  }
  editorId.value = toPlaceId(id);
  editorKey.value++;
});

function onCreated(id: string): void {
  createdId = id;
  editorId.value = id;
  void router.replace(`/dia-diem/${id}`);
}
</script>

<template>
  <RdPlaceEditor :key="editorKey" :place-id="editorId" @created="onCreated" />
</template>
