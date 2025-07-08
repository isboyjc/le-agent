<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useSystemStore } from './stores'

// 使用系统 store
const systemStore = useSystemStore()

// 初始化主题
onMounted(() => {
  systemStore.initTheme()
  systemStore.startThemeWatcher()
})
</script>

<template>
  <a-config-provider :theme="systemStore.antdTheme">
    <RouterView />
  </a-config-provider>
</template>

<style scoped></style>
