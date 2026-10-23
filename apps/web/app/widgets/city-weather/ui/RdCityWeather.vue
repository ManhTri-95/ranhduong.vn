<script setup lang="ts">
import type { CityWeather } from '@ranhduong/contracts';
import { computed, onMounted, onScopeDispose, watch } from 'vue';
import { cityWeatherDisplay } from '~/entities/city/lib/city-weather';

const props = defineProps<{ citySlug: string; cityName: string; weather: CityWeather | null | undefined }>();
// Preserve the SSR clock through hydration; switch to the real clock on mount.
const clock = useState(`weather-clock:${props.citySlug}`, () => Date.now());
const display = computed(() => cityWeatherDisplay(props.weather, clock.value));
let timer: ReturnType<typeof setTimeout> | undefined;
let mounted = false;
function update(): void {
  clearTimeout(timer);
  clock.value = Date.now();
  if (!mounted || !props.weather) return;
  const remaining = Date.parse(props.weather.expiresAt) - clock.value;
  if (remaining > 0) timer = setTimeout(update, remaining);
}
watch(() => props.weather, () => { if (mounted) update(); });
onMounted(() => { mounted = true; update(); document.addEventListener('visibilitychange', update); });
onScopeDispose(() => { clearTimeout(timer); if (mounted) document.removeEventListener('visibilitychange', update); });
</script>

<template>
  <section v-if="display && weather" class="rd-city-weather" aria-labelledby="city-weather-title">
    <div class="rd-weather rd-city-weather__tile">
      <div class="rd-city-weather__main">
        <span class="rd-weather__icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <template v-if="weather.state === 'sun' && weather.isDay">
            <circle cx="16" cy="16" r="6" /><path d="M16 2v4m0 20v4M2 16h4m20 0h4M6 6l3 3m14 14 3 3M6 26l3-3M23 9l3-3" />
          </template>
          <path v-else-if="weather.state === 'sun'" d="M25 22A12 12 0 0 1 10 6a12 12 0 1 0 15 16Z" />
          <path v-else-if="weather.state === 'fog'" d="M4 10h24M7 16h18M3 22h26M9 28h14" />
          <template v-else>
            <path d="M7 21a6 6 0 1 1 1-12 8 8 0 0 1 15 3 5 5 0 1 1 1 9H7Z" />
            <path v-if="weather.state === 'rain'" d="m10 25-2 4m9-4-2 4m9-4-2 4" />
          </template>
        </svg>
        </span>
        <div class="rd-city-weather__text">
          <p class="rd-weather__kicker">{{ cityName }} lúc này</p>
          <h2 id="city-weather-title" class="rd-weather__title">{{ display.title }}</h2>
          <p class="rd-weather__sub">{{ display.hint }}</p>
        </div>
      </div>
      <NuxtLink v-if="display.rainMode" class="rd-city-weather__rain" :to="`/${citySlug}/ban-do?rainSafe=true`">Tìm quán có mái che →</NuxtLink>
      <div class="rd-city-weather__source">
        <p><a href="https://www.weatherapi.com/" target="_blank" rel="noopener noreferrer">WeatherAPI.com</a> · Thời tiết chỉ để tham khảo, có thể khác theo vị trí và thời điểm.</p>
        <details>
          <summary>Lưu ý khi xem dự báo</summary>
          <p>Dự báo mang tính xác suất và có thể không chính xác. Với quyết định liên quan đến an toàn cá nhân, hàng không, hàng hải hoặc ứng phó khẩn cấp, hãy xem thông tin khí tượng chính thức và hướng dẫn của cơ quan có thẩm quyền; không dùng dữ liệu này làm căn cứ duy nhất.</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rd-city-weather { min-width: 0; }
.rd-city-weather__tile { flex-direction: column; align-items: stretch; gap: var(--space-2); border-radius: var(--radius-card); }
.rd-city-weather__main { display: flex; align-items: flex-start; gap: var(--space-3); }
.rd-weather__icon svg { width: var(--space-7); height: var(--space-7); }
.rd-city-weather__text { min-width: 0; }
.rd-city-weather__text p, .rd-city-weather__text h2 { margin: 0; }
.rd-weather__title { margin-top: var(--space-1); }
.rd-weather__sub { margin-top: var(--space-1); }
.rd-city-weather__rain { display: inline-flex; align-items: center; min-height: var(--tap-min); color: var(--paper-raised); font-size: 14px; font-weight: 600; text-underline-offset: var(--space-1); }
/* Ghi nguồn và miễn trừ nằm trong ô (S24 bắt buộc), chữ sáng 86% trên --ink vẫn đạt AA; màu pha từ token. */
.rd-city-weather__source { padding-top: var(--space-2); border-top: 1px solid color-mix(in srgb, var(--paper-raised) 20%, transparent); font-size: 12px; line-height: 1.5; color: color-mix(in srgb, var(--paper-raised) 86%, transparent); }
/* Vòng focus mặc định màu --ink không thấy trên nền --ink. */
.rd-city-weather__tile :focus-visible { outline-color: var(--paper-raised); }
.rd-city-weather__source p { margin: 0; }
.rd-city-weather__source a { color: inherit; }
.rd-city-weather__source summary { display: inline-flex; align-items: center; min-height: var(--tap-min); cursor: pointer; text-decoration: underline; }
.rd-city-weather__source details p { margin-bottom: var(--space-1); }
</style>
