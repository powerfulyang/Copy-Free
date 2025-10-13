import { createApp } from 'vue';
import 'virtual:uno.css';
import '@unocss/reset/tailwind-compat.css'
import App from './App.vue';
import ArcoVue from '@arco-design/web-vue';
import '@arco-design/web-vue/dist/arco.css';
import { i18n } from '#i18n';

async function init() {
  // 注入基础样式
  const baseStyle = document.createElement('style');
  baseStyle.textContent = `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
  `;
  document.head.appendChild(baseStyle);
  
  // 挂载 Vue 应用
  const app = createApp(App);
  app.use(ArcoVue);
  app.use(i18n);
  app.mount('#app');
  
  // 监听大小变化并通知父窗口
  const appElement = document.getElementById('app');
  if (appElement) {
    const resizeObserver = new ResizeObserver(() => {
      const height = appElement.offsetHeight;
      const width = appElement.offsetWidth;
      window.parent.postMessage({
        type: 'text-unlock-resize',
        height: height + 10,
        width: width + 10,
      }, '*');
    });
    resizeObserver.observe(appElement);
    
    // 初始调整大小
    setTimeout(() => {
      const height = appElement.offsetHeight;
      const width = appElement.offsetWidth;
      window.parent.postMessage({
        type: 'text-unlock-resize',
        height: height + 10,
        width: width + 10,
      }, '*');
    }, 100);
  }
}

init();
