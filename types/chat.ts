import type { Message, UIMessage } from 'ai'
import { z } from 'zod'
import { AllowedMCPServerZodSchema } from './mcp'

export type ChatModel = {
  provider: string
  model: string
}

export type ChatThread = {
  id: string
  title: string
  createdAt: Date
}

export type ChatMessage = {
  id: string
  threadId: string
  role: UIMessage['role']
  parts: UIMessage['parts']
  annotations?: ChatMessageAnnotation[]
  attachments?: unknown[]
  model: string | null
  createdAt: Date
}

export const ChatMentionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('mcpTool'),
    name: z.string(),
    description: z.string().optional(),
    serverName: z.string().optional(),
    serverId: z.string()
  }),
  z.object({
    type: z.literal('defaultTool'),
    name: z.string(),
    label: z.string(),
    description: z.string().optional()
  }),
  z.object({
    type: z.literal('mcpServer'),
    name: z.string(),
    description: z.string().optional(),
    toolCount: z.number().optional(),
    serverId: z.string()
  })
])

/**
 * 聊天提及
 */
export type ChatMention = z.infer<typeof ChatMentionSchema>

/**
 * 聊天消息注解
 */
export type ChatMessageAnnotation = {
  mentions?: ChatMention[]
  usageTokens?: number
  toolChoice?: 'auto' | 'none' | 'manual'
  [key: string]: any
}

/**
 * 聊天 API 请求体
 */
export const chatApiSchemaRequestBodySchema = z.object({
  id: z.string().optional(),
  message: z.any() as z.ZodType<UIMessage>,
  chatModel: z
    .object({
      provider: z.string(),
      model: z.string()
    })
    .optional(),
  toolChoice: z.enum(['auto', 'none', 'manual']),
  allowedMcpServers: z.record(z.string(), AllowedMCPServerZodSchema).optional()
})

/**
 * 聊天 API 请求体
 */
export type ChatApiSchemaRequestBody = z.infer<
  typeof chatApiSchemaRequestBodySchema
>

/**
 * 工具调用 UI 部分
 */
export type ToolInvocationUIPart = Extract<
  Exclude<Message['parts'], undefined>[number],
  { type: 'tool-invocation' }
>

export const ClientToolInvocationZodSchema = z.object({
  action: z.enum(['manual', 'direct']),
  result: z.any().optional()
})

export type ClientToolInvocation = z.infer<typeof ClientToolInvocationZodSchema>
