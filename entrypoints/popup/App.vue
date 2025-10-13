<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import StatusSection from '@/components/popup/StatusSection.vue';
import InfoSection from '@/components/popup/InfoSection.vue';
import ModuleSettings from '@/components/popup/ModuleSettings.vue';
import ActionsSection from '@/components/popup/ActionsSection.vue';
import { i18n } from '#i18n';
import packageJson from '../../package.json';

const { t } = i18n;

const globalEnabled = ref(true);
const loading = ref(true);
const currentUrl = ref('');
const version = packageJson.version;
const whitelist = ref<string[]>([]);

const allowAll = computed(() => whitelist.value.length === 0);
const isListed = computed(() => {
  if (!currentUrl.value) return false;
  return whitelist.value.includes(currentUrl.value);
});
const isActiveOnSite = computed(() => allowAll.value || isListed.value);
const isActive = computed(() => globalEnabled.value && isActiveOnSite.value);

const fetchCurrentHostname = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.url) {
    currentUrl.value = new URL(tabs[0].url).hostname;
  } else {
    currentUrl.value = '';
  }
};

// 从存储中读取设置
const loadSettings = async () => {
  loading.value = true;
  try {
    await fetchCurrentHostname();
    const result = await browser.storage.local.get(['textUnlockEnabled', 'whitelist']);
    whitelist.value = Array.isArray(result.whitelist) ? result.whitelist : [];
    globalEnabled.value = result.textUnlockEnabled !== false;
  } catch (error) {
    console.error('读取设置失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadSettings();
  browser.storage.onChanged.addListener(handleStorageChange);
});

onUnmounted(() => {
  browser.storage.onChanged.removeListener(handleStorageChange);
});

// 切换开关
const handleToggleEnabled = async (value: boolean) => {
  try {
    // 立即更新 UI 状态
    globalEnabled.value = value;
    
    // 保存到存储
    await browser.storage.local.set({ textUnlockEnabled: value });

    // 获取当前标签页
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) return;

    // 通知内容脚本刷新状态
    try {
      await browser.tabs.sendMessage(tabs[0].id, {
        action: 'refreshState'
      });
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // 内容脚本可能还未加载，直接刷新页面
      console.log('内容脚本未响应，将刷新页面');
    }
    
    // 刷新当前标签页以确保更改生效
    await browser.tabs.reload(tabs[0].id);
  } catch (error) {
    console.error('保存设置失败:', error);
    // 如果失败，恢复原状态
    globalEnabled.value = !value;
  }
};

const handleWhitelistToggle = async () => {
  if (!currentUrl.value) return;
  const currentIndex = whitelist.value.indexOf(currentUrl.value);
  const updated = [...whitelist.value];

  if (currentIndex > -1) {
    updated.splice(currentIndex, 1);
  } else {
    updated.push(currentUrl.value);
  }

  whitelist.value = updated;
  await browser.storage.local.set({ whitelist: updated });
};

// 刷新当前页面
const handleRefresh = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.id) {
    browser.tabs.reload(tabs[0].id);
  }
};

const handleStorageChange = (
  changes: Record<string, Browser.storage.StorageChange>,
  areaName: string,
) => {
  if (areaName !== 'local') return;

  if (changes.textUnlockEnabled) {
    globalEnabled.value = changes.textUnlockEnabled.newValue !== false;
  }

  if (changes.whitelist) {
    const newWhitelist = changes.whitelist.newValue;
    whitelist.value = Array.isArray(newWhitelist) ? newWhitelist : [];
  }
};

// 打开设置页面
const openOptionsPage = () => {
  browser.runtime.openOptionsPage();
};
</script>

<template>
  <div class="popup-container">
    <div class="content">
      <a-card :bordered="false">
        <StatusSection :enabled="isActive" :loading="loading" @change="handleToggleEnabled" />

        <a-divider :margin="12" />

        <InfoSection :current-url="currentUrl" :version="version" />

        <a-divider :margin="12" />

        <ModuleSettings
          :whitelist="whitelist"
          :current-url="currentUrl"
          :is-whitelisted="isListed"
          @toggle-whitelist="handleWhitelistToggle"
        />

        <a-divider :margin="12" />

        <ActionsSection @refresh="handleRefresh" />

        <a-divider :margin="12" />

        <div class="options-link">
          <a-button type="text" long @click="openOptionsPage">
            <template #icon><icon-settings /></template>
            {{ t('popup.openOptions') }}
          </a-button>
        </div>
      </a-card>
    </div>
  </div>
</template>

<style scoped>
.popup-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding: 1rem;
}

.content :deep(.arco-card) {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.content :deep(.arco-card-body) {
  padding: 16px;
}

.options-link {
  display: flex;
  justify-content: center;
}

.options-link :deep(.arco-btn-text) {
  color: #4e5969;
  font-size: 13px;
}

.options-link :deep(.arco-btn-text:hover) {
  background-color: rgba(var(--primary-6), 0.1);
  color: rgb(var(--primary-6));
}
</style>
