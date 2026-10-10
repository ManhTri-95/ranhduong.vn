<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RdCuratedListEditor from '@/widgets/curated-list-editor/ui/RdCuratedListEditor.vue';
const route = useRoute();
const router = useRouter();
const listId = ref(String(route.params.id) === 'moi' ? null : String(route.params.id));
const editorKey = ref(0);
let createdId: string | null = null;
watch(() => route.params.id, (value) => {
  const id = String(value);
  if (id === createdId) { createdId = null; return; }
  listId.value = id === 'moi' ? null : id;
  editorKey.value++;
});
function created(id: string): void {
  createdId = id;
  listId.value = id;
  void router.replace(`/danh-sach/${id}`);
}
</script>
<template><RdCuratedListEditor :key="editorKey" :list-id="listId" @created="created" /></template>
