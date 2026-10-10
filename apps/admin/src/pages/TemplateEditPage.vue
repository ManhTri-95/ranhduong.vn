<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RdTemplateEditor from '@/widgets/template-editor/ui/RdTemplateEditor.vue';
const route = useRoute();
const router = useRouter();
const templateId = ref(String(route.params.id) === 'moi' ? null : String(route.params.id));
const editorKey = ref(0);
let createdId: string | null = null;
watch(() => route.params.id, (value) => {
  const id = String(value);
  if (id === createdId) { createdId = null; return; }
  templateId.value = id === 'moi' ? null : id;
  editorKey.value++;
});
function created(id: string): void {
  createdId = id;
  templateId.value = id;
  void router.replace(`/lich-trinh/${id}`);
}
</script>
<template><RdTemplateEditor :key="editorKey" :template-id="templateId" @created="created" /></template>
