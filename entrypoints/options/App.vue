<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { i18n } from '#i18n';
import { Message, Modal } from '@arco-design/web-vue';
import { DEFAULT_WHITELIST } from '../../utils/constants';
import LanguageSelector from '../../components/popup/LanguageSelector.vue';
import packageJson from '../../package.json';

const { t } = i18n;

const whitelist = ref<string[]>([]);
const newDomain = ref('');
const loading = ref(false);
const globalEnabled = ref(true);
const version = packageJson.version;

// 加载设置
const loadSettings = async () => {
  loading.value = true;
  try {
    const result = await browser.storage.local.get(['whitelist', 'textUnlockEnabled']);
    whitelist.value = Array.isArray(result.whitelist) ? result.whitelist : [];
    globalEnabled.value = result.textUnlockEnabled !== false;
  } catch (error) {
    console.error('Failed to load settings:', error);
    Message.error(t('messages.readSettingsFailed'));
  } finally {
    loading.value = false;
  }
};

// 保存白名单
const saveWhitelist = async (newWhitelist: string[]) => {
  try {
    await browser.storage.local.set({ whitelist: newWhitelist });
    whitelist.value = newWhitelist;
    Message.success(t('options.whitelist.saveSuccess'));
  } catch (error) {
    console.error('Failed to save whitelist:', error);
    Message.error(t('messages.saveSettingsFailed'));
  }
};

// 添加域名
const handleAddDomain = async () => {
  const domain = newDomain.value.trim().toLowerCase();
  
  if (!domain) {
    Message.warning(t('options.whitelist.emptyDomain'));
    return;
  }

  // 简单的域名验证
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) {
    Message.warning(t('options.whitelist.invalidDomain'));
    return;
  }

  if (whitelist.value.includes(domain)) {
    Message.warning(t('options.whitelist.alreadyExists'));
    return;
  }

  const updated = [...whitelist.value, domain];
  await saveWhitelist(updated);
  newDomain.value = '';
};

// 删除域名
const handleRemoveDomain = async (domain: string) => {
  const updated = whitelist.value.filter(d => d !== domain);
  await saveWhitelist(updated);
};

// 重置为默认白名单
const handleResetToDefault = () => {
  Modal.confirm({
    title: t('options.whitelist.resetConfirmTitle'),
    content: t('options.whitelist.resetConfirmContent'),
    okText: t('options.common.confirm'),
    cancelText: t('options.common.cancel'),
    onOk: async () => {
      await saveWhitelist([...DEFAULT_WHITELIST]);
      Message.success(t('options.whitelist.resetSuccess'));
    },
  });
};

// 清空白名单
const handleClearWhitelist = () => {
  Modal.confirm({
    title: t('options.whitelist.clearConfirmTitle'),
    content: t('options.whitelist.clearConfirmContent'),
    okText: t('options.common.confirm'),
    cancelText: t('options.common.cancel'),
    onOk: async () => {
      await saveWhitelist([]);
      Message.success(t('options.whitelist.clearSuccess'));
    },
  });
};

// 切换全局开关
const handleToggleGlobal = async (value: string | number | boolean) => {
  const boolValue = Boolean(value);
  try {
    await browser.storage.local.set({ textUnlockEnabled: boolValue });
    globalEnabled.value = boolValue;
    Message.success(t('options.messages.settingsSaved'));
  } catch (error) {
    console.error('Failed to save settings:', error);
    Message.error(t('messages.saveSettingsFailed'));
  }
};

// 导入白名单
const handleImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (Array.isArray(data.whitelist)) {
        await saveWhitelist(data.whitelist);
        Message.success(t('options.whitelist.importSuccess'));
      } else {
        Message.error(t('options.whitelist.invalidFormat'));
      }
    } catch (error) {
      console.error('Import failed:', error);
      Message.error(t('options.whitelist.importFailed'));
    }
  };
  input.click();
};

