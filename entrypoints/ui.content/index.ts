let cleanupFunction: (() => void) | null = null;
let storageListener: ((changes: Record<string, Browser.storage.StorageChange>, areaName: string) => void) | null = null;

export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_start',
  
  async main(_ctx) {
    // 检查扩展是否启用
    await refreshState();

    // 监听来自 popup 的消息
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[文本解锁] 收到消息:', message);
      
      if (message.action === 'refreshState') {
        void refreshState();
        sendResponse({ success: true, action: 'refreshState' });
      }
      
      return true; // 保持消息通道开启
    });

    storageListener = (changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes.textUnlockEnabled || changes.whitelist) {
        void refreshState();
      }
    };

    browser.storage.onChanged.addListener(storageListener);
  },
  destroy() {
    if (storageListener) {
      browser.storage.onChanged.removeListener(storageListener);
      storageListener = null;
    }
  },
});

async function refreshState() {
  const result = await browser.storage.local.get(['textUnlockEnabled', 'whitelist']);
  const whitelist: string[] = Array.isArray(result.whitelist) ? result.whitelist : [];
  const isEnabledGlobally = result.textUnlockEnabled !== false;
  const hostname = window.location.hostname;
  const allowAll = whitelist.length === 0;
  const isWhitelisted = allowAll || whitelist.includes(hostname);
  const shouldEnable = isEnabledGlobally && isWhitelisted;

  if (shouldEnable && !cleanupFunction) {
    cleanupFunction = enableTextSelection();
  } else if (!shouldEnable && cleanupFunction) {
    cleanupFunction();
    cleanupFunction = null;
  }
}

/**
 * 移除网站的文本选择和复制限制
 * 支持所有使用常见反复制技术的网站
 * @returns 清理函数
 */
