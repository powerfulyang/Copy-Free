import { DEFAULT_WHITELIST } from '../utils/constants';

export default defineBackground(() => {
  console.log('Copy Free background initialized', { id: browser.runtime.id });

  // 监听扩展安装事件
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      // 首次安装时初始化默认白名单
      console.log('First install, initializing default whitelist');
      await browser.storage.local.set({
        whitelist: [...DEFAULT_WHITELIST],
        textUnlockEnabled: true,
        enableCopyUnlock: true,
        enableLinkRedirect: true,
        enableAutoExpand: true,
        enableWatermarkRemoval: true,
      });
    } else if (details.reason === 'update') {
      console.log('Extension updated', details.previousVersion, '->', browser.runtime.getManifest().version);
    }
  });
});
