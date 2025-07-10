<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ChatMessage } from '../hooks/useChat';
import { voteEvent } from '../utils/eventBus';

interface MessageActionsProps {
  message: ChatMessage;
  isLoading: boolean;
}

const props = defineProps<MessageActionsProps>();

// 复制状态
const isCopied = ref(false);

// 从消息的vote字段获取点赞状态
const isUpvoted = computed(() => props.message.vote?.isUpvoted ?? false);
const isDownvoted = computed(() => props.message.vote?.isDownvoted ?? false);

// 复制消息内容
const copyMessage = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (error) {
    console.error('复制失败:', error);
  }
};

// 点赞
const upvoteMessage = () => {
  voteEvent.trigger({
    messageId: props.message.id,
    voteType: 'up'
  });
};

// 点踩
const downvoteMessage = () => {
  voteEvent.trigger({
    messageId: props.message.id,
    voteType: 'down'
  });
};
</script>

<template>
  <div class="flex flex-row gap-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
    <!-- 复制按钮 -->
    <button
      class="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground border border-border rounded-3 hover:bg-accent transition-colors"
      @click="copyMessage" :title="isCopied ? '已复制！' : '复制'">
      <icon-solar-copy-outline v-if="!isCopied" class="text-3 cursor-pointer" />
      <icon-solar-unread-outline v-else class="text-3 text-success-1" />
    </button>

    <!-- 点赞按钮 -->
    <button class="h-8 w-8 flex items-center justify-center border rounded-3 transition-all duration-200" :class="{
      'text-green-600 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 shadow-sm scale-105': isUpvoted,
      'text-muted-foreground hover:text-green-600 border-border hover:bg-green-50 dark:hover:bg-green-950/50': !isUpvoted
    }" @click="upvoteMessage" :disabled="isLoading" :title="isUpvoted ? '已点赞 ✓ (点击取消)' : '点赞此回复'">
      <icon-solar-like-outline class="text-3 transition-transform duration-200" :class="{ 'scale-110': isUpvoted }" />
    </button>

    <!-- 点踩按钮 -->
    <button class="h-8 w-8 flex items-center justify-center border rounded-3 transition-all duration-200" :class="{
      'text-red-600 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 shadow-sm scale-105': isDownvoted,
      'text-muted-foreground hover:text-red-600 border-border hover:bg-red-50 dark:hover:bg-red-950/50': !isDownvoted
    }" @click="downvoteMessage" :disabled="isLoading" :title="isDownvoted ? '已点踩 ✓ (点击取消)' : '对此回复不满意'">
      <icon-solar-dislike-outline class="text-3 transition-transform duration-200"
        :class="{ 'scale-110': isDownvoted }" />
    </button>
  </div>
</template>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:disabled:hover {
  background-color: initial;
}
</style>