function enableTextSelection(): () => void {
  console.log('[文本解锁] 正在移除文本选择限制...');

  let styleElement: HTMLStyleElement | null = null;
  let intervalId: number | null = null;
  const observers: MutationObserver[] = [];
  const eventListeners: Array<{ type: string; handler: EventListener }> = [];

  const siteContext: SiteHandlerContext = {
    observers,
    cleanupTasks: [],
  };

  // 针对特定网站的处理（异步）
  handleSpecificSites(siteContext).catch(error => {
    console.error('[文本解锁] 处理特定站点失败:', error);
  });

  // 1. 注入 CSS 样式，强制启用文本选择
  const injectStyle = async () => {
    // 读取水印移除配置
    const config = await browser.storage.local.get('enableWatermarkRemoval');
    const enableWatermarkRemoval = config.enableWatermarkRemoval !== false;

    const style = document.createElement('style');
    style.id = 'text-unlock-style';
    
    let watermarkStyles = '';
    if (enableWatermarkRemoval) {
      watermarkStyles = `
      /* 移除常见水印 */
      div[id*="watermark"],
      div[id*="WaterMark"],
      div[id*="Watermark"],
      div[class*="watermark"],
      div[class*="WaterMark"],
      div[class*="Watermark"],
      div[style*="pointer-events"][style*="background: url"],
      div[style*="pointer-events"][style*="background-image: url"],
      div[style*="pointer-events"][style*="background:url"] {
        opacity: 0 !important;
        visibility: hidden !important;
        display: none !important;
      }
      `;
    }

    style.textContent = `
      * {
        -webkit-touch-callout: auto !important;
        -webkit-user-select: text !important;
        -khtml-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      
      /* 移除可能的遮罩层 */
      body::before,
      body::after {
        display: none !important;
      }

      /* CSDN 特殊处理 */
      .article-content-hide,
      .hide-article-box,
      .hide-preCode-box,
      .hide-preCode-btn,
      .passport-login-container,
      .login-mark,
      .login-mark-fill {
        display: none !important;
      }

      #article_content,
      #content_views,
      .article_content,
      .hide-article-content,
      .hide-preCode-content {
        height: auto !important;
        overflow: visible !important;
        display: block !important;
      }

      /* 移除模糊效果 */
      .blur,
      [style*="blur"] {
        filter: none !important;
        -webkit-filter: none !important;
      }

      /* 确保 body 可滚动 */
      html, body {
        overflow: auto !important;
        height: auto !important;
      }

      ${watermarkStyles}
    `;
    
    // 确保在 head 存在时添加
    if (document.head) {
      document.head.appendChild(style);
      styleElement = style;
    } else {
      // 如果 head 还不存在，等待它
      const observer = new MutationObserver(() => {
        if (document.head && !document.getElementById('text-unlock-style')) {
          document.head.appendChild(style);
          styleElement = style;
          observer.disconnect();
        }
      });
      observer.observe(document.documentElement, { childList: true });
      observers.push(observer);
    }
  };

  injectStyle().catch(error => {
    console.error('[文本解锁] CSS 注入失败:', error);
  });

  // 2. 拦截并阻止所有限制性事件
  const eventTypes = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'dragstart', 'mousedown', 'keydown'];
  
  eventTypes.forEach(eventType => {
    const handler: EventListener = (e) => {
      // 阻止事件冒泡，但不阻止默认行为
      e.stopImmediatePropagation();
    };
    
    document.addEventListener(eventType, handler, true);
    eventListeners.push({ type: eventType, handler });
    
    const windowHandler: EventListener = (e) => {
      e.stopImmediatePropagation();
    };
    
    window.addEventListener(eventType, windowHandler, true);
    eventListeners.push({ type: eventType, handler: windowHandler });
  });

  // 3. 清除各种限制性属性和方法
  const clearRestrictions = () => {
    // 清除 document 和 body 上的事件处理器
    const targets = [document, document.documentElement, document.body].filter(Boolean);
    
    targets.forEach(target => {
      if (target) {
        target.oncopy = null;
        target.oncut = null;
        target.onpaste = null;
        target.onselectstart = null;
        target.oncontextmenu = null;
        target.ondragstart = null;
        target.onmousedown = null;
        target.onkeydown = null;
      }
    });
  };

  // 在不同时机清除限制
  clearRestrictions();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clearRestrictions);
  }
  
  window.addEventListener('load', clearRestrictions);

  // 4. 使用 MutationObserver 持续监听并移除新添加的限制
  const observer = new MutationObserver(() => {
    clearRestrictions();
  });
  observers.push(observer);

  // 等待 body 加载
  const startObserving = () => {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['oncopy', 'oncut', 'onpaste', 'onselectstart', 'oncontextmenu', 'ondragstart', 'style', 'class'],
      });
    }
  };

  if (document.body) {
    startObserving();
  } else {
    const bodyObserver = new MutationObserver(() => {
      if (document.body) {
        startObserving();
        bodyObserver.disconnect();
      }
    });
    bodyObserver.observe(document.documentElement, { childList: true });
    observers.push(bodyObserver);
  }

  // 5. 覆盖可能被修改的 Selection API
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type: string, listener: any, options?: any) {
    // 如果是限制性事件且回调函数包含 preventDefault，则不添加
    const restrictiveEvents = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu'];
    
    if (restrictiveEvents.includes(type.toLowerCase())) {
      // 检查是否是限制性的监听器
      const listenerStr = listener.toString();
      if (listenerStr.includes('preventDefault') || listenerStr.includes('return false')) {
        console.log(`[文本解锁] 已阻止添加限制性事件监听器: ${type}`);
        return;
      }
    }
    
    return originalAddEventListener.call(this, type, listener, options);
  };

  // 6. 定期清理（针对一些延迟加载的限制）
  intervalId = window.setInterval(clearRestrictions, 1000);

  console.log('[文本解锁] ✓ 文本选择和复制功能已启用');

  // 返回清理函数
  return () => {
    console.log('[文本解锁] 正在清理...');
    
    // 移除样式
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    
    // 清除定时器
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
    
    // 断开所有 observer
    observers.forEach(obs => obs.disconnect());
    
    // 移除事件监听器
    eventListeners.forEach(({ type, handler }) => {
      document.removeEventListener(type, handler, true);
      window.removeEventListener(type, handler, true);
    });

    siteContext.cleanupTasks?.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('[文本解锁] 特定站点清理失败:', error);
      }
    });

    console.log('[文本解锁] 已清理完成');
  };
}

/**
 * 处理特定网站的内容限制
 */
interface SiteHandlerContext {
  observers?: MutationObserver[];
  cleanupTasks?: Array<() => void>;
}

