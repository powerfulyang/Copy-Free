<template>
  <div class="module-settings">
    <div class="settings-title">{{ t('popup.modules.title') }}</div>
    <div class="settings-list">
      <div
        v-for="module in modules"
        :key="module.key"
        class="settings-item"
      >
        <div class="setting-info">
          <component :is="module.icon" :style="{ fontSize: '16px', color: '#4e5969' }" />
          <div class="setting-text">
            <div class="setting-name">{{ t(module.name) }}</div>
            <div class="setting-desc">{{ t(module.desc) }}</div>
          </div>
        </div>
        <a-switch
          :model-value="moduleStates[module.key]"
          size="small"
          @change="(value) => handleToggle(module.key, value)"
        />
      </div>
      <div v-if="currentUrl" class="settings-item whitelist-item">
        <div class="setting-info">
          <icon-bookmark :style="{ fontSize: '16px', color: isWhitelisted ? '#00b42a' : '#4e5969' }" />
          <div class="setting-text">
            <div class="setting-name">{{ t('popup.whitelist.currentSite') }}</div>
            <div class="setting-desc">
              {{ currentUrl }}
            </div>
          </div>
        </div>
        <a-button size="mini" type="outline" @click="emit('toggle-whitelist')">
          <template #icon>
            <icon-plus v-if="!isWhitelisted" />
            <icon-minus v-else />
          </template>
          {{ isWhitelisted ? t('popup.whitelist.remove') : t('popup.whitelist.add') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  IconLink,
  IconExpand,
  IconImageClose,
  IconCopy,
  IconBookmark,
  IconPlus,
  IconMinus,
} from '@arco-design/web-vue/es/icon';
import { i18n } from '#i18n';

const { t } = i18n;

const props = defineProps<{
  whitelist?: string[];
  currentUrl?: string;
  isWhitelisted?: boolean;
}>();

const emit = defineEmits<{
  'toggle-whitelist': [];
}>();

const currentUrl = computed(() => props.currentUrl ?? '');
const isWhitelisted = computed(() => Boolean(props.isWhitelisted));

interface ModuleConfig {
  key: string;
  name: string;
  desc: string;
  icon: any;
}

const modules: ModuleConfig[] = [
  {
    key: 'enableCopyUnlock',
    name: 'popup.modules.copyUnlock.name',
    desc: 'popup.modules.copyUnlock.desc',
    icon: IconCopy,
  },
  {
    key: 'enableLinkRedirect',
    name: 'popup.modules.linkRedirect.name',
    desc: 'popup.modules.linkRedirect.desc',
    icon: IconLink,
  },
  {
    key: 'enableAutoExpand',
    name: 'popup.modules.autoExpand.name',
    desc: 'popup.modules.autoExpand.desc',
    icon: IconExpand,
  },
  {
    key: 'enableWatermarkRemoval',
    name: 'popup.modules.watermarkRemoval.name',
    desc: 'popup.modules.watermarkRemoval.desc',
    icon: IconImageClose,
  },
];

const moduleStates = ref<Record<string, boolean>>({
  enableCopyUnlock: true,
  enableLinkRedirect: true,
  enableAutoExpand: true,
  enableWatermarkRemoval: true,
});

onMounted(async () => {
  try {
    const result = await browser.storage.local.get([
      'enableCopyUnlock',
      'enableLinkRedirect',
      'enableAutoExpand',
      'enableWatermarkRemoval',
    ]);

    moduleStates.value = {
      enableCopyUnlock: result.enableCopyUnlock !== false,
      enableLinkRedirect: result.enableLinkRedirect !== false,
      enableAutoExpand: result.enableAutoExpand !== false,
      enableWatermarkRemoval: result.enableWatermarkRemoval !== false,
    };
  } catch (error) {
    console.error('读取模块配置失败:', error);
  }
});

const handleToggle = async (key: string, value: boolean | string | number) => {
  const boolValue = Boolean(value);
  moduleStates.value[key] = boolValue;

  try {
    await browser.storage.local.set({ [key]: boolValue });

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      browser.tabs.sendMessage(tabs[0].id, {
        action: 'updateConfig',
        config: { [key]: boolValue },
      }).catch(() => {
        // ignore
      });

      browser.tabs.reload(tabs[0].id);
    }
  } catch (error) {
    console.error('保存模块配置失败:', error);
    moduleStates.value[key] = !boolValue;
  }
};
</script>

<style scoped>
.module-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.whitelist-item {
  border-top: 1px solid #f2f3f5;
  padding-top: 12px;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.setting-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.setting-name {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
}

.setting-desc {
  font-size: 12px;
  color: #86909c;
  line-height: 1.4;
}
</style>

