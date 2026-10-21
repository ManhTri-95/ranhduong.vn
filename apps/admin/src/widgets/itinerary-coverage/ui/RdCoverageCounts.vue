<script setup lang="ts">
import { CATEGORY_LABEL, PlaceCategory, type ItineraryCoverageZone } from '@ranhduong/contracts';
import RdDataTable from '@/shared/ui/RdDataTable.vue';
import RdEmptyState from '@/shared/ui/RdEmptyState.vue';

defineProps<{ zones: readonly ItineraryCoverageZone[] }>();
const columns = [{ key: 'name', label: 'Cụm' }, { key: 'total', label: 'Tổng điểm' }, ...PlaceCategory.options.map((key) => ({ key, label: CATEGORY_LABEL[key] }))];
</script>

<template>
  <section aria-labelledby="coverage-counts-title">
    <h2 id="coverage-counts-title">Điểm đủ dữ liệu</h2>
    <p>Đang hoạt động, xác minh trong 90 ngày, có toạ độ, cụm, giờ mở cửa hợp lệ và thời lượng ghé. Thời điểm đẹp không bắt buộc.</p>
    <p>Mỗi điểm chỉ tính một lần ở tổng; danh mục tính cả danh mục phụ. Số này chưa lọc theo thứ hay phương tiện.</p>
    <RdDataTable :columns="columns" :rows="zones" :row-key="(row) => row.id" caption="Số điểm đủ dữ liệu theo cụm và danh mục">
      <template #cell="{ row, column }">
        <strong v-if="column.key === 'name'">{{ row.name }}</strong>
        <span v-else-if="column.key === 'total'">{{ row.total }}</span>
        <span v-else>{{ row.categories[column.key as keyof typeof row.categories] }}</span>
      </template>
      <template #card="{ row }">
        <h3>{{ row.name }} · {{ row.total }} điểm</h3>
        <dl class="rd-coverage-categories">
          <div v-for="category in PlaceCategory.options" :key="category"><dt>{{ CATEGORY_LABEL[category] }}</dt><dd>{{ row.categories[category] }}</dd></div>
        </dl>
      </template>
      <template #empty><RdEmptyState kind="empty" title="Thành phố chưa có cụm." body="Bổ sung dữ liệu cụm trước khi kiểm tra độ phủ." /></template>
    </RdDataTable>
    <p>Thuật toán vẫn dùng mặc định 60 phút khi chưa có thời lượng ghé, theo S34–S35.</p>
  </section>
</template>

<style scoped>
.rd-coverage-categories { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.rd-coverage-categories div { display: flex; justify-content: space-between; gap: var(--space-2); }
.rd-coverage-categories dd { margin: 0; font-weight: 600; }
</style>
