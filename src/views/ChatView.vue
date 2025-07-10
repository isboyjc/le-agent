<template>
  <div class="chat-container h-screen flex flex-col bg-background text-foreground">
    <!-- 头部 -->
    <div class="chat-header border-b border-border p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-semibold">AI 对话</h1>
        <div class="flex items-center gap-4">
          <div class="text-sm text-text-secondary">
            模型: {{ AI_CONFIG.model.split('/').pop() }}
          </div>
          <div class="flex items-center gap-2">
            <div :class="[
              'w-2 h-2 rounded-full',
              status === 'ready' ? 'bg-green-500' :
                status === 'streaming' || status === 'submitted' ? 'bg-blue-500' :
                  status === 'error' ? 'bg-red-500' : 'bg-gray-400'
            ]"></div>
            <span class="text-sm text-text-secondary">
              {{ statusText }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="clearMessages" class="px-3 py-1 text-sm bg-card hover:bg-border rounded-md transition-colors">
          清空对话
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="chat-messages flex-1 overflow-y-auto p-4 space-y-4" ref="messagesRef">
      <!-- 欢迎信息 -->
      <div v-if="messages.filter(msg => msg.role !== 'system').length === 0"
        class="text-center text-text-tertiary py-8">
        <div class="text-6xl mb-4">🤖</div>
        <h2 class="text-xl font-medium mb-2">欢迎使用AI助手</h2>
        <p class="text-text-secondary">请输入您的问题，我会尽力帮助您</p>
        <div class="mt-4 p-3 bg-card rounded-lg border border-border">
          <p class="text-sm text-text-secondary">
            💡 这是一个纯前端AI聊天界面，直接调用 {{ AI_CONFIG.model }} 模型
          </p>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-for="message in messages.filter(msg => msg.role !== 'system')" :key="message.id" :class="[
        'message-item flex gap-3',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      ]">
        <!-- 用户消息 -->
        <div v-if="message.role === 'user'"
          class="message-bubble user-message bg-primary text-white p-3 rounded-lg max-w-[70%] break-words">
          <div class="whitespace-pre-wrap">{{ message.content }}</div>
          <div class="text-xs opacity-70 mt-1">
            {{ formatTime(message.createdAt) }}
          </div>
        </div>

        <!-- AI消息 -->
        <div v-if="message.role === 'assistant'"
          class="message-bubble ai-message bg-card border border-border p-3 rounded-lg max-w-[70%] break-words">
          <div class="flex items-start gap-2 mb-2">
            <div class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">
              AI
            </div>
            <div class="flex-1">
              <div class="whitespace-pre-wrap">{{ message.content }}</div>
              <div class="text-xs text-text-secondary mt-1">
                {{ formatTime(message.createdAt) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="flex justify-start">
        <div class="message-bubble ai-message bg-card border border-border p-3 rounded-lg flex items-center gap-2">
          <div class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-sm">
            AI
          </div>
          <div class="flex items-center gap-2">
            <div class="loading-dots flex gap-1">
              <div class="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
              <div class="w-2 h-2 bg-primary rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
            <span class="text-sm text-text-secondary">正在思考...</span>
          </div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="error" class="message-bubble error-message bg-red-50 border border-red-200 p-3 rounded-lg">
        <div class="flex items-center gap-2 text-red-600">
          <div class="text-red-500">⚠️</div>
          <div>
            <div class="font-medium">发生错误</div>
            <div class="text-sm">{{ error.message }}</div>
          </div>
        </div>
        <button @click="retryLastMessage"
          class="mt-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded">
          重试
        </button>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input border-t border-border p-4">
      <form @submit="handleSubmit" class="flex gap-2">
        <div class="flex-1 relative">
          <textarea v-model="input" placeholder="输入您的问题..."
            class="w-full p-3 border border-border rounded-lg resize-none bg-background text-foreground placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            rows="1" :disabled="isLoading" @keydown.enter.exact.prevent="handleSubmit"
            @keydown.enter.shift.exact="handleNewLine" ref="textareaRef"></textarea>
          <div class="absolute bottom-2 right-2 text-xs text-text-tertiary">
            Shift+Enter 换行
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <button type="submit" :disabled="!input.trim() || isLoading"
            class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {{ isLoading ? '发送中...' : '发送' }}
          </button>
          <button v-if="isLoading" @click="stop" type="button"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
            停止
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChat } from '@ai-sdk/vue'
import { computed, ref, nextTick, onMounted, watch } from 'vue'

/**
 * ChatView 组件
 *
 * 这是一个完整的AI聊天界面，直接在前端调用AI API，无需后端。
 *
 * 🔧 使用方法：
 * 1. 修改下面的 AI_CONFIG 配置
 * 2. 确保API密钥有效
 * 3. 根据需要修改模型和系统提示词
 *
 * 🚀 支持的功能：
 * - 实时流式响应
 * - 多行输入（Shift+Enter换行）
 * - 停止生成
 * - 清空对话
 * - 错误重试
 * - 自动滚动到底部
 * - 状态指示器
 * - 响应式设计
 *
 * 🎯 配置选项：
 * - baseURL: API基础地址
 * - apiKey: API密钥
 * - model: 使用的模型名称
 * - systemPrompt: 系统提示词
 *
 * 📦 依赖：
 * - @ai-sdk/vue: AI SDK for Vue
 * - Vue 3 + TypeScript
 * - UnoCSS 样式框架
 */

// AI API 配置 - 您可以修改这些配置来使用不同的模型和API
const AI_CONFIG = {
  baseURL: 'https://api-inference.modelscope.cn/v1',
  apiKey: 'bfd6ceb1-5b7f-4e4c-b381-48aeb7a6cca7',
  model: 'Qwen/QwQ-32B-Preview', // 推理模型，适合复杂问题
  // model: 'qwen/Qwen2.5-72B-Instruct', // 指令模型，适合常规对话
  systemPrompt: '你是一个友善的AI助手，请用中文回答问题。'
}

// 自定义 fetch 函数来直接调用外部 API
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // 解析请求体
  const options = init || {}
  const requestBody = options.body ? JSON.parse(options.body as string) : {}
  const messages = requestBody.messages || []

  // 准备请求体，参考 useChat.ts 中的写法
  const apiRequestBody = {
    model: AI_CONFIG.model,
    messages: messages,
    temperature: 0.7,
    max_tokens: 2000,
    stream: true
  }

  // 使用POST请求，与 useChat.ts 保持一致
  const response = await fetch(`${AI_CONFIG.baseURL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKey}`
    },
    body: JSON.stringify(apiRequestBody),
    signal: options.signal // 保持中断信号的传递
  })

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
  }

  return response
}

