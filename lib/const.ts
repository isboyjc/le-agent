export const IS_DEV = process.env.NODE_ENV !== 'production'
export const IS_BROWSER = typeof window !== 'undefined'

// 是否只允许远程 MCP 服务器
export const IS_MCP_SERVER_REMOTE_ONLY = true
export const COOKIE_KEY_SIDEBAR_STATE = 'sidebar:state'
export const COOKIE_KEY_LOCALE = 'i18n:locale'

export const SYSTEM_NAME = '小乐'

export const SUPPORTED_LOCALES = [
  {
    code: 'en',
    name: 'English 🇺🇸'
  },
  {
    code: 'zh',
    name: 'Chinese 🇨🇳'
  }
]
