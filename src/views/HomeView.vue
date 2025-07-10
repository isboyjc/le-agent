<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useChat } from '../hooks/useChat';
import type { ChatMessage } from '../hooks/useChat';
import { voteEvent, copyToInputEvent } from '../utils/eventBus';

// 聊天输入框的值
const chatValue = ref<string>('');

// ChatBox组件引用
const chatBoxRef = ref();

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
  interrupt,
  // 投票功能
  updateMessageVote,
  // MCP相关
  mcpState,
  mcpTools
} = useChat({
  systemPrompt: '你是一个友善的AI助手，请用中文回答问题。你可以使用搜索工具来获取实时信息。',
  onMessage: (message: ChatMessage) => {
    console.log('新消息:', message);
  },
  onThinking: (thinking: string) => {
    console.log('推理过程更新:', thinking);
  },
  onError: (error: Error) => {
    console.error('AI聊天错误:', error);
  }
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

// 处理复制到输入框
const handleCopyToInput = (content: string) => {
  chatValue.value = content;
  console.log('复制到输入框:', content);
};

// 处理投票事件
const handleVote = (messageId: string, voteType: 'up' | 'down') => {
  const currentMessage = messages.value.find(msg => msg.id === messageId);
  const currentVote = currentMessage?.vote;

  // 切换投票状态
  let newVote;
  if (voteType === 'up') {
    newVote = {
      isUpvoted: !currentVote?.isUpvoted,
      isDownvoted: false
    };
  } else {
    newVote = {
      isUpvoted: false,
      isDownvoted: !currentVote?.isDownvoted
    };
  }

  updateMessageVote(messageId, newVote);

  // 简单的投票确认日志
  const action = newVote.isUpvoted ? '👍' : newVote.isDownvoted ? '👎' : '❌';
  console.log(`投票: ${action}`);
};

// 监听事件总线
let voteEventHandler: { off: () => void } | undefined;
let copyToInputEventHandler: { off: () => void } | undefined;

onMounted(() => {
  // 监听投票事件
  voteEventHandler = voteEvent.on(({ messageId, voteType }) => {
    handleVote(messageId, voteType);
  });

  // 监听复制到输入框事件
  copyToInputEventHandler = copyToInputEvent.on(({ content }) => {
    handleCopyToInput(content);
  });

  // 页面加载时自动给输入框设置焦点
  setTimeout(() => {
    chatBoxRef.value?.focus();
  }, 100);
});

onUnmounted(() => {
  // 清理事件监听
  voteEventHandler?.off();
  copyToInputEventHandler?.off();
});
</script>

<template>
  <main class="relative h-screen overflow-hidden bg-background text-foreground">
    <!-- 主题切换组件 -->
    <div class="absolute top-4 right-4 z-10">
      <ThemeToggle />
    </div>

    <!-- 聊天记录区域 -->
    <div class="flex flex-col h-full w-full mx-auto relative">
      <!-- 消息列表 -->
      <MessageBox :messages="messages" :is-loading="isLoading" :is-streaming="isStreaming" />

      <!-- 输入区域 -->
      <div class="w-full max-w-4xl mx-auto px-4 pb-10">
        <ChatBox ref="chatBoxRef" v-model="chatValue" :models="models" :current-model="config.model"
          :loading="isLoading || isStreaming" :mcp-state="mcpState" :mcp-tools="mcpTools" @send="handleSend"
          @add="handleAddConversation" @model-change="handleModelChange" @interrupt="handleInterrupt" />
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
