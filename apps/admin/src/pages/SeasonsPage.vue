<script setup lang="ts">
import { CITY_SLUG } from '@/shared/config';
import { useUnsavedGuard } from '@/shared/lib/unsaved-guard';
import { useSeasonEditor } from '@/widgets/season-editor/model/use-season-editor';
import RdSeasonEditor from '@/widgets/season-editor/ui/RdSeasonEditor.vue';

const editor = useSeasonEditor(CITY_SLUG);
// Cùng quy tắc canLeave cũ: chỉ hỏi khi có thay đổi mà không giữ được trên máy.
useUnsavedGuard({ dirty: () => editor.dirty.value, kept: () => editor.localKept.value });
</script>

<template><RdSeasonEditor :editor="editor" /></template>
