<template>
  <div class="info-section">
    <div class="info-item">
      <span class="info-label">{{ t('popup.info.currentSite') }}</span>
      <span class="info-value">{{ currentUrl || t('popup.info.unknown') }}</span>
    </div>
    <div class="info-item">
      <span class="info-label">{{ t('popup.info.version') }}</span>
      <span class="info-value">v{{ version }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { i18n } from '#i18n';

const { t } = i18n;

defineProps<{
  currentUrl: string;
  version?: string;
}>();
</script>

<style scoped>
.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.info-label {
  color: #86909c;
}

.info-value {
  color: #1d2129;
  font-weight: 500;
}
</style>