// 使用 @ai-sdk/vue 的 useChat hook
const {
  messages,
  input,
  handleSubmit,
  isLoading,
  error,
  status,
  stop,
  reload,
  setMessages
} = useChat({
  initialMessages: [
    {
      id: 'system',
      role: 'system',
      content: AI_CONFIG.systemPrompt,
      createdAt: new Date()
    }
  ],
  fetch: customFetch, // 使用自定义的 fetch 函数
  onResponse: (response) => {
    console.log('收到响应:', response)
  },
  onFinish: (message) => {
    console.log('对话完成:', message)
  },
  onError: (error) => {
    console.error('对话错误:', error)
  }
})

// 状态文本
const statusText = computed(() => {
  switch (status.value) {
    case 'ready':
      return '就绪'
    case 'submitted':
      return '正在发送...'
    case 'streaming':
      return '正在接收...'
    case 'error':
      return '发生错误'
    default:
      return '未知状态'
  }
})

// 输入框引用
const textareaRef = ref<HTMLTextAreaElement>()
// 消息容器引用
const messagesRef = ref<HTMLDivElement>()

// 格式化时间
const formatTime = (date: Date | string | undefined) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 清空消息
const clearMessages = () => {
  setMessages([
    {
      id: 'system',
      role: 'system',
      content: AI_CONFIG.systemPrompt,
      createdAt: new Date()
    }
  ])
}

// 重试最后一条消息
const retryLastMessage = () => {
  const userMessages = messages.value.filter(msg => msg.role !== 'system')
  if (userMessages.length > 0) {
    reload()
  }
}

// 处理换行
const handleNewLine = () => {
  input.value += '\n'
  nextTick(() => {
    autoResize()
  })
}

// 自动调整textarea高度
const autoResize = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
  }
}



// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTo({
        top: messagesRef.value.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
}

onMounted(() => {
  // 聚焦输入框
  textareaRef.value?.focus()

  // 监听消息变化，自动滚动到底部
  watch(messages, () => {
    scrollToBottom()
  }, { deep: true })
})
</script>

<style scoped>
.chat-container {
  max-width: 1200px;
  margin: 0 auto;
}

.chat-messages {
  scroll-behavior: smooth;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: var(--le-border);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: var(--le-text-tertiary);
}

.message-bubble {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-dots div {
  animation: bounce 1.4s infinite ease-in-out;
}

.loading-dots div:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots div:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {

  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1);
  }
}

/* 确保textarea能够正确自适应高度 */
textarea {
  max-height: 120px;
  min-height: 40px;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    height: 100vh;
  }

  .message-bubble {
    max-width: 85%;
  }
}
</style>
