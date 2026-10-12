<script setup lang="ts">
import { HexColor, type CitySeasonForm } from '@ranhduong/contracts';
import { nextTick, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { moveSeason, newSeason, type SeasonIllustration } from '../model/form';
import type { useSeasonEditor } from '../model/use-season-editor';
const props = defineProps<{ editor: ReturnType<typeof useSeasonEditor> }>();
const { form, itineraries, loading, busy, loadError, errors, notice, loginRequired, conflict, restorable, localKept, dirty } = props.editor;
const feedback = ref<HTMLElement | null>(null);
const kinds = [{ value: 'flower', label: 'Mùa hoa' }, { value: 'rain', label: 'Mùa mưa' }, { value: 'other', label: 'Khác' }];
const illustrations = [{ value: 'wild-sunflower', label: 'Dã quỳ' }, { value: 'cherry-blossom', label: 'Mai anh đào' }, { value: 'rain', label: 'Mưa' }, { value: 'notebook', label: 'Sổ tay' }];
function add(illustration: SeasonIllustration): void { if (form.value.seasons.length < 24) form.value.seasons.push(newSeason(illustration)); }
function color(season: CitySeasonForm): string { return HexColor.safeParse(season.accent).success ? season.accent : 'var(--accent)'; }
function error(index: number, field: string): string { return errors.value.find((issue) => issue.path.join('.') === `seasons.${index}.${field}`)?.message ?? ''; }
watch(errors, async (issues) => { if (issues.length) { await nextTick(); feedback.value?.focus({ preventScroll: true }); feedback.value?.scrollIntoView({ block: 'center' }); } });
</script>

<template>
  <div class="rd-seasons">
    <h1>Mùa & giao diện</h1>
    <p>Mỗi mùa đổi màu nhấn, banner và lịch trình gợi ý trên trang chủ. Mùa hoa ưu tiên hơn các mùa khác; nếu cùng loại thì lấy mùa ở trên trước.</p>
    <p v-if="loading" role="status">Đang tải cấu hình mùa…</p>
    <div v-if="loadError" class="rd-callout rd-callout--bad" role="alert"><p>{{ loadError }}</p><button class="rd-btn rd-btn--outline" type="button" @click="editor.load">Thử lại</button></div>
    <RouterLink v-if="loginRequired" class="rd-btn rd-btn--outline" :to="{ path: '/dang-nhap', query: { returnTo: '/mua' } }">Đăng nhập lại để lưu tiếp</RouterLink>
    <form v-if="!loading && form.updatedAt" class="rd-seasons__form" @submit.prevent="editor.save">
      <div v-if="restorable" class="rd-callout rd-callout--warn"><p>Có cấu hình chưa lưu trên máy này.</p><div class="rd-seasons__actions"><button class="rd-btn rd-btn--outline" type="button" @click="editor.restore">Khôi phục</button><button class="rd-btn rd-btn--outline" type="button" @click="editor.discardLocal">Bỏ bản trên máy</button></div></div>
      <div v-if="errors.length" ref="feedback" class="rd-callout rd-callout--bad" role="alert" tabindex="-1"><p v-for="(issue, i) in errors" :key="i">{{ issue.path[0] === 'seasons' && typeof issue.path[1] === 'number' ? `Mùa ${issue.path[1] + 1}: ` : '' }}{{ issue.message }}</p></div>
      <div v-if="conflict" class="rd-callout rd-callout--warn"><p>Cấu hình trên server đã đổi. Tải phiên bản mới rồi quyết định dùng bản đang sửa; lưu lại sẽ thay cấu hình trên server.</p><div class="rd-seasons__actions"><button type="button" class="rd-btn rd-btn--outline" @click="editor.load">Tải phiên bản mới</button><button type="button" class="rd-btn rd-btn--outline" :disabled="editor.latest.value?.updatedAt === form.updatedAt" @click="editor.adoptLatestVersion">Giữ bản đang sửa với phiên bản mới</button></div></div>
      <p v-if="notice" class="rd-callout rd-callout--ok" role="status">{{ notice }}</p>
      <fieldset :disabled="busy" class="rd-seasons__fieldset">
        <legend class="rd-seasons__legend">Cấu hình mùa</legend>
        <p class="rd-field__hint">Ngày nhập theo tháng-ngày (MM-DD), lặp lại hằng năm và tính cả ngày đầu, ngày cuối. Ví dụ 12-20 → 02-28 kéo dài qua năm mới. Chỉnh ngày theo thực tế trước khi lưu.</p>
        <p v-if="!form.seasons.length" class="rd-callout">Chưa có mùa. Web dùng màu mặc định của thành phố và danh sách lịch trình hiện có.</p>
        <section v-for="(season, index) in form.seasons" :key="index" class="rd-admin-section rd-seasons__item" :aria-label="`Mùa ${index + 1}`">
          <div class="rd-seasons__head"><h2>Mùa {{ index + 1 }} · {{ season.title || 'Chưa có tiêu đề' }}</h2><div class="rd-seasons__actions"><button class="rd-btn rd-btn--outline" type="button" :disabled="index === 0" :aria-label="`Đưa mùa ${index + 1} lên`" @click="form.seasons = moveSeason(form.seasons, index, index - 1)">Lên</button><button class="rd-btn rd-btn--outline" type="button" :disabled="index === form.seasons.length - 1" :aria-label="`Đưa mùa ${index + 1} xuống`" @click="form.seasons = moveSeason(form.seasons, index, index + 1)">Xuống</button><button class="rd-btn rd-btn--outline" type="button" :aria-label="`Xoá mùa ${index + 1}`" @click="form.seasons.splice(index, 1)">Xoá</button></div></div>
          <div class="rd-seasons__grid">
            <label class="rd-field"><span class="rd-field__label">Khoá mùa (không dấu)</span><input v-model="season.key" class="rd-input" maxlength="80" placeholder="da-quy" :aria-invalid="Boolean(error(index, 'key'))"><span v-if="error(index, 'key')" class="rd-field__error">{{ error(index, 'key') }}</span></label>
            <label class="rd-field"><span class="rd-field__label">Loại mùa</span><select v-model="season.kind" class="rd-input"><option v-for="kind in kinds" :key="kind.value" :value="kind.value">{{ kind.label }}</option></select></label>
            <label class="rd-field"><span class="rd-field__label">Từ ngày (MM-DD)</span><input v-model="season.from" class="rd-input" maxlength="5" placeholder="10-20" :aria-invalid="Boolean(error(index, 'from'))"><span v-if="error(index, 'from')" class="rd-field__error">{{ error(index, 'from') }}</span></label>
            <label class="rd-field"><span class="rd-field__label">Đến ngày (MM-DD)</span><input v-model="season.to" class="rd-input" maxlength="5" placeholder="12-10" :aria-invalid="Boolean(error(index, 'to'))"><span v-if="error(index, 'to')" class="rd-field__error">{{ error(index, 'to') }}</span></label>
            <label class="rd-field"><span class="rd-field__label">Màu nhấn (#RRGGBB)</span><input v-model="season.accent" class="rd-input" maxlength="7" :aria-invalid="Boolean(error(index, 'accent'))"><span v-if="error(index, 'accent')" class="rd-field__error">{{ error(index, 'accent') }}</span></label>
            <label class="rd-field"><span class="rd-field__label">Minh hoạ</span><select v-model="season.illustration" class="rd-input"><option v-if="!illustrations.some(item => item.value === season.illustration)" :value="season.illustration">Minh hoạ cũ (web dùng sổ tay)</option><option v-for="item in illustrations" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
          </div>
          <label class="rd-field"><span class="rd-field__label">Tiêu đề banner</span><input v-model="season.title" class="rd-input" maxlength="120" :aria-invalid="Boolean(error(index, 'title'))"><span v-if="error(index, 'title')" class="rd-field__error">{{ error(index, 'title') }}</span></label>
          <label class="rd-field"><span class="rd-field__label">Mô tả</span><textarea v-model="season.sub" class="rd-input" rows="3" maxlength="500" :aria-invalid="Boolean(error(index, 'sub'))" /><span v-if="error(index, 'sub')" class="rd-field__error">{{ error(index, 'sub') }}</span></label>
          <label class="rd-field"><span class="rd-field__label">Lịch trình nổi bật</span><select v-model="season.featuredItineraryId" class="rd-input"><option value="">Chưa gắn lịch trình</option><option v-if="season.featuredItineraryId && !itineraries.some(item => item.id === season.featuredItineraryId)" :value="season.featuredItineraryId">Lịch trình không còn công khai — chọn lại hoặc bỏ liên kết</option><option v-for="item in itineraries" :key="item.id" :value="item.id">{{ item.title }} · {{ item.days }} ngày</option></select></label>
          <aside class="rd-seasons__preview" :style="{ '--accent': color(season) }" aria-label="Xem trước banner"><span class="rd-chip rd-chip--accent">Theo mùa</span><h3>{{ season.title || 'Tiêu đề banner' }}</h3><p>{{ season.sub || 'Mô tả mùa sẽ hiện ở đây.' }}</p><span v-if="season.featuredItineraryId" class="rd-seasons__preview-link">{{ itineraries.find(item => item.id === season.featuredItineraryId)?.title ?? 'Lịch trình cần chọn lại' }} →</span></aside>
        </section>
        <div class="rd-seasons__actions"><button class="rd-btn rd-btn--outline" type="button" :disabled="form.seasons.length >= 24" @click="add('wild-sunflower')">+ Mùa dã quỳ</button><button class="rd-btn rd-btn--outline" type="button" :disabled="form.seasons.length >= 24" @click="add('cherry-blossom')">+ Mai anh đào</button><button class="rd-btn rd-btn--outline" type="button" :disabled="form.seasons.length >= 24" @click="add('rain')">+ Mùa mưa</button><button class="rd-btn rd-btn--outline" type="button" :disabled="form.seasons.length >= 24" @click="add('notebook')">+ Mùa khác</button></div>
        <div class="rd-seasons__save"><button class="rd-btn rd-btn--accent" type="submit">{{ busy ? 'Đang lưu…' : 'Lưu cấu hình mùa' }}</button><p class="rd-field__hint" role="status">{{ dirty ? (localKept ? 'Đang sửa · đã giữ bản trên máy.' : 'Đang sửa · chưa giữ được trên máy, đừng đóng trang.') : 'Cấu hình đã lưu trên server.' }}</p></div>
      </fieldset>
    </form>
  </div>
</template>
