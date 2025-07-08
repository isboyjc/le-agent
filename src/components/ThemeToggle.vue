<template>
  <div class="theme-toggle">
    <Button shape="circle" @click="toggleTheme" :class="[
      'flex items-center justify-center w-10 h-10 text-[16px] rounded-4! transition-all duration-200'
    ]" :title="currentMode.label">
      <icon-solar-sun-fog-bold v-if="systemStore.themeMode === 'light'" class="" />
      <icon-solar-moon-fog-bold v-else-if="systemStore.themeMode === 'dark'" class="" />
      <icon-solar-monitor-smartphone-bold v-else class="" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Button } from 'ant-design-vue'
import { useSystemStore } from '../stores'

// 定义主题模式
interface ThemeMode {
  value: 'light' | 'dark' | 'auto'
  label: string
  icon: string
}

const modes: ThemeMode[] = [
  {
    value: 'light',
    label: '亮色',
    icon: 'icon-solar-sun-fog-bold'
  },
  {
    value: 'dark',
    label: '暗色',
    icon: 'icon-solar-moon-fog-bold'
  },
  {
    value: 'auto',
    label: '跟随系统',
    icon: 'icon-solar-monitor-smartphone-bold'
  }
]

// 使用系统 store
const systemStore = useSystemStore()

// 获取当前模式的配置
const currentMode = computed(() => {
  const mode = modes.find(mode => mode.value === systemStore.themeMode) || modes[0]
  return mode
})

// 切换主题
const toggleTheme = () => {
  systemStore.toggleTheme()
}
</script>

<style scoped lang="scss">
.theme-toggle {

  // 可以添加自定义样式
  .transition-all {
    transition: all 0.2s ease;
  }
}
</style>
