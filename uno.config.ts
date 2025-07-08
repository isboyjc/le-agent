import {
  defineConfig,
  presetAttributify,
  transformerVariantGroup,
  transformerDirectives,
  transformerAttributifyJsx
} from 'unocss'
import presetWind4 from '@unocss/preset-wind4'

export default defineConfig({
  theme: {
    colors: {
      // 基础颜色
      background: 'var(--le-background)',
      foreground: 'var(--le-foreground)',
      card: 'var(--le-card)',
      'card-foreground': 'var(--le-card-foreground)',
      border: 'var(--le-border)',
      input: 'var(--le-input)',
      'input-disabled': 'var(--le-input-disabled)',
      ring: 'var(--le-ring)',

      // 主色系
      primary: {
        DEFAULT: 'var(--le-primary)',
        0: 'var(--le-primary-0)',
        1: 'var(--le-primary-1)',
        2: 'var(--le-primary-2)',
        3: 'var(--le-primary-3)'
      },

      // 中性色系 - 文本
      text: {
        primary: 'var(--le-text-primary)',
        secondary: 'var(--le-text-secondary)',
        tertiary: 'var(--le-text-tertiary)',
        quaternary: 'var(--le-text-quaternary)'
      },

      // 辅助色
      secondary: 'var(--le-secondary)',

      // 点缀色系
      accent: {
        1: 'var(--le-accent-1)',
        2: 'var(--le-accent-2)'
      },

      // 状态色系 - 成功
      success: {
        1: 'var(--le-success-1)',
        2: 'var(--le-success-2)',
        3: 'var(--le-success-3)'
      },

      // 状态色系 - 警告
      warning: {
        1: 'var(--le-warning-1)',
        2: 'var(--le-warning-2)',
        3: 'var(--le-warning-3)'
      },

      // 状态色系 - 错误/危险
      destructive: {
        1: 'var(--le-destructive-1)',
        2: 'var(--le-destructive-2)',
        3: 'var(--le-destructive-3)'
      }
    },
    borderRadius: {
      radius: 'var(--radius)'
    },
    backgroundImage: {
      'accent-gradient': 'var(--le-accent-gradient)'
    }
  },
  presets: [
    presetWind4({
      dark: 'class',
      reset: true
    }),
    presetAttributify({
      prefix: 'uno-',
      prefixedOnly: true
    })
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
    transformerAttributifyJsx()
  ]
})
