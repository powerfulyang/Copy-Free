<template>
  <div v-if="isEnabled">
    <div v-if="showBadge" class="text-unlock-badge">
      <a-tag color="green" size="small" @click="toggleBadge">
        <template #icon>
          <icon-check-circle />
        </template>
        {{ t('badge.unlocked') }}
      </a-tag>
    </div>
    <div v-else class="text-unlock-mini" @click="toggleBadge" :title="t('badge.clickToShow')">
      <icon-check-circle :style="{ color: '#00b42a', fontSize: '18px' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { IconCheckCircle } from '@arco-design/web-vue/es/icon';
import { i18n } from '#i18n';

const { t } = i18n;

const showBadge = ref(true);
const isEnabled = ref(true);
const storageListener = (changes: Record<string, Browser.storage.StorageChange>, areaName: string) => {
  if (areaName !== 'local') {
    return;
  }

  if (changes.textUnlockEnabled || changes.whitelist) {
    void refreshState();
  }
};

// 检查扩展是否启用
onMounted(async () => {
  await refreshState();
  browser.storage.onChanged.addListener(storageListener);
});

onUnmounted(() => {
  browser.storage.onChanged.removeListener(storageListener);
});

const toggleBadge = () => {
  showBadge.value = !showBadge.value;
};

async function refreshState() {
  const result = await browser.storage.local.get(['textUnlockEnabled', 'whitelist']);
  const whitelist: string[] = Array.isArray(result.whitelist) ? result.whitelist : [];
  const hostname = window.location.hostname;
  const allowAll = whitelist.length === 0;
  const isWhitelisted = allowAll || whitelist.includes(hostname);
  const newValue = result.textUnlockEnabled !== false && isWhitelisted;

  console.log('[Badge] 状态变化:', isEnabled.value, '->', newValue);
  isEnabled.value = newValue;

  if (newValue) {
    showBadge.value = true;
    setTimeout(() => {
      showBadge.value = false;
    }, 5000);
  }
}
</script>

<style scoped>
.text-unlock-badge {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  padding: 8px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: pointer;
}

.text-unlock-badge:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.text-unlock-mini {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 99999;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.3s ease;
}

.text-unlock-mini:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
}
</style>

