<script setup lang="ts">
import { BEST_TIME_LABEL, CATEGORY_LABEL, COVER_LABEL, formatOpeningHours, PLACE_TRANSPORT_LABEL, type CsvImportRow } from '@ranhduong/contracts';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
const props = defineProps<{ row: CsvImportRow }>();
const fields = computed(() => {
  const draft = props.row.preview;
  if (!draft) return [];
  const place = draft.place;
  const coordinates = place.location?.coordinates;
  return [
    { label: 'ID Sheet', value: draft.sheetId },
    { label: 'ID OSM', value: draft.osmId },
    { label: 'Địa chỉ', value: place.address },
    { label: 'Toạ độ (lat,lng)', value: coordinates ? `${coordinates[1]},${coordinates[0]}` : undefined },
    { label: 'Điện thoại', value: place.contact.phone },
    { label: 'Fanpage', value: place.contact.fanpage },
    { label: 'Website', value: place.contact.website },
    { label: 'Giờ mở cửa', value: formatOpeningHours(place.openingHours) || 'Chưa có giờ mở cửa' },
    { label: 'Tên khác', value: place.aliases.join('; ') },
    { label: 'Cũng phục vụ', value: place.alsoCategories.map((item) => CATEGORY_LABEL[item]).join(', ') },
    { label: 'Mái che', value: place.cover ? COVER_LABEL[place.cover] : undefined },
    { label: 'Mức giá', value: place.priceLevel ? String(place.priceLevel) : undefined },
    { label: 'Thời gian ghé', value: place.visitDurationMin ? `${place.visitDurationMin} phút` : undefined },
    { label: 'Lúc đẹp', value: place.bestTime.map((item) => BEST_TIME_LABEL[item]).join(', ') },
    { label: 'Thẻ', value: place.tags.join('; ') },
    { label: 'Phương tiện', value: place.transport.map((item) => PLACE_TRANSPORT_LABEL[item]).join(', ') },
    { label: 'Ghi chú', value: place.practicalNotes },
  ].filter((field) => field.value);
});
</script>

<template>
  <template v-if="row.preview">
    <p>{{ CATEGORY_LABEL[row.preview.place.category] }} · {{ row.preview.place.zone || 'Chưa chọn khu vực' }} · {{ row.preview.place.verifySource === 'owner' ? 'Quán đã xác nhận' : 'Quản trị xác nhận' }}</p>
    <details class="rd-import-data">
      <summary>Xem dữ liệu dòng {{ row.row }}</summary>
      <dl>
        <template v-for="field in fields" :key="field.label"><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></template>
      </dl>
    </details>
  </template>
  <p v-if="row.message">{{ row.message }}</p>
  <ul v-if="row.issues.length" class="rd-import-issues">
    <li v-for="(issue, index) in row.issues" :key="index">
      <strong>{{ issue.column }}:</strong> {{ issue.message }}<br />
      <span>Cách sửa: {{ issue.fix }}</span>
    </li>
  </ul>
  <ul v-if="row.matches.length" class="rd-import-issues">
    <li v-for="(match, index) in row.matches" :key="index">
      <RouterLink v-if="match.placeId" :to="`/dia-diem/${match.placeId}`" target="_blank" rel="noopener">{{ match.name }} ↗</RouterLink>
      <span v-else>Dòng {{ match.row }} · {{ match.name }}</span>
    </li>
  </ul>
  <RouterLink v-if="row.status === 'created' && row.placeId" :to="`/dia-diem/${row.placeId}`">Hoàn thiện địa điểm →</RouterLink>
</template>

<style scoped>
p { margin: 0; }
.rd-import-issues { margin: 0; padding-left: var(--space-5); }
.rd-import-issues li + li { margin-top: var(--space-2); }
a, span, li { overflow-wrap: anywhere; }
.rd-import-data summary { min-height: var(--tap-min); align-content: center; cursor: pointer; font-weight: 600; }
.rd-import-data dl { display: grid; grid-template-columns: minmax(90px, 1fr) minmax(0, 3fr); gap: var(--space-2); margin: 0 0 var(--space-3); }
.rd-import-data dt { color: var(--ink-soft); }
.rd-import-data dd { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
</style>
