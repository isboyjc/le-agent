import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { theme } from 'ant-design-vue'

export type ThemeMode = 'light' | 'dark' | 'auto'

const useSystemStore = defineStore(
  'system',
  () => {
    // 用户选择的主题模式（3种状态）
    const themeMode = ref<ThemeMode>('auto')

    // 检测系统偏好
    const prefersDark = usePreferredDark()

    // 实际应用的主题（只有 light 和 dark）
    const actualTheme = computed(() => {
      if (themeMode.value === 'auto') {
        return prefersDark.value ? 'dark' : 'light'
      }
      return themeMode.value
    })

    // Ant Design Vue 主题配置
    const antdTheme = computed(() => {
      return {
        algorithm:
          actualTheme.value === 'dark'
            ? theme.darkAlgorithm
            : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1b73e8' // 使用项目主色
        }
      }
    })

    // 应用主题到 HTML 元素
    const applyTheme = (themeValue: 'light' | 'dark') => {
      const html = document.documentElement
      if (themeValue === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }

    // 切换到下一个主题模式
    const toggleTheme = () => {
      const modes: ThemeMode[] = ['light', 'dark', 'auto']
      const currentIndex = modes.indexOf(themeMode.value)
      const nextIndex = (currentIndex + 1) % modes.length
      setThemeMode(modes[nextIndex])
    }

    // 设置主题模式
    const setThemeMode = (mode: ThemeMode) => {
      themeMode.value = mode
    }

    // 初始化主题
    const initTheme = () => {
      // 应用初始主题
      applyTheme(actualTheme.value)
    }

    // 监听实际主题变化
    const startThemeWatcher = () => {
      import('vue').then(({ watchEffect }) => {
        watchEffect(() => {
          applyTheme(actualTheme.value)
        })
      })
    }

    return {
      // 主题相关状态
      themeMode,
      actualTheme,
      antdTheme,

      // 主题相关方法
      toggleTheme,
      setThemeMode,
      initTheme,
      startThemeWatcher
    }
  },
  {
    persist: {
      key: 'system-store',
      storage: localStorage
    }
  }
)

export default useSystemStore
