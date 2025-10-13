<template>
  <div class="status-section">
    <div class="status-info">
      <div class="status-label">{{ t('popup.status.label') }}</div>
      <a-tag v-if="enabled" color="green" size="large">
        <template #icon>
          <icon-check-circle />
        </template>
        {{ t('popup.status.enabled') }}
      </a-tag>
      <a-tag v-else color="red" size="large">
        <template #icon>
          <icon-close-circle />
        </template>
        {{ t('popup.status.disabled') }}
      </a-tag>
    </div>
    
    <a-switch 
      :model-value="enabled" 
      :loading="loading"
      @change="handleChange"
    >
      <template #checked>{{ t('popup.status.switchOn') }}</template>
      <template #unchecked>{{ t('popup.status.switchOff') }}</template>
    </a-switch>
  </div>
</template>

<script setup lang="ts">
import { IconCheckCircle, IconCloseCircle } from '@arco-design/web-vue/es/icon';
import { i18n } from '#i18n';

const { t } = i18n;

const props = defineProps<{
  enabled: boolean;
  loading: boolean;
}>();

const emit = defineEmits<{
  change: [value: boolean];
}>();

const handleChange = (value: string | number | boolean) => {
  emit('change', Boolean(value));
};
</script>

<style scoped>
.status-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-label {
  font-size: 14px;
  color: #86909c;
  font-weight: 500;
}
</style>