async function handleSpecificSites(context: SiteHandlerContext = {}) {
  const hostname = window.location.hostname;

  // 读取模块配置
  const config = await browser.storage.local.get([
    'enableCopyUnlock',
    'enableLinkRedirect',
    'enableAutoExpand',
    'enableWatermarkRemoval',
  ]);

  const enableCopyUnlock = config.enableCopyUnlock !== false;
  const enableLinkRedirect = config.enableLinkRedirect !== false;
  const enableAutoExpand = config.enableAutoExpand !== false;
  // enableWatermarkRemoval 通过 CSS 处理，不需要单独判断

  // CSDN 网站特殊处理（文本解锁）
  if (enableCopyUnlock && hostname.includes('csdn.net') && !hostname.includes('link.csdn.net')) {
    handleCSDN(context);
  }

  // 外链跳转功能
  if (enableLinkRedirect) {
    // Google 搜索去重定向
    if (hostname.includes('google')) {
      handleGoogle();
    }

    // link.zhihu.com 外链跳转
    if (hostname.includes('link.zhihu.com')) {
      handleZhihuLink();
    }

    // CSDN link.csdn.net 外链跳转
    if (hostname.includes('link.csdn.net')) {
      handleCsdnLink();
    }

    // 简书外链跳转
    if (hostname.includes('link.jianshu.com') || hostname.includes('www.jianshu.com')) {
      handleJianshuLink();
    }

    // QQ 邮箱外链跳转
    if (hostname.includes('mail.qq.com')) {
      handleQQMailLink();
    }

    // 掘金外链跳转
    if (hostname.includes('link.juejin.cn')) {
      handleJuejinLink();
    }
  }

  // 自动展开功能
  if (enableAutoExpand) {
    // 知乎页面自动展开
    if (hostname.includes('zhihu.com') && !hostname.startsWith('link.')) {
      const runExpand = () => expandZhihu();

      runExpand();

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runExpand, { once: true });
        context.cleanupTasks?.push(() => document.removeEventListener('DOMContentLoaded', runExpand));
      }

      const zhihuTimeout = window.setTimeout(runExpand, 1000);
      context.cleanupTasks?.push(() => clearTimeout(zhihuTimeout));

      const zhihuObserver = new MutationObserver(() => runExpand());
      context.cleanupTasks?.push(() => zhihuObserver.disconnect());

      const startZhihuObserver = () => {
        if (!document.documentElement) {
          return;
        }
        zhihuObserver.observe(document.documentElement, { childList: true, subtree: true });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startZhihuObserver, { once: true });
        context.cleanupTasks?.push(() => document.removeEventListener('DOMContentLoaded', startZhihuObserver));
      } else {
        startZhihuObserver();
      }
    }
  }
}

/**
 * 移除 CSDN 的关注限制和内容遮罩
 */
