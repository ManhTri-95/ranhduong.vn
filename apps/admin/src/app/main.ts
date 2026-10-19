import '@ranhduong/ui/tokens.css';
import '@ranhduong/ui/components.css';
import '@ranhduong/ui/admin.css';
import { createApp } from 'vue';
import App from './App.vue';
import { installChunkRecovery } from './chunk-recovery';
import { router } from './router';

installChunkRecovery(router);
const app = createApp(App).use(router);
// Lần điều hướng đầu có thể chuyển sang /dang-nhap; chờ xong rồi mới hiện giao diện.
// Lần đầu lỗi (chunk không tải được) vẫn mount để hiện thông báo thay vì trang trắng.
void router.isReady().catch(() => undefined).then(() => app.mount('#app'));
