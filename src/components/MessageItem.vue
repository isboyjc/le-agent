<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChatMessage } from '../hooks/useChat';
import { voteEvent, copyToInputEvent } from '../utils/eventBus';

interface MessageItemProps {
  message: ChatMessage;
  isLoading: boolean;
  isStreaming: boolean;
  isLastMessage: boolean;
}

const props = defineProps<MessageItemProps>();

// 复制状态
const isCopied = ref(false);

// 复制内容到输入框
const copyToInput = () => {
  copyToInputEvent.trigger({
    content: props.message.content
  });

  // 显示成功状态
  isCopied.value = true;

  // 1秒后切换回复制图标
  setTimeout(() => {
    isCopied.value = false;
  }, 1000);
};

// 处理投票事件
const handleVote = (messageId: string, voteType: 'up' | 'down') => {
  voteEvent.trigger({
    messageId,
    voteType
  });
};

// 判断是否为用户消息
const isUserMessage = computed(() => props.message.role === 'user');

// 判断是否为助手消息
const isAssistantMessage = computed(() => props.message.role === 'assistant');

// 判断是否有推理过程
const hasThinking = computed(() => props.message.thinking && props.message.thinking.length > 0);

// 判断是否有工具调用
const hasToolCalls = computed(() => props.message.toolCalls && props.message.toolCalls.length > 0);

// 判断是否正在加载
const isCurrentlyLoading = computed(() => {
  return props.isLoading && props.isStreaming && props.isLastMessage && isAssistantMessage.value;
});
</script>

<template>
  <div class="w-full mx-auto max-w-3xl px-4 box-border group/message" :class="{
    'animate-fade-in': true,
    'min-h-96': isAssistantMessage && isCurrentlyLoading
  }" :data-role="message.role">
    <div class="flex gap-4 w-full" :class="{
      'group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl': isUserMessage,
      'group-data-[role=user]/message:w-fit': isUserMessage
    }">
      <!-- 助手消息头像 -->
      <div v-if="isAssistantMessage"
        class="size-8 flex items-center rounded-3 justify-center ring-1 shrink-0 ring-border bg-background">
        <div class="translate-y-px flex items-center justify-center">
          <icon-le-logo class="text-sm" />
        </div>
      </div>

      <!-- 消息内容区域 -->
      <div class="flex flex-col gap-4 w-full max-w-full min-w-0 overflow-x-hidden" :class="{
        'min-h-96': isAssistantMessage && isCurrentlyLoading
      }">
        <!-- 推理过程 -->
        <MessageReasoning v-if="hasThinking" :reasoning="message.thinking || ''" :is-loading="isCurrentlyLoading" />

        <!-- 工具调用过程 -->
        <MessageToolCalls v-if="hasToolCalls" :tool-calls="message.toolCalls || []" :is-loading="isCurrentlyLoading" />

        <!-- 消息内容 -->
        <div class="flex flex-row gap-2 items-start max-w-full min-w-0 overflow-x-hidden">
          <button v-if="isUserMessage"
            class="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100 hover:bg-accent transition-colors"
            @click="copyToInput" :title="isCopied ? '已复制！' : '复制到输入框'">
            <icon-solar-copy-outline v-if="!isCopied" class="text-sm cursor-pointer" />
            <icon-solar-unread-outline v-else class="text-sm text-success-1" />
          </button>

          <!-- 消息内容 -->
          <div class="flex flex-col gap-4 max-w-full min-w-0 flex-1 overflow-x-hidden" :class="{
            'bg-foreground text-background px-3 py-2 rounded-xl box-border': isUserMessage,
            'text-foreground': !isUserMessage
          }">
            <!-- 消息文本 -->
            <div class="prose prose-sm max-w-full break-words min-w-0">
              <MarkdownRenderer :content="message.content" :is-user-message="isUserMessage" />
            </div>
          </div>
        </div>

        <!-- 消息操作按钮 -->
        <MessageActions v-if="isAssistantMessage && !isCurrentlyLoading" :message="message" :is-loading="isLoading"
          @vote="handleVote" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.prose {
  color: inherit;
  max-width: none !important;
  width: 100% !important;
}

.prose p {
  margin: 0;
}

.group[data-role="user"] .group-data-[role=user]\/message\:ml-auto {
  margin-left: auto;
}

.group[data-role="user"] .group-data-[role=user]\/message\:max-w-2xl {
  max-width: 32rem;
}

.group[data-role="user"] .group-data-[role=user]\/message\:w-fit {
  width: fit-content;
}
</style>
