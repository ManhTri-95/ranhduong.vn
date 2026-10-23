<script setup lang="ts">
import { ref } from 'vue';
import { shareItinerary, type ShareChannel } from '../lib/share';

const props = defineProps<{ title: string; url: string }>();
const busy = ref(false);
const status = ref('');
const fallback = ref<ShareChannel | null>(null);
async function share(channel: ShareChannel): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  fallback.value = null;
  const name = channel === 'zalo' ? 'Zalo' : 'Messenger';
  status.value = channel === 'copy' ? '' : `Chọn ${name} trong bảng chia sẻ để gửi lịch trình.`;
  const result = await shareItinerary(channel, { title: props.title, url: props.url }, {
    share: typeof navigator.share === 'function' ? (data) => navigator.share(data) : undefined,
    copy: navigator.clipboard?.writeText ? (text) => navigator.clipboard.writeText(text) : undefined,
  });
  busy.value = false;
  if (result === 'cancelled') status.value = 'Đã đóng bảng chia sẻ.';
  else if (result === 'shared') status.value = 'Đã mở bảng chia sẻ.';
  else {
    fallback.value = channel;
    status.value = result === 'copied'
      ? channel === 'copy' ? 'Đã copy link lịch trình.' : `Đã copy link. Mở ${name} và dán vào cuộc trò chuyện nhé.`
      : 'Bạn chọn và chép đường dẫn bên dưới để gửi nhé.';
  }
}
</script>

<template>
  <section class="rd-itinerary-share" aria-labelledby="itinerary-share-title">
    <h2 id="itinerary-share-title" class="section-title" tabindex="-1">Rủ bạn đi cùng</h2>
    <p>Chọn Zalo hoặc Messenger trong bảng chia sẻ của điện thoại để gửi lịch này cho bạn.</p>
    <div class="rd-itinerary-share__buttons">
      <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="share('zalo')">Zalo</button>
      <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="share('messenger')">Messenger</button>
      <button type="button" class="rd-btn rd-btn--outline" :disabled="busy" @click="share('copy')">Copy link</button>
    </div>
    <!-- S30: widget đặt nút "Tạo vé để chia sẻ" ở đây. -->
    <slot />
    <p class="rd-itinerary-share__status" role="status" aria-live="polite">{{ status }}</p>
    <div v-if="fallback" class="rd-itinerary-share__fallback">
      <label for="itinerary-share-url">Link lịch trình</label>
      <input id="itinerary-share-url" :value="url" readonly @focus="($event.target as HTMLInputElement).select()">
      <a v-if="fallback === 'zalo'" class="rd-btn rd-btn--outline" href="https://chat.zalo.me" target="_blank" rel="noopener noreferrer">Mở Zalo để dán link</a>
      <a v-else-if="fallback === 'messenger'" class="rd-btn rd-btn--outline" href="https://www.facebook.com/messages/" target="_blank" rel="noopener noreferrer">Mở Messenger để dán link</a>
    </div>
    <noscript>Chép đường dẫn này để gửi qua Zalo hoặc Messenger: {{ url }}</noscript>
  </section>
</template>

<style scoped>
.rd-itinerary-share { display: grid; gap: var(--space-3); padding-top: var(--space-6); border-top: var(--border); }
.rd-itinerary-share h2, .rd-itinerary-share p { margin: 0; }
.rd-itinerary-share p { color: var(--ink-soft); line-height: 1.7; }
.rd-itinerary-share__buttons { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rd-itinerary-share__buttons button { font: inherit; cursor: pointer; }
.rd-itinerary-share__status { min-height: 1.7em; font-size: 14px; }
.rd-itinerary-share__fallback { display: grid; gap: var(--space-2); }
.rd-itinerary-share__fallback input { min-width: 0; width: 100%; min-height: var(--tap-min); padding: var(--space-2); border: var(--border-ink); border-radius: var(--radius-chip); background: var(--paper-raised); color: var(--ink); font: inherit; }
.rd-itinerary-share__fallback a { justify-self: start; }
.rd-itinerary-share noscript { overflow-wrap: anywhere; }
</style>
