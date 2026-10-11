<script setup lang="ts">
const email = useRuntimeConfig().public.legalContactEmail;
</script>

<template>
  <section id="lien-he" aria-labelledby="legal-contact-title">
    <h2 id="legal-contact-title">Liên hệ về nội dung và dữ liệu</h2>
    <p v-if="email">Để yêu cầu sửa thông tin, xử lý ảnh có vấn đề bản quyền hoặc hỏi về dữ liệu cá nhân, gửi email tới <a class="rd-legal__link" :href="`mailto:${email}`">{{ email }}</a>. Gửi kèm đường dẫn trang và nội dung cần xử lý; chỉ cung cấp thông tin cần thiết cho yêu cầu.</p>
    <p v-else>Kênh tiếp nhận yêu cầu về quyền riêng tư, thông tin địa điểm và bản quyền ảnh sẽ được công bố trước khi Rành Đường ra mắt.</p>
  </section>
</template>
