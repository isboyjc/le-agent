import { ref, reactive, readonly } from 'vue'

// 消息类型定义
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  thinking?: string // 推理过程（如果模型有输出）
  timestamp: number
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
  'deepseek-ai/DeepSeek-V3': { isReasoning: true },
  'deepseek-ai/DeepSeek-R1-0528': { isReasoning: true },
  'Qwen/QVQ-72B-Preview': { isReasoning: true },

  // 普通文本模型
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

    try {
      error.value = null
      isLoading.value = true
      currentResponse.value = ''
      currentThinking.value = ''

      // 添加用户消息
      addMessage({ role: 'user', content })

      // 准备API请求数据
      const requestMessages = messages.value
        .filter(msg => msg.role !== 'system' || options.systemPrompt) // 只包含系统消息如果有设置
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      const requestBody = {
        model: config.model,
        messages: requestMessages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        stream: config.stream
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
        await handleStreamResponse(response)
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
      isStreaming.value = false
      options.onComplete?.()
    }
  }

  // 处理流式响应
  const handleStreamResponse = async (response: Response) => {
    if (!response.body) throw new Error('响应体为空')

    isStreaming.value = true
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let assistantMessage: ChatMessage | null = null

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
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()

            if (data === '[DONE]') {
              return
            }

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta

              // 检查是否有reasoning_content字段
              const reasoning = delta?.reasoning_content
              const content = delta?.content

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
            } catch (e) {
              // 忽略解析错误，继续处理下一行
              console.warn('解析SSE数据失败:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
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

    // 方法
    sendMessage,
    addMessage,
    clearMessages,
    resendLastMessage,
    updateConfig,
    fetchModels,
    setModel,
    isCurrentModelReasoning,
    interrupt
  }
}