function handleCSDN({ observers, cleanupTasks }: SiteHandlerContext = {}) {
  console.log('[文本解锁] 检测到 CSDN，移除关注限制...');

  // 移除内容遮罩和限制
  const removeCSDNRestrictions = () => {
    // 1. 移除 "关注博主即可阅读全文" 的遮罩层
    const followMask = document.querySelector('.article-content-hide, .hide-article-box, .hide-preCode-box');
    if (followMask) {
      followMask.remove();
      console.log('[CSDN] 已移除关注遮罩');
    }

    // 2. 移除代码块的遮罩
    const codeMask = document.querySelector('.hide-preCode-btn');
    if (codeMask) {
      codeMask.remove();
      console.log('[CSDN] 已移除代码遮罩');
    }

    // 3. 展开文章内容
    const articleContent = document.querySelector('#article_content, #content_views, .article_content');
    if (articleContent) {
      (articleContent as HTMLElement).style.cssText = 'height: auto !important; overflow: visible !important;';
      console.log('[CSDN] 已展开文章内容');
    }

    // 4. 移除模糊效果
    const blurElements = document.querySelectorAll('[style*="blur"], .blur');
    blurElements.forEach(el => {
      (el as HTMLElement).style.filter = 'none';
      (el as HTMLElement).style.webkitFilter = 'none';
    });

    // 5. 展开所有隐藏的内容
    const hiddenContents = document.querySelectorAll('.hide-article-content, .hide-preCode-content');
    hiddenContents.forEach(el => {
      (el as HTMLElement).style.display = 'block';
      (el as HTMLElement).style.height = 'auto';
      (el as HTMLElement).style.overflow = 'visible';
    });

    // 6. 移除登录提示框
    const loginBox = document.querySelector('.passport-login-container, .login-mark, .login-mark-fill');
    if (loginBox) {
      loginBox.remove();
      console.log('[CSDN] 已移除登录框');
    }

    // 7. 恢复 body 滚动
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    // 8. 移除遮罩层背景
    const masks = document.querySelectorAll('[class*="mask"], [id*="mask"]');
    masks.forEach(mask => {
      const element = mask as HTMLElement;
      if (element.style.position === 'fixed' || element.style.position === 'absolute') {
        const bgColor = window.getComputedStyle(element).backgroundColor;
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
          element.remove();
        }
      }
    });

    // 9. 自动点击“阅读全文”按钮
    document.querySelectorAll<HTMLElement>('.btn-readmore, .hide-article-box .btn-readmore, .read-more_btn, .article_read_more').forEach(button => {
      if (button.dataset.tkExpansionClicked === 'true') {
        return;
      }
      button.dataset.tkExpansionClicked = 'true';
      if (typeof button.click === 'function') {
        button.click();
        console.log('[CSDN] 已自动展开全文');
      }
    });
  };

  // 立即执行
  removeCSDNRestrictions();

  // DOM 加载完成后再次执行
  if (document.readyState === 'loading') {
    const domReadyHandler = () => removeCSDNRestrictions();
    document.addEventListener('DOMContentLoaded', domReadyHandler, { once: true });
    cleanupTasks?.push(() => document.removeEventListener('DOMContentLoaded', domReadyHandler));
  }

  // 使用 MutationObserver 持续监控
  const observer = new MutationObserver(() => {
    removeCSDNRestrictions();
  });
  observers?.push(observer);

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } else {
    const bodyObserver = new MutationObserver(() => {
      const bodyElement = document.body;
      if (!bodyElement) {
        return;
      }

      removeCSDNRestrictions();
      observer.observe(bodyElement, {
        childList: true,
        subtree: true,
      });
      bodyObserver.disconnect();
    });

    bodyObserver.observe(document.documentElement, { childList: true, subtree: true });
    observers?.push(bodyObserver);
    cleanupTasks?.push(() => bodyObserver.disconnect());
  }

  // 定期检查（某些网站会延迟加载限制）
  const intervalId = window.setInterval(removeCSDNRestrictions, 1000);
  cleanupTasks?.push(() => clearInterval(intervalId));

  const autoCleanupTimeout = window.setTimeout(() => {
    clearInterval(intervalId);
    observer.disconnect();
  }, 5000);
  cleanupTasks?.push(() => clearTimeout(autoCleanupTimeout));
}

function handleGoogle() {
  const isScholar = window.location.host.startsWith('scholar');
  const selector = isScholar ? '#gs_bdy_ccl .gs_rt a' : '#res a';
  const applyTarget = () => {
    document.querySelectorAll<HTMLAnchorElement>(selector).forEach(item => {
      item.setAttribute('target', '_blank');
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTarget, { once: true });
  } else {
    applyTarget();
  }
}

function handleZhihuLink() {
  const match = /.*link.zhihu.com\/\?target=(.*)/.exec(window.location.href);
  if (match) {
    const target = decodeURIComponent(match[1]);
    if (target) {
      window.location.replace(target);
    }
  }
}

function handleCsdnLink() {
  const match = /.*link.csdn.net\/\?target=(.*)/.exec(window.location.href);
  if (match) {
    const target = decodeURIComponent(match[1]);
    if (target) {
      window.location.replace(target);
    }
  }
}

function handleJianshuLink() {
  const match = /.*jianshu.com\/go-wild.*url=(.*)/.exec(window.location.href);
  if (match) {
    const target = decodeURIComponent(match[1]);
    if (target) {
      window.location.replace(target);
    }
  }
}

function expandZhihu() {
  const clickAll = (selector: string) => {
    document.querySelectorAll<HTMLElement>(selector).forEach(element => {
      if (element.dataset.tkExpansionClicked === 'true') {
        return;
      }

      element.dataset.tkExpansionClicked = 'true';

      if (typeof element.click === 'function') {
        element.click();
      }
    });
  };

  clickAll('.QuestionMainAction.ViewAll-QuestionMainAction, button[aria-label="查看全部回答"], button.ContentItem-more');
  clickAll('button.QuestionShowMore-button, button.Button--plain.Button--blue');
}

function handleQQMailLink() {
  const url = new URL(window.location.href);
  const target = url.searchParams.get('gourl');
  if (target) {
    window.location.replace(decodeURIComponent(target));
  }
}

function handleJuejinLink() {
  const url = new URL(window.location.href);
  const target = url.searchParams.get('target');
  if (target) {
    window.location.replace(decodeURIComponent(target));
  }
}
