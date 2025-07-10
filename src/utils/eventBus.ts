import { createEventHook } from '@vueuse/core'

// 投票事件
export const voteEvent = createEventHook<{
  messageId: string
  voteType: 'up' | 'down'
}>()

// 复制到输入框事件
export const copyToInputEvent = createEventHook<{
  content: string
}>()
