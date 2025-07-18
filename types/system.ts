// 语言代码
export type Language = 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'ru'

// 语言水平 第一次学习、知道一些常用词汇、能进行基础对话、可以谈论各种话题、可以深入讨论大多数话题
export type LanguageLevel = 1 | 2 | 3 | 4 | 5

export type UserPreferences = {
  name?: string // 用户名
  whyStudy?: string // 用户为什么需要学习语言
  currentLanguage?: Language // 用户当前语言
  targetLanguage?: Language // 用户目标语言
  currentLanguageLevel?: LanguageLevel // 用户当前语言水平
}
