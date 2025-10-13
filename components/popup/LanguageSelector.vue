<template>
  <div class="language-selector">
    <a-tag size="small" :style="{ fontSize: '12px' }">
      <template #icon>
        <span class="flag">{{ currentFlag }}</span>
      </template>
      {{ currentLanguage }}
    </a-tag>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

const currentLocale = ref('');

const localeMap: Record<string, { flag: string; name: string }> = {
  'zh-CN': { flag: '🇨🇳', name: '简体中文' },
  'zh_CN': { flag: '🇨🇳', name: '简体中文' },
  'en': { flag: '🇺🇸', name: 'English' },
  'en-US': { flag: '🇺🇸', name: 'English' },
  'en_US': { flag: '🇺🇸', name: 'English' },
};

const currentFlag = computed(() => {
  return localeMap[currentLocale.value]?.flag || '🌐';
});

const currentLanguage = computed(() => {
  return localeMap[currentLocale.value]?.name || currentLocale.value;
});

onMounted(() => {
  // Get the browser's UI language
  currentLocale.value = browser.i18n.getUILanguage();
});
</script>

<style scoped>
.language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.flag {
  font-size: 16px;
}
</style>