// 导出白名单
const handleExport = () => {
  const data = {
    version: version,
    whitelist: whitelist.value,
    exportDate: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `copy-free-whitelist-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Message.success(t('options.whitelist.exportSuccess'));
};

const isWhitelistEmpty = computed(() => whitelist.value.length === 0);

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="options-page">
    <div class="header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="title">
            <icon-settings class="title-icon" />
            {{ t('options.title') }}
          </h1>
          <p class="subtitle">{{ t('options.subtitle') }}</p>
        </div>
        <div class="header-right">
          <LanguageSelector />
          <a-tag color="blue" size="large">v{{ version }}</a-tag>
        </div>
      </div>
    </div>

    <div class="content">
      <a-space direction="vertical" :size="24" fill>
        <!-- 全局设置 -->
        <a-card :title="t('options.global.title')" :bordered="false">
          <a-space direction="vertical" :size="16" fill>
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">{{ t('options.global.enableExtension') }}</div>
                <div class="setting-desc">{{ t('options.global.enableExtensionDesc') }}</div>
              </div>
              <a-switch
                v-model="globalEnabled"
                :loading="loading"
                @change="handleToggleGlobal"
              />
            </div>
          </a-space>
        </a-card>

        <!-- 白名单管理 -->
        <a-card :title="t('options.whitelist.title')" :bordered="false">
          <template #extra>
            <a-space>
              <a-button type="outline" size="small" @click="handleImport">
                <template #icon><icon-upload /></template>
                {{ t('options.whitelist.import') }}
              </a-button>
              <a-button type="outline" size="small" @click="handleExport">
                <template #icon><icon-download /></template>
                {{ t('options.whitelist.export') }}
              </a-button>
              <a-button type="outline" size="small" status="warning" @click="handleResetToDefault">
                <template #icon><icon-refresh /></template>
                {{ t('options.whitelist.resetToDefault') }}
              </a-button>
              <a-button
                type="outline"
                size="small"
                status="danger"
                @click="handleClearWhitelist"
              >
                <template #icon><icon-delete /></template>
                {{ t('options.whitelist.clear') }}
              </a-button>
            </a-space>
          </template>

          <a-space direction="vertical" :size="16" fill>
            <a-alert type="info">
              {{ isWhitelistEmpty ? t('options.whitelist.emptyHint') : t('options.whitelist.hint') }}
            </a-alert>

            <!-- 添加域名 -->
            <div class="add-domain-section">
              <a-input-group>
                <a-input
                  v-model="newDomain"
                  :placeholder="t('options.whitelist.domainPlaceholder')"
                  allow-clear
                  @press-enter="handleAddDomain"
                >
                  <template #prefix>
                    <icon-globe />
                  </template>
                </a-input>
                <a-button type="primary" @click="handleAddDomain">
                  <template #icon><icon-plus /></template>
                  {{ t('options.whitelist.add') }}
                </a-button>
              </a-input-group>
            </div>

            <!-- 白名单列表 -->
            <div v-if="loading" class="loading-container">
              <a-spin :size="32" />
            </div>
            <div v-else-if="whitelist.length === 0" class="empty-state">
              <icon-empty :size="64" />
              <p class="empty-text">{{ t('options.whitelist.noItems') }}</p>
              <a-button type="primary" @click="handleResetToDefault">
                {{ t('options.whitelist.loadDefaults') }}
              </a-button>
            </div>
            <a-list v-else class="whitelist-list">
              <a-list-item v-for="domain in whitelist" :key="domain">
                <a-list-item-meta>
                  <template #avatar>
                    <a-avatar>
                      <icon-check-circle />
                    </a-avatar>
                  </template>
                  <template #title>
                    <span class="domain-name">{{ domain }}</span>
                  </template>
                </a-list-item-meta>
                <template #actions>
                  <a-popconfirm
                    :content="t('options.whitelist.removeConfirm')"
                    :ok-text="t('options.common.confirm')"
                    :cancel-text="t('options.common.cancel')"
                    @ok="handleRemoveDomain(domain)"
                  >
                    <a-button type="text" status="danger" size="small">
                      <template #icon><icon-delete /></template>
                      {{ t('options.whitelist.remove') }}
                    </a-button>
                  </a-popconfirm>
                </template>
              </a-list-item>
            </a-list>

            <!-- 统计信息 -->
            <div class="stats">
              <a-statistic
                :title="t('options.whitelist.totalCount')"
                :value="whitelist.length"
              >
                <template #prefix>
                  <icon-list />
                </template>
              </a-statistic>
            </div>
          </a-space>
        </a-card>

        <!-- 默认白名单预览 -->
        <a-card :title="t('options.defaultWhitelist.title')" :bordered="false">
          <a-space direction="vertical" :size="8" fill>
            <div class="default-whitelist-info">
              {{ t('options.defaultWhitelist.description') }}
            </div>
            <a-collapse :default-active-key="[]">
              <a-collapse-item :header="t('options.defaultWhitelist.viewList')" key="1">
                <div class="default-list">
                  <a-tag
                    v-for="domain in DEFAULT_WHITELIST"
                    :key="domain"
                    color="arcoblue"
                    class="domain-tag"
                  >
                    {{ domain }}
                  </a-tag>
                </div>
              </a-collapse-item>
            </a-collapse>
          </a-space>
        </a-card>
      </a-space>
    </div>
  </div>
</template>

<style scoped>
.options-page {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px 0;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  color: #1d2129;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
  color: #667eea;
}

.subtitle {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #86909c;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.content :deep(.arco-card) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 16px;
  font-weight: 500;
  color: #1d2129;
  margin-bottom: 4px;
}

.setting-desc {
  font-size: 14px;
  color: #86909c;
}

.add-domain-section {
  margin: 16px 0;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: #86909c;
}

.empty-text {
  margin: 16px 0 24px 0;
  font-size: 16px;
}

.whitelist-list {
  max-height: 500px;
  overflow-y: auto;
}

.domain-name {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  color: #1d2129;
}

.stats {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px solid var(--color-border-2);
}

.default-whitelist-info {
  font-size: 14px;
  color: #4e5969;
  line-height: 1.6;
}

.default-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.domain-tag {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>

