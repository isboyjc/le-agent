import type { Language } from './system'

// 词组类型
export interface WordPair {
  word: string
  translations: string[]
}

// 句组类型
export interface SentenceGroup {
  sentence: string
  translation: string
  words: WordPair[]
}

// 文章类型
export interface Article {
  content: string
  translation: string
  sentence_groups: SentenceGroup[]
}

// 支持类型枚举（可扩展）
export type ContentType = 'article'

// 顶层结构
export interface BilingualContent {
  target_language: Language // 例如 "zh"
  user_language: Language // 例如 "en"
  type: ContentType // 默认为 "article"
  article: Article
}
