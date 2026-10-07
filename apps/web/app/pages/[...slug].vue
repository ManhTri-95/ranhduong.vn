<script setup lang="ts">
// Đường dẫn chưa có trang (ví dụ danh mục trước S10, bản đồ trước S12) trả 404 qua error.vue,
// thay vì để Vue Router báo "No match found" mỗi lần NuxtLink trỏ tới chúng.
// Route cụ thể hơn (pages/[city]/…) luôn được ưu tiên, nên trang thêm sau sẽ tự thay chỗ này.
// statusMessage nằm trên dòng trạng thái HTTP nên phải là ASCII; chữ người dùng thấy nằm trong error.vue.
throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true });
</script>

<template>
  <div />
</template>
