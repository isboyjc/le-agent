import { mcpClientsManager } from '@/lib/ai/mcp/mcp-manager'
import {
  customModelProvider,
  isToolCallUnsupportedModel
} from '@/lib/ai/models'
import {
  buildUserSystemPrompt,
  mentionPrompt,
  studySystemPrompt,
  systemPrompt as systemPromptBase
} from '@/lib/ai/prompts'
import {
  chatApiSchemaRequestBodySchema,
  ChatMention,
  ChatMessageAnnotation
} from '@/types/chat'
import { Language } from '@/types/system'
import {
  appendClientMessage,
  appendResponseMessages,
  createDataStreamResponse,
  formatDataStreamPart,
  Message,
  smoothStream,
  streamText
} from 'ai'
import {
  appendAnnotations,
  assignToolResult,
  convertToMessage,
  excludeToolExecution,
  extractInProgressToolPart,
  filterMCPToolsByAllowedMCPServers,
  filterMCPToolsByMentions,
  handleError,
  manualToolExecuteByLastMessage,
  mergeSystemPrompt
} from './shared.chat'

import logger from '@/lib/logger'
import { errorIf, safe } from 'ts-safe'

export async function POST(request: Request) {
  try {
    const json = await request.json()

    const { id, message, chatModel, toolChoice, allowedMcpServers } =
      chatApiSchemaRequestBodySchema.parse(json)

    const model = customModelProvider.getModel(chatModel)

    // let thread = await chatRepository.selectThreadDetails(id)
    let thread = {
      id: id,
      messages: [],
      userPreferences: {
        whyStudy: 'language learning',
        currentLanguage: 'en' as Language,
        targetLanguage: 'zh' as Language
      }
    }

    // if is false, it means the last message is manual tool execution
    const isLastMessageUserMessage = message.role == 'user'

    const previousMessages = (thread?.messages ?? []).map(convertToMessage)

    const messages: Message[] = isLastMessageUserMessage
      ? appendClientMessage({
          messages: previousMessages,
          message
        })
      : previousMessages

    const userMessage = messages.slice(-2).findLast(m => m.role == 'user')

    console.log('userMessage', messages, userMessage)
    const mentions =
      ((userMessage?.annotations as ChatMessageAnnotation[])
        ?.flatMap(annotation => annotation.mentions)
        ?.filter(Boolean) as ChatMention[]) || []

    const inProgressToolStep = extractInProgressToolPart(messages.slice(-2))

    const isToolCallAllowed =
      (!isToolCallUnsupportedModel(model) && toolChoice != 'none') ||
      mentions.length > 0

    return createDataStreamResponse({
      execute: async dataStream => {
        console.log('execute', dataStream)
        const MCP_TOOLS = safe(mcpClientsManager.tools())
          .map(errorIf(() => !isToolCallAllowed && 'Not allowed'))
          .map(tools => {
            // filter tools by mentions
            if (mentions.length) {
              return filterMCPToolsByMentions(tools, mentions)
            }
            // filter tools by allowed mcp servers
            return filterMCPToolsByAllowedMCPServers(tools, allowedMcpServers)
          })
          .orElse({})

        if (inProgressToolStep) {
          const toolResult = await manualToolExecuteByLastMessage(
            inProgressToolStep,
            message,
            { ...MCP_TOOLS },
            request.signal
          )
          assignToolResult(inProgressToolStep, toolResult)
          dataStream.write(
            formatDataStreamPart('tool_result', {
              toolCallId: inProgressToolStep.toolInvocation.toolCallId,
              result: toolResult
            })
          )
        }

        // const userPreferences = thread?.userPreferences || undefined

        const systemPrompt = mergeSystemPrompt(
          systemPromptBase,
          studySystemPrompt,
          buildUserSystemPrompt(thread.userPreferences),
          mentions.length ? mentionPrompt : undefined
        )

        const vercelAITooles = safe({ ...MCP_TOOLS })
          .map(t => {
            const bindingTools =
              toolChoice === 'manual' ? excludeToolExecution(t) : t
            return {
              ...bindingTools
            }
          })
          .unwrap()

        logger.debug(`tool mode: ${toolChoice}, mentions: ${mentions.length}`)
        logger.debug(`model: ${chatModel?.provider}/${chatModel?.model}`)

        console.log('messages', messages)
        const result = streamText({
          model,
          system: systemPrompt,
          messages,
          maxSteps: 30,
          toolCallStreaming: true,
          experimental_transform: smoothStream({ chunking: 'word' }),
          maxRetries: 1,
          tools: vercelAITooles,
          toolChoice: 'auto',
          abortSignal: request.signal,
          onFinish: async ({ response, usage }) => {
            console.log('response', response)
            const appendMessages = appendResponseMessages({
              messages: messages.slice(-1),
              responseMessages: response.messages
            })
            const assistantMessage = appendMessages.at(-1)
            if (assistantMessage) {
              const annotations = appendAnnotations(
                assistantMessage.annotations,
                {
                  usageTokens: usage.completionTokens,
                  toolChoice
                }
              )
              dataStream.writeMessageAnnotation(annotations.at(-1)!)
            }
          }
        })
        result.consumeStream()
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true
        })
        result.usage.then(useage => {
          logger.debug(
            `usage input: ${useage.promptTokens}, usage output: ${useage.completionTokens}, usage total: ${useage.totalTokens}`
          )
        })
      },
      onError: handleError
    })
  } catch (error: any) {
    logger.error(error)
    return new Response(error.message, { status: 500 })
  }
}
