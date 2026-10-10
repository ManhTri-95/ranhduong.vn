<script setup lang="ts">
import type { TemplateAnalysis, TemplateEditInput, TemplatePlace } from '@ranhduong/contracts';
import { computed, ref } from 'vue';
const props = defineProps<{ form: TemplateEditInput; analysis: TemplateAnalysis; places: TemplatePlace[]; url: string }>();
const mode = ref<'phone' | 'google'>('phone');
const names = computed(() => new Map(props.places.map((p) => [p.id, p.name])));
</script>
<template>
  <section class="rd-admin-section rd-template-preview" aria-labelledby="template-preview">
    <h2 id="template-preview" class="rd-admin-section__title">Xem trước nội dung đang soạn</h2>
    <div class="rd-template-preview__tabs" role="group" aria-label="Kiểu xem trước"><button type="button" class="rd-btn rd-btn--outline" :aria-pressed="mode === 'phone'" @click="mode = 'phone'">Điện thoại</button><button type="button" class="rd-btn rd-btn--outline" :aria-pressed="mode === 'google'" @click="mode = 'google'">Google</button></div>
    <div v-if="mode === 'phone'" class="rd-template-preview__phone">
      <span class="rd-field__hint">Rành Đường · {{ form.days.length }} ngày</span>
      <h3>{{ form.title || 'Tên lịch trình' }}</h3><p class="rd-template-preview__description">{{ form.description || 'Mô tả lịch trình sẽ hiện ở đây.' }}</p>
      <span class="rd-field__hint">{{ [form.season, form.style].filter(Boolean).join(' · ') }}</span>
      <section v-for="day in analysis.days" :key="day.day"><h4>Ngày {{ day.day }}</h4><ol class="rd-template-preview__stops"><li v-for="stop in day.stops" :key="stop.key"><strong>{{ stop.start }}–{{ stop.end }} · {{ names.get(stop.placeId) ?? 'Địa điểm cần kiểm tra' }}</strong><p v-if="stop.note">{{ stop.note }}</p></li></ol></section>
      <p class="rd-field__hint">Bản xem trước nội dung trên điện thoại.</p>
    </div>
    <div v-else class="rd-template-preview__google">
      <p class="rd-field__hint">Rành Đường · {{ url }}</p><h3>{{ form.seoTitle || `${form.title || 'Lịch trình'} · Rành Đường` }}</h3><p>{{ form.seoDescription || form.description || 'Mô tả kết quả tìm kiếm sẽ hiện ở đây.' }}</p>
      <p class="rd-field__hint">Bản mô phỏng; Google có thể chọn cách hiển thị khác.</p>
    </div>
  </section>
</template>
<style scoped>
.rd-template-preview { align-self: start; min-width: 0; }
.rd-template-preview__tabs { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-template-preview__tabs .rd-btn { padding: 0 var(--space-3); }
.rd-template-preview__tabs [aria-pressed='true'] { background: var(--ink); color: var(--paper-raised); }
.rd-template-preview__phone { background: var(--paper); border: var(--border); border-radius: var(--radius-card); padding: var(--space-4); max-width: 390px; overflow-wrap: anywhere; }
.rd-template-preview__phone h3 { font: 700 23px/1.3 var(--font-display); }
.rd-template-preview__description, .rd-template-preview__stops p { white-space: pre-line; }
.rd-template-preview__stops { padding-left: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); }
.rd-template-preview__stops li { padding-bottom: var(--space-3); border-bottom: var(--border-hair) dashed var(--line); font-size: 14px; }
.rd-template-preview__google { overflow-wrap: anywhere; }
.rd-template-preview__google h3 { color: var(--ink); font: 600 20px/1.3 var(--font-body); text-decoration: underline; }
.rd-template-preview__google p { line-height: 1.6; }
</style>
