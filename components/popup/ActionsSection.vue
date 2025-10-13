<template>
  <div class="actions">
    <a-button type="primary" long @click="$emit('refresh')">
      <template #icon>
        <icon-refresh />
      </template>
      {{ t('popup.actions.refresh') }}
    </a-button>
  </div>
</template>

<script setup lang="ts">
import { IconRefresh } from '@arco-design/web-vue/es/icon';
import { i18n } from '#i18n';

const { t } = i18n;

defineEmits<{
  refresh: [];
}>();
</script>

<style scoped>
.actions {
  padding-top: 4px;
}
</style>

