import { ref, reactive, readonly } from 'vue'
import { useMCPClient, type MCPToolResult } from './useMCPClient'

// 投票类型定义
export interface MessageVote {
  isUpvoted?: boolean
  isDownvoted?: boolean
  timestamp?: number
}

// 消息类型定义
export interface ToolCall {
  id: string
  name: string
  arguments: string
  result?: string
  isError?: boolean
  isExecuting?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string // 推理过程（如果模型有输出）
  toolCalls?: ToolCall[] // 工具调用信息
  timestamp: number
  vote?: MessageVote // 用户对消息的投票态度
}

// 模型信息类型
export interface ModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
  isReasoning?: boolean // 是否为推理模型
}

// API返回的原始模型数据类型
interface APIModelData {
  id: string
  object: string
  created: number
  owned_by: string
}

// 预设模型配置（仅包含模型ID和推理标识）
const PRESET_MODEL_CONFIG: Record<string, { isReasoning: boolean }> = {
  // 推理模型
  'Qwen/QwQ-32B': { isReasoning: true },
  'Qwen/QwQ-32B-Preview': { isReasoning: true },
  'deepseek-ai/DeepSeek-R1-Distill-Llama-70B': { isReasoning: true },
  'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B': { isReasoning: true },
  'deepseek-ai/DeepSeek-R1-0528': { isReasoning: true },
  'Qwen/QVQ-72B-Preview': { isReasoning: true },

  // 普通文本模型
  'deepseek-ai/DeepSeek-V3': { isReasoning: true },
  'LLM-Research/c4ai-command-r-plus-08-2024': { isReasoning: false },
  'Qwen/Qwen2.5-Coder-32B-Instruct': { isReasoning: false },
  'Qwen/Qwen2.5-72B-Instruct': { isReasoning: false },
  'Qwen/Qwen2.5-14B-Instruct-1M': { isReasoning: false },
  'LLM-Research/Llama-3.3-70B-Instruct': { isReasoning: false },
  'LLM-Research/Meta-Llama-3.1-405B-Instruct': { isReasoning: false },
  'opencompass/CompassJudger-1-32B-Instruct': { isReasoning: false },
  'LLM-Research/Llama-4-Scout-17B-16E-Instruct': { isReasoning: false },
  'LLM-Research/Llama-4-Maverick-17B-128E-Instruct': { isReasoning: false },
  'Qwen/Qwen3-235B-A22B': { isReasoning: false },
  'XGenerationLab/XiYanSQL-QwenCoder-32B-2504': { isReasoning: false },
  'Menlo/Jan-nano': { isReasoning: false },
  'PaddlePaddle/ERNIE-4.5-300B-A47B-PT': { isReasoning: false },
  'MiniMax/MiniMax-M1-80k': { isReasoning: false }
}

