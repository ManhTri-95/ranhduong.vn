import '@ranhduong/ui/tokens.css';
import '@ranhduong/ui/components.css';
import '@ranhduong/ui/admin.css';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';

const app = createApp(App).use(router);
// Lần điều hướng đầu có thể chuyển sang /dang-nhap; chờ xong rồi mới hiện giao diện.
void router.isReady().then(() => app.mount('#app'));
