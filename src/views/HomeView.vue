<script setup lang="ts">
import { ref, computed } from 'vue';
import { useChat } from '../hooks/useChat';

// 聊天输入框的值
const chatValue = ref<string>('');

// 使用AI聊天hook，包含模型相关功能
const {
  messages,
  isLoading,
  isStreaming,
  sendMessage,
  clearMessages,
  // 模型相关
  models,
  setModel,
  config,
  // 中断功能
  interrupt
} = useChat({
  systemPrompt: '你是一个友善的AI助手，请用中文回答问题。',
  onMessage: (message) => {
    console.log('新消息:', message);
  },
  onThinking: (thinking) => {
    console.log('推理过程更新:', thinking);
  },
  onError: (error) => {
    console.error('AI聊天错误:', error);
  }
});

// 过滤掉系统消息，只显示用户和助手的对话
const displayMessages = computed(() => {
  return messages.value.filter(msg => msg.role !== 'system')
});

// 获取最后一条助手消息的ID
const lastAssistantMessageId = computed(() => {
  const assistantMessages = displayMessages.value.filter(msg => msg.role === 'assistant');
  return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].id : null;
});

// 处理发送消息
const handleSend = async (message: string) => {
  console.log('发送消息:', message);

  // 清空输入框
  chatValue.value = '';

  // 发送到AI
  await sendMessage(message);
};

// 处理模型切换
const handleModelChange = (modelId: string) => {
  setModel(modelId);
  console.log('已切换到模型:', modelId);
};

const handleAddConversation = () => {
  console.log('添加对话');
  clearMessages();
  chatValue.value = '';
};

// 处理中断
const handleInterrupt = () => {
  console.log('用户中断了对话');
  // 调用中断方法取消当前请求
  interrupt();
};

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <main class="relative h-screen overflow-hidden bg-background text-foreground">
    <!-- 主题切换组件 -->
    <div class="absolute top-4 right-4 z-10">
      <ThemeToggle />
    </div>

    <!-- 聊天记录区域 -->
    <div class="flex flex-col h-full max-w-4xl mx-auto">
      <!-- 消息列表 -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="displayMessages.length === 0" class="flex items-center justify-center h-full text-text-tertiary">
          <div class="text-center">
            <p class="text-lg mb-2">👋 你好阿！</p>
            <p>我是你的英语学习AI助手，有什么可以帮助你的吗？</p>
          </div>
        </div>

        <div v-for="message in displayMessages" :key="message.id" :class="[
          'flex',
          message.role === 'user' ? 'justify-end' : 'justify-start'
        ]">
          <div :class="[
            'max-w-[70%] rounded-2xl overflow-hidden',
            message.role === 'user'
              ? 'bg-primary text-white p-1'
              : 'bg-card border border-border'
          ]">
            <!-- 推理过程显示（如果有thinking内容） -->
            <div v-if="message.thinking && message.role === 'assistant'" class="p-3 bg-blue-50 dark:bg-blue-950 mb-3">
              <div class="flex items-center gap-2">
                <p class="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1">
                  <icon-mdi-brain class="text-sm" />
                  Thinking
                </p>
              </div>
              <div class="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap break-words">
                {{ message.thinking }}
              </div>
            </div>

            <!-- 消息内容 -->
            <div :class="message.role === 'assistant' && message.thinking ? 'p-3' : 'p-3'">
              <div class="whitespace-pre-wrap break-words">
                <icon-eos-icons-three-dots-loading class="mr-2"
                  v-if="isStreaming && message.role === 'assistant' && message.id === lastAssistantMessageId" />
                <span>{{ message.content }}</span>
              </div>
              <div :class="[
                'text-xs mt-2 opacity-70',
                message.role === 'user' ? 'text-right' : 'text-left'
              ]">
                {{ formatTime(message.timestamp) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 加载指示器 -->
        <div v-if="isLoading && !isStreaming" class="flex justify-start">
          <div class="bg-card border border-border py-2 px-3 rounded-2xl">
            <icon-eos-icons-three-dots-loading />
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="w-full px-4 pb-10">
        <ChatBox v-model="chatValue" :models="models" :current-model="config.model" :loading="isLoading || isStreaming"
          @send="handleSend" @add="handleAddConversation" @model-change="handleModelChange"
          @interrupt="handleInterrupt" />
      </div>
    </div>
  </main>
</template>

<style scoped>
/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--le-border);
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: var(--le-text-tertiary);
}
</style>
