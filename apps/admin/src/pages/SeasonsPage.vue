<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { CITY_SLUG } from '@/shared/config';
import { useSeasonEditor } from '@/widgets/season-editor/model/use-season-editor';
import RdSeasonEditor from '@/widgets/season-editor/ui/RdSeasonEditor.vue';
const editor = useSeasonEditor(CITY_SLUG);
onBeforeRouteLeave(() => editor.canLeave.value || window.confirm('Nội dung chưa được giữ trên máy. Rời trang sẽ mất bản đang sửa. Bạn vẫn muốn rời trang?'));
function beforeUnload(event: BeforeUnloadEvent): void {
  if (!editor.canLeave.value) { event.preventDefault(); event.returnValue = ''; }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload));
</script>
<template><RdSeasonEditor :editor="editor" /></template>