// API配置类型
export interface AIConfig {
  baseURL: string
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

// Hook选项类型
export interface UseChatOptions {
  config?: Partial<AIConfig>
  systemPrompt?: string
  onMessage?: (message: ChatMessage) => void
  onThinking?: (thinking: string) => void // 推理过程回调
  onError?: (error: Error) => void
  onComplete?: () => void
}

// 默认配置
const DEFAULT_CONFIG: AIConfig = {
  baseURL: 'https://api-inference.modelscope.cn/v1/',
  apiKey: 'bfd6ceb1-5b7f-4e4c-b381-48aeb7a6cca7',
  model: 'Qwen/QwQ-32B',
  temperature: 0.7,
  maxTokens: 4000,
  stream: true
}

export function useChat(options: UseChatOptions = {}) {
  // 合并配置
  const config = reactive({ ...DEFAULT_CONFIG, ...options.config })

  // 状态管理
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const currentResponse = ref('')
  const currentThinking = ref('')

  // 模型列表相关状态
  const models = ref<ModelInfo[]>([])
  const isLoadingModels = ref(false)
  const modelsError = ref<string | null>(null)

  // 中断控制器
  const currentAbortController = ref<AbortController | null>(null)

  // 初始化MCP客户端
  const mcpClient = useMCPClient({
    autoConnect: true,
    onToolCall: (
      toolName: string,
      args: Record<string, unknown>,
      result: MCPToolResult
    ) => {
      console.log(`MCP工具调用: ${toolName}`, { args, result })
    },
    onError: (error: Error) => {
      console.error('MCP错误:', error)
    }
  })

  // 生成消息ID
  const generateId = () =>
    `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 获取模型列表并过滤预设模型
  const fetchModels = async (): Promise<ModelInfo[]> => {
    try {
      isLoadingModels.value = true
      modelsError.value = null

      const response = await fetch(
        `${config.baseURL.replace(/\/$/, '')}/models`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(
          `获取模型列表失败: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      const apiModels = data.data || []

      // 过滤出预设中包含且API返回的模型，并添加推理标识
      const filteredModels: ModelInfo[] = apiModels
        .filter((model: APIModelData) => PRESET_MODEL_CONFIG[model.id])
        .map((model: APIModelData) => ({
          id: model.id,
          object: model.object,
          created: model.created,
          owned_by: model.owned_by,
          isReasoning: PRESET_MODEL_CONFIG[model.id].isReasoning
        }))

      models.value = filteredModels
      return filteredModels
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '获取模型列表失败'
      modelsError.value = errorMessage
      console.error('获取模型列表错误:', err)
      return []
    } finally {
      isLoadingModels.value = false
    }
  }

  // 设置当前使用的模型
  const setModel = (modelId: string) => {
    config.model = modelId
  }

  // 判断当前模型是否为推理模型
  const isCurrentModelReasoning = (): boolean => {
    const currentModel = models.value.find(model => model.id === config.model)
    return currentModel?.isReasoning || false
  }

  // 添加系统提示词（如果有）
  if (options.systemPrompt) {
    messages.value.push({
      id: generateId(),
      role: 'system',
      content: options.systemPrompt,
      timestamp: Date.now()
    })
  }

  // 添加消息到对话历史
  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: Date.now()
    }
    messages.value.push(newMessage)
    options.onMessage?.(newMessage)
    return newMessage
  }

  // 中断当前请求
  const interrupt = () => {
    if (currentAbortController.value) {
      currentAbortController.value.abort()
      currentAbortController.value = null
      isLoading.value = false
      isStreaming.value = false
      console.log('已中断当前请求')
    }
  }

  // 发送消息
  const sendMessage = async (content: string): Promise<void> => {
    if (!content.trim() || isLoading.value) return

    // 创建新的中断控制器
    currentAbortController.value = new AbortController()

    let hasToolCalls = false

    try {
      error.value = null
      isLoading.value = true
      currentResponse.value = ''
      currentThinking.value = ''

      // 添加用户消息
      addMessage({ role: 'user', content })

      // 生成包含用户反馈的上下文
      const feedbackContext = generateFeedbackContext()

      // 准备API请求数据
      const requestMessages = messages.value
        .filter(msg => msg.role !== 'system' || options.systemPrompt) // 只包含系统消息如果有设置
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      // 如果有反馈信息，将其添加到系统消息中
      if (feedbackContext) {
        const systemMessageIndex = requestMessages.findIndex(
          msg => msg.role === 'system'
        )
        if (systemMessageIndex !== -1) {
          // 更新现有系统消息
          requestMessages[systemMessageIndex] = {
            ...requestMessages[systemMessageIndex],
            content:
              requestMessages[systemMessageIndex].content +
              '\n\n' +
              feedbackContext
          }
        } else {
          // 添加新的系统消息
          requestMessages.unshift({
            role: 'system',
            content: feedbackContext
          })
        }
      }

      const requestBody = {
        model: config.model,
        messages: requestMessages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: config.stream,
        tools:
          mcpClient.availableTools.value.length > 0
            ? mcpClient.availableTools.value
            : undefined
      }

      // 发送请求
      const response = await fetch(
        `${config.baseURL.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: currentAbortController.value.signal
        }
      )

      if (!response.ok) {
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}`
        )
      }

      if (config.stream && response.body) {
        // 检查是否有工具调用
        const streamHandler = async () => {
          const result = await handleStreamResponse(response)
          hasToolCalls = result?.hasToolCalls || false
          return result
        }
        await streamHandler()
      } else {
        await handleNormalResponse(response)
      }
    } catch (err) {
      // 检查是否是用户主动中断
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('请求已被用户中断')
        return
      }

      const errorMessage = err instanceof Error ? err.message : '未知错误'
      error.value = errorMessage
      options.onError?.(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      currentAbortController.value = null
      isLoading.value = false
      // 只有在没有工具调用的情况下才重置isStreaming
      if (!hasToolCalls) {
        isStreaming.value = false
      }
      options.onComplete?.()
    }
  }

  // 处理流式响应
  const handleStreamResponse = async (
    response: Response
  ): Promise<{ hasToolCalls: boolean }> => {
    if (!response.body) throw new Error('响应体为空')

    isStreaming.value = true
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let assistantMessage: ChatMessage | null = null
    let buffer = '' // 用于累积不完整的数据

    // 工具调用相关状态
    const pendingToolCalls = new Map<
      string,
      {
        id: string
        type: string
        function: {
          name: string
          arguments: string
        }
      }
    >()

    try {
      while (true) {
        // 检查是否被中断
        if (currentAbortController.value?.signal.aborted) {
          console.log('流式响应已被中断')
          break
        }

        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // 处理缓冲区中的完整行
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一行（可能不完整）

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6).trim()

            if (data === '[DONE]') {
              return { hasToolCalls: pendingToolCalls.size > 0 }
            }

            // 跳过空数据或注释
            if (!data || data.startsWith(':')) {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta

              // 检查是否有reasoning_content字段
              const reasoning = delta?.reasoning_content
              const content = delta?.content
              const toolCalls = delta?.tool_calls

              if (reasoning) {
                currentThinking.value += reasoning
                options.onThinking?.(currentThinking.value)

                // 创建或更新助手消息的thinking部分
                if (!assistantMessage) {
                  assistantMessage = addMessage({
                    role: 'assistant',
                    content: '',
                    thinking: currentThinking.value
                  })
                } else {
                  // 找到消息在数组中的索引并更新
                  const messageIndex = messages.value.findIndex(
                    msg => msg.id === assistantMessage!.id
                  )
                  if (messageIndex !== -1) {
                    messages.value[messageIndex] = {
                      ...messages.value[messageIndex],
                      thinking: currentThinking.value
                    }
                  }
                }
              }

              if (content) {
                currentResponse.value += content

                // 更新或创建助手消息的content部分
                if (!assistantMessage) {
                  assistantMessage = addMessage({
                    role: 'assistant',
                    content: currentResponse.value,
                    thinking: currentThinking.value || undefined
                  })
                } else {
                  // 找到消息在数组中的索引并更新
                  const messageIndex = messages.value.findIndex(
                    msg => msg.id === assistantMessage!.id
                  )
                  if (messageIndex !== -1) {
                    messages.value[messageIndex] = {
                      ...messages.value[messageIndex],
                      content: currentResponse.value,
                      thinking: currentThinking.value || undefined
                    }
                  }
                }
              }

              // 处理工具调用 - 拼接流式返回中的arguments
              if (toolCalls && Array.isArray(toolCalls)) {
                console.log('🔧 收到工具调用数据:', toolCalls)

                for (let i = 0; i < toolCalls.length; i++) {
                  const toolCall = toolCalls[i]
                  const argsFragment = toolCall.function?.arguments || ''

                  console.log(`🔧 处理工具调用片段 [${i}]:`, {
                    id: toolCall.id || '(空ID)',
                    name: toolCall.function?.name || '(空名称)',
                    argsFragment,
                    fragmentLength: argsFragment.length,
                    hasId: !!toolCall.id,
                    hasFunction: !!toolCall.function
                  })

                  // 处理工具调用片段
                  if (toolCall.function) {
                    let targetId = toolCall.id

                    // 如果当前片段没有ID，尝试找到对应的工具调用
                    if (!targetId) {
                      // 策略1: 如果只有一个工具调用在进行，使用那个ID
                      if (pendingToolCalls.size === 1) {
                        targetId = Array.from(pendingToolCalls.keys())[0]
                        console.log('🔧 使用现有唯一工具调用ID:', targetId)
                      }
                      // 策略2: 根据工具名称匹配
                      else if (toolCall.function.name) {
                        for (const [
                          existingId,
                          existingCall
                        ] of pendingToolCalls.entries()) {
                          if (
                            existingCall.function.name ===
                            toolCall.function.name
                          ) {
                            targetId = existingId
                            console.log('🔧 根据工具名称匹配到ID:', targetId)
                            break
                          }
                        }
                      }
                      // 策略3: 使用索引位置匹配
                      else {
                        const existingIds = Array.from(pendingToolCalls.keys())
                        if (existingIds.length > i) {
                          targetId = existingIds[i]
                          console.log('🔧 根据索引位置匹配到ID:', targetId)
                        }
                      }
                    }

                    if (targetId) {
                      const existingCall = pendingToolCalls.get(targetId)
                      if (existingCall) {
                        // 更新现有的工具调用，拼接arguments
                        existingCall.function.arguments += argsFragment
                        console.log('🔧 拼接arguments片段:', {
                          id: targetId,
                          addedFragment: argsFragment,
                          totalArgs: existingCall.function.arguments,
                          totalLength: existingCall.function.arguments.length
                        })
                      } else {
                        // 创建新的工具调用记录
                        pendingToolCalls.set(targetId, {
                          id: targetId,
                          type: toolCall.type || 'function',
                          function: {
                            name: toolCall.function.name || '',
                            arguments: argsFragment
                          }
                        })
                        console.log('🔧 创建新工具调用记录:', {
                          id: targetId,
                          name: toolCall.function.name,
                          initialArgs: argsFragment
                        })
                      }
                    } else {
                      console.log('🔧 无法确定工具调用ID，跳过片段:', {
                        fragment: argsFragment,
                        existingCallsCount: pendingToolCalls.size
                      })
                    }
                  }
                }
              }
            } catch (e) {
              // 忽略解析错误，继续处理下一行
              console.warn('解析SSE数据失败:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()

      // 处理累积的工具调用
      if (pendingToolCalls.size > 0) {
        console.log('🔧 流式传输结束，开始处理累积的工具调用')
        console.log('🔧 累积的工具调用总数:', pendingToolCalls.size)

        // 显示所有累积的工具调用概览
        for (const [id, toolCall] of pendingToolCalls.entries()) {
          console.log(`🔧 工具调用概览 [${id}]:`, {
            id: toolCall.id,
            name: toolCall.function.name,
            argumentsLength: toolCall.function.arguments?.length || 0,
            argumentsPreview:
              toolCall.function.arguments?.substring(0, 100) + '...'
          })
        }

        // 在消息中初始化工具调用信息
        if (assistantMessage && pendingToolCalls.size > 0) {
          const toolCallsArray: ToolCall[] = Array.from(
            pendingToolCalls.values()
          ).map(toolCall => ({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
            isExecuting: true
          }))

          const messageIndex = messages.value.findIndex(
            msg => msg.id === assistantMessage!.id
          )
          if (messageIndex !== -1) {
            messages.value[messageIndex] = {
              ...messages.value[messageIndex],
              toolCalls: toolCallsArray
            }
          }
        }

        // 收集所有工具调用结果
        const toolResults: Array<{
          toolCallId: string
          toolName: string
          result: string
          isError: boolean
        }> = []

        for (const [, toolCall] of pendingToolCalls.entries()) {
          const toolName = toolCall.function.name
          let toolArgs = {}

          // 安全解析工具参数
          try {
            const argsString = toolCall.function.arguments || '{}'
            console.log(`🔧 准备解析工具参数: ${toolName}`)
            console.log(`🔧 完整的拼接结果:`, {
              toolId: toolCall.id,
              toolName,
              completeArgsString: argsString,
              argsLength: argsString.length,
              isValidJSON: (() => {
                try {
                  JSON.parse(argsString)
                  return true
                } catch {
                  return false
                }
              })()
            })

            if (argsString.trim()) {
              toolArgs = JSON.parse(argsString)
              console.log(`🔧 成功解析工具参数: ${toolName}`, toolArgs)
            }
          } catch (parseError) {
            console.error(`🔧 解析工具参数失败: ${toolName}`, {
              error: parseError,
              rawArgs: toolCall.function.arguments,
              argsType: typeof toolCall.function.arguments,
              argsLength: toolCall.function.arguments?.length || 0
            })
            toolArgs = {}
          }

          console.log(`🔧 AI请求调用工具: ${toolName}`, toolArgs)

          // 调用MCP工具 - 直接使用原始工具名称
          try {
            const toolResult = await mcpClient.callTool(toolName, toolArgs)
            const resultText = mcpClient.formatToolResult(toolResult)

            console.log(`🔧 工具调用成功: ${toolName}`, resultText)

            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              result: resultText,
              isError: false
            })

            // 更新消息中的工具调用状态
            if (assistantMessage) {
              const messageIndex = messages.value.findIndex(
                msg => msg.id === assistantMessage!.id
              )
              if (
                messageIndex !== -1 &&
                messages.value[messageIndex].toolCalls
              ) {
                const updatedToolCalls = messages.value[
                  messageIndex
                ].toolCalls!.map(tc =>
                  tc.id === toolCall.id
                    ? {
                        ...tc,
                        result: resultText,
                        isExecuting: false,
                        isError: false
                      }
                    : tc
                )
                messages.value[messageIndex] = {
                  ...messages.value[messageIndex],
                  toolCalls: updatedToolCalls
                }
              }
            }
          } catch (error) {
            console.error('🔧 工具调用失败:', error)

            const errorMessage =
              error instanceof Error ? error.message : '未知错误'
            toolResults.push({
              toolCallId: toolCall.id,
              toolName,
              result: errorMessage,
              isError: true
            })

            // 更新消息中的工具调用状态（错误）
            if (assistantMessage) {
              const messageIndex = messages.value.findIndex(
                msg => msg.id === assistantMessage!.id
              )
              if (
                messageIndex !== -1 &&
                messages.value[messageIndex].toolCalls
              ) {
                const updatedToolCalls = messages.value[
                  messageIndex
                ].toolCalls!.map(tc =>
                  tc.id === toolCall.id
                    ? {
                        ...tc,
                        result: errorMessage,
                        isExecuting: false,
                        isError: true
                      }
                    : tc
                )
                messages.value[messageIndex] = {
                  ...messages.value[messageIndex],
                  toolCalls: updatedToolCalls
                }
              }
            }
          }
        }

        // 如果有工具调用结果，将结果发送回模型继续对话
        if (toolResults.length > 0) {
          console.log('🔧 发送工具调用结果回模型，继续对话')
          await continueWithToolResults(
            toolResults,
            assistantMessage,
            pendingToolCalls
          )
        } else {
          // 如果没有工具调用，则重置流式状态
          isStreaming.value = false
        }
      } else {
        // 如果没有工具调用，则重置流式状态
        isStreaming.value = false
      }
    }

    return { hasToolCalls: pendingToolCalls.size > 0 }
  }

  // 处理工具调用继续对话的流式响应
  const handleContinuationStreamResponse = async (
    response: Response,
    existingMessage: ChatMessage | null
  ) => {
    if (!response.body) throw new Error('响应体为空')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        if (currentAbortController.value?.signal.aborted) {
          console.log('工具调用继续响应已被中断')
          break
        }

        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine) continue

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6).trim()

            if (data === '[DONE]') {
              return
            }

            if (!data || data.startsWith(':')) {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta
              const content = delta?.content

              if (content) {
                currentResponse.value += content

                // 更新现有的助手消息
                if (existingMessage) {
                  const messageIndex = messages.value.findIndex(
                    msg => msg.id === existingMessage.id
                  )
                  if (messageIndex !== -1) {
                    messages.value[messageIndex] = {
                      ...messages.value[messageIndex],
                      content: currentResponse.value
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('解析工具调用继续响应SSE数据失败:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
      // 重置流式状态
      isStreaming.value = false
    }
  }

  // 处理工具调用继续对话的普通响应
  const handleContinuationNormalResponse = async (
    response: Response,
    existingMessage: ChatMessage | null
  ) => {
    const data = await response.json()
    const messageData = data.choices?.[0]?.message
    const content = messageData?.content

    if (content) {
      currentResponse.value += content

      // 更新现有的助手消息
      if (existingMessage) {
        const messageIndex = messages.value.findIndex(
          msg => msg.id === existingMessage.id
        )
        if (messageIndex !== -1) {
          messages.value[messageIndex] = {
            ...messages.value[messageIndex],
            content: currentResponse.value
          }
        }
      }
    } else {
      throw new Error('工具调用继续对话API响应格式错误')
    }
  }

  // 继续工具调用结果的对话
  const continueWithToolResults = async (
    toolResults: Array<{
      toolCallId: string
      toolName: string
      result: string
      isError: boolean
    }>,
    assistantMessage: ChatMessage | null,
    pendingToolCalls: Map<
      string,
      {
        id: string
        type: string
        function: {
          name: string
          arguments: string
        }
      }
    >
  ) => {
    try {
      console.log('🔧 构建工具调用结果消息')

      // 构建包含工具调用结果的请求消息
      const toolMessages = toolResults.map(toolResult => ({
        role: 'tool' as const,
        tool_call_id: toolResult.toolCallId,
        name: toolResult.toolName,
        content: toolResult.isError
          ? `错误: ${toolResult.result}`
          : toolResult.result
      }))

      // 获取当前对话历史，包括最后的助手消息（包含工具调用）
      const conversationHistory = messages.value
        .filter(msg => msg.role !== 'system' || options.systemPrompt)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          // 如果是最后的助手消息，需要包含工具调用信息
          ...(msg.id === assistantMessage?.id && {
            tool_calls: Array.from(pendingToolCalls.values()).map(
              (toolCall: {
                id: string
                type: string
                function: {
                  name: string
                  arguments: string
                }
              }) => ({
                id: toolCall.id,
                type: toolCall.type,
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments
                }
              })
            )
          })
        }))

      // 构建完整的请求消息
      const requestMessages = [...conversationHistory, ...toolMessages]

      console.log('🔧 发送工具调用结果到模型:', {
        toolMessagesCount: toolMessages.length,
        totalMessagesCount: requestMessages.length
      })

      const requestBody = {
        model: config.model,
        messages: requestMessages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: config.stream,
        tools:
          mcpClient.availableTools.value.length > 0
            ? mcpClient.availableTools.value
            : undefined
      }

      // 发送请求继续对话
      const response = await fetch(
        `${config.baseURL.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(requestBody),
          signal: currentAbortController.value?.signal
        }
      )

      if (!response.ok) {
        throw new Error(
          `继续对话API请求失败: ${response.status} ${response.statusText}`
        )
      }

      // 不重置当前响应，而是保留现有内容并添加分隔符
      if (currentResponse.value) {
        currentResponse.value += '\n\n'
      }

      // 设置流式状态以驱动UI更新
      if (config.stream && response.body) {
        isStreaming.value = true
      }

      // 保持在同一个助手消息中继续追加内容
      if (config.stream && response.body) {
        // 自定义处理流式响应，确保使用现有的assistantMessage
        await handleContinuationStreamResponse(response, assistantMessage)
      } else {
        await handleContinuationNormalResponse(response, assistantMessage)
      }
    } catch (error) {
      console.error('🔧 继续工具调用对话失败:', error)

      // 显示工具调用结果和错误信息
      const toolResultsText = toolResults
        .map(tr => `**${tr.toolName}**: ${tr.result}`)
        .join('\n\n')

      currentResponse.value += `\n\n**工具调用结果:**\n${toolResultsText}\n\n**继续对话时出错:** ${error instanceof Error ? error.message : '未知错误'}`

      // 更新助手消息
      if (assistantMessage) {
        const messageIndex = messages.value.findIndex(
          msg => msg.id === assistantMessage.id
        )
        if (messageIndex !== -1) {
          messages.value[messageIndex] = {
            ...messages.value[messageIndex],
            content: currentResponse.value
          }
        }
      }
    }
  }

  // 处理普通响应
  const handleNormalResponse = async (response: Response) => {
    const data = await response.json()
    const messageData = data.choices?.[0]?.message
    const content = messageData?.content
    const reasoning = messageData?.reasoning_content

    if (content || reasoning) {
      const message: Omit<ChatMessage, 'id' | 'timestamp'> = {
        role: 'assistant',
        content: content || ''
      }

      // 只有当实际有reasoning内容时才添加
      if (reasoning) {
        message.thinking = reasoning
      }

      addMessage(message)
    } else {
      throw new Error('API响应格式错误')
    }
  }

  // 清空对话历史
  const clearMessages = () => {
    messages.value = []
    if (options.systemPrompt) {
      messages.value.push({
        id: generateId(),
        role: 'system',
        content: options.systemPrompt,
        timestamp: Date.now()
      })
    }
    currentResponse.value = ''
    currentThinking.value = ''
    error.value = null
  }

  // 重新发送最后一条消息
  const resendLastMessage = async () => {
    const lastUserMessage = messages.value
      .filter(msg => msg.role === 'user')
      .pop()

    if (lastUserMessage) {
      // 移除最后一条助手回复（如果有）
      let lastIndex = -1
      for (let i = messages.value.length - 1; i >= 0; i--) {
        if (messages.value[i].role === 'assistant') {
          lastIndex = i
          break
        }
      }
      if (lastIndex > -1) {
        messages.value.splice(lastIndex, 1)
      }

      await sendMessage(lastUserMessage.content)
    }
  }

  // 更新配置
  const updateConfig = (newConfig: Partial<AIConfig>) => {
    Object.assign(config, newConfig)
  }

  // 更新消息投票状态
  const updateMessageVote = (messageId: string, vote: MessageVote) => {
    const messageIndex = messages.value.findIndex(msg => msg.id === messageId)
    if (messageIndex !== -1) {
      messages.value[messageIndex] = {
        ...messages.value[messageIndex],
        vote: {
          ...vote,
          timestamp: Date.now()
        }
      }
    }
  }

  // 生成包含反馈信息的系统提示
  const generateFeedbackContext = (): string => {
    const votedMessages = messages.value.filter(
      msg =>
        msg.vote &&
        msg.role === 'assistant' &&
        (msg.vote.isUpvoted || msg.vote.isDownvoted)
    )

    if (votedMessages.length === 0) {
      return ''
    }

    console.log(`反馈: 基于 ${votedMessages.length} 条投票记录`)

    const feedbackInfo = votedMessages
      .map((msg, index) => {
        const voteType = msg.vote?.isUpvoted
          ? '👍 点赞'
          : msg.vote?.isDownvoted
            ? '👎 点踩'
            : '无反馈'
        const messagePreview = msg.content.slice(0, 80).replace(/\n/g, ' ')
        return `${index + 1}. 消息: "${messagePreview}..." - 用户反馈: ${voteType}`
      })
      .join('\n')

    const feedbackContext = `
===== 用户反馈信息 =====
请根据以下用户反馈调整回复风格和内容质量：

${feedbackInfo}

重要指导原则：
- 对于获得👍点赞的回复：请保持相似的风格、语调和内容质量
- 对于获得👎点踩的回复：请避免重复类似的表达方式或问题，改进回复质量
- 请始终提供有帮助、准确、友善的回复
========================
`

    return feedbackContext
  }

  // 初始化时自动获取模型列表
  fetchModels()

  return {
    // 状态
    messages: readonly(messages),
    isLoading: readonly(isLoading),
    isStreaming: readonly(isStreaming),
    error: readonly(error),
    currentResponse: readonly(currentResponse),
    currentThinking: readonly(currentThinking),
    config: readonly(config),

    // 模型相关
    models: readonly(models),
    isLoadingModels: readonly(isLoadingModels),
    modelsError: readonly(modelsError),

    // MCP相关
    mcpState: readonly(mcpClient.state),
    mcpTools: readonly(mcpClient.availableTools),

    // 方法
    sendMessage,
    addMessage,
    clearMessages,
    resendLastMessage,
    updateConfig,
    fetchModels,
    setModel,
    isCurrentModelReasoning,
    interrupt,
    updateMessageVote,
    // MCP方法
    mcpConnect: mcpClient.connectAll,
    mcpDisconnect: mcpClient.disconnect,
    mcpCallTool: mcpClient.callTool
  }
}
