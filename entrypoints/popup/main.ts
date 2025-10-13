import { createApp } from 'vue';
import 'virtual:uno.css';
import '@unocss/reset/tailwind-compat.css'
import './style.css';
import App from './App.vue';
import '@arco-design/web-vue/dist/arco.css';
import { i18n } from '#i18n';

const app = createApp(App);
app.use(i18n);
app.mount('#app');
