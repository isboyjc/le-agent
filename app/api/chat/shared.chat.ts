import { MANUAL_REJECT_RESPONSE_PROMPT } from '@/lib/ai/prompts'
import logger from '@/lib/logger'
import { errorToString, objectFlow, toAny } from '@/lib/utils'
import {
  ChatMention,
  ChatMessage,
  ChatMessageAnnotation,
  ClientToolInvocationZodSchema,
  ToolInvocationUIPart
} from '@/types/chat'
import { AllowedMCPServer, VercelAIMcpTool } from '@/types/mcp'
import {
  tool as createTool,
  LoadAPIKeyError,
  Message,
  Tool,
  ToolInvocation
} from 'ai'
import { safe } from 'ts-safe'
import { callMcpToolAction } from '../mcp/actions'

// 提取正在进行的工具调用
export function extractInProgressToolPart(
  messages: Message[]
): ToolInvocationUIPart | null {
  let result: ToolInvocationUIPart | null = null

  for (const message of messages) {
    for (const part of message.parts || []) {
      if (part.type != 'tool-invocation') continue
      if (part.toolInvocation.state == 'result') continue
      result = part as ToolInvocationUIPart
      return result
    }
  }
  return null
}

/**
 * 将 ChatMessage 转换为 Message
 * @param message
 * @returns
 */
export function convertToMessage(message: ChatMessage): Message {
  return {
    ...message,
    id: message.id,
    content: '',
    role: message.role,
    parts: message.parts,
    experimental_attachments:
      toAny(message).attachments || toAny(message).experimental_attachments
  }
}

export function filterMCPToolsByMentions(
  tools: Record<string, VercelAIMcpTool>,
  mentions: ChatMention[]
) {
  if (mentions.length === 0) {
    return tools
  }
  const toolMentions = mentions.filter(
    mention => mention.type == 'mcpTool' || mention.type == 'mcpServer'
  )

  const metionsByServer = toolMentions.reduce(
    (acc, mention) => {
      if (mention.type == 'mcpServer') {
        return {
          ...acc,
          [mention.serverId]: Object.values(tools).map(
            tool => tool._originToolName
          )
        }
      }
      return {
        ...acc,
        [mention.serverId]: [...(acc[mention.serverId] ?? []), mention.name]
      }
    },
    {} as Record<string, string[]>
  ) // {serverId: [toolName1, toolName2]}

  return objectFlow(tools).filter(_tool => {
    if (!metionsByServer[_tool._mcpServerId]) return false
    return metionsByServer[_tool._mcpServerId].includes(_tool._originToolName)
  })
}

export function filterMCPToolsByAllowedMCPServers(
  tools: Record<string, VercelAIMcpTool>,
  allowedMcpServers?: Record<string, AllowedMCPServer>
): Record<string, VercelAIMcpTool> {
  if (!allowedMcpServers) {
    return tools
  }
  return objectFlow(tools).filter(_tool => {
    if (!allowedMcpServers[_tool._mcpServerId]?.tools) return true
    return allowedMcpServers[_tool._mcpServerId].tools.includes(
      _tool._originToolName
    )
  })
}

export function manualToolExecuteByLastMessage(
  part: ToolInvocationUIPart,
  message: Message,
  tools: Record<string, VercelAIMcpTool | (Tool & { __$ref__?: string })>,
  abortSignal?: AbortSignal
) {
  const { args, toolName } = part.toolInvocation

  const manulConfirmation = (message.parts as ToolInvocationUIPart[]).find(
    _part => {
      return _part.toolInvocation?.toolCallId == part.toolInvocation.toolCallId
    }
  )?.toolInvocation as Extract<ToolInvocation, { state: 'result' }>

  const tool = tools[toolName]

  if (!manulConfirmation?.result) return MANUAL_REJECT_RESPONSE_PROMPT
  return safe(() => {
    if (!tool) throw new Error(`tool not found: ${toolName}`)
    return ClientToolInvocationZodSchema.parse(manulConfirmation?.result)
  })
    .map(result => {
      const value = result?.result

      if (result.action == 'direct') {
        return value
      } else if (result.action == 'manual') {
        if (!value) return MANUAL_REJECT_RESPONSE_PROMPT
        if (tool.__$ref__ === 'workflow') {
          return tool.execute!(args, {
            toolCallId: part.toolInvocation.toolCallId,
            abortSignal: abortSignal ?? new AbortController().signal,
            messages: []
          })
        } else if (tool.__$ref__ === 'mcp') {
          const mcpTool = tool as VercelAIMcpTool
          return callMcpToolAction(
            mcpTool._mcpServerId,
            mcpTool._originToolName,
            args
          )
        }
        return tool.execute!(args, {
          toolCallId: part.toolInvocation.toolCallId,
          abortSignal: abortSignal ?? new AbortController().signal,
          messages: []
        })
      }
      throw new Error('Invalid Client Tool Invocation Action ' + result.action)
    })
    .ifFail(error => ({
      isError: true,
      statusMessage: `tool call fail: ${toolName}`,
      error: errorToString(error)
    }))
    .unwrap()
}

export function assignToolResult(toolPart: ToolInvocationUIPart, result: any) {
  return Object.assign(toolPart, {
    toolInvocation: {
      ...toolPart.toolInvocation,
      state: 'result',
      result
    }
  })
}

export function appendAnnotations(
  annotations: any[] = [],
  annotationsToAppend: ChatMessageAnnotation[] | ChatMessageAnnotation
): ChatMessageAnnotation[] {
  const newAnnotations = Array.isArray(annotationsToAppend)
    ? annotationsToAppend
    : [annotationsToAppend]
  return [...annotations, ...newAnnotations]
}

export function mergeSystemPrompt(...prompts: (string | undefined)[]): string {
  const filteredPrompts = prompts.map(prompt => prompt?.trim()).filter(Boolean)
  return filteredPrompts.join('\n\n')
}

export function excludeToolExecution(
  tool: Record<string, Tool>
): Record<string, Tool> {
  return objectFlow(tool).map(value => {
    return createTool({
      parameters: value.parameters,
      description: value.description
    })
  })
}

export function handleError(error: any) {
  if (LoadAPIKeyError.isInstance(error)) {
    return error.message
  }

  logger.error(error)
  logger.error(error.name)
  return errorToString(error.message)
}
