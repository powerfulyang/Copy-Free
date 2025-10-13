<template>
  <div class="features-section">
    <div class="feature-title">{{ t('popup.features.title') }}</div>
    <div class="feature-list">
      <div 
        v-for="(feature, index) in features" 
        :key="index" 
        class="feature-item"
      >
        <icon-check-circle :style="{ color: '#00b42a' }" />
        <span>{{ t(feature) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconCheckCircle } from '@arco-design/web-vue/es/icon';
import { i18n } from '#i18n';

const { t } = i18n;

const features = [
  'popup.features.selectText',
  'popup.features.copyPaste',
  'popup.features.contextMenu',
  'popup.features.smartMonitor',
];
</script>

<style scoped>
.features-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #4e5969;
}
</style>

