<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useScroll } from '@vueuse/core';
import type { ChatMessage } from '../hooks/useChat';

interface MessageBoxProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
}

const props = defineProps<MessageBoxProps>();

// 滚动容器的引用
const scrollContainerRef = ref<HTMLElement>();

// 使用 vueuse 的 useScroll 来监听和控制滚动
const { arrivedState } = useScroll(scrollContainerRef, {
  behavior: 'smooth'
});

// 过滤掉系统消息，只显示用户和助手的对话
const displayMessages = computed(() => {
  return props.messages.filter(msg => msg.role !== 'system')
});

// 判断是否应该显示思考中状态
const shouldShowThinking = computed(() => {
  return props.isLoading && !props.isStreaming && displayMessages.value.length > 0 &&
    displayMessages.value[displayMessages.value.length - 1].role === 'user';
});

// 获取输入框高度的函数
const getInputBoxHeight = (): number => {
  // 查找悬浮的输入框容器
  const inputContainer = document.querySelector('.absolute.bottom-0');
  if (inputContainer) {
    return inputContainer.getBoundingClientRect().height;
  }
  // 如果找不到，使用默认估算值（35 * 4 = 140px，pb-35对应大约140px）
  return 140;
};

// 检查是否接近底部（考虑输入框高度）
const isNearBottom = computed(() => {
  if (!scrollContainerRef.value) return false;
  const element = scrollContainerRef.value;
  const inputHeight = getInputBoxHeight();
  // 增加一些容错空间（20px）
  const threshold = inputHeight + 20;
  return arrivedState.bottom || (element.scrollHeight - element.scrollTop - element.clientHeight) < threshold;
});

// 智能滚动到底部的函数（考虑输入框高度）
const scrollToBottomSmart = (immediate = false) => {
  if (!scrollContainerRef.value) return;

  const element = scrollContainerRef.value;
  const inputHeight = getInputBoxHeight();
  // 额外的安全间距
  const extraPadding = 20;

  // 计算目标滚动位置：总高度 - 可视高度 + 输入框高度 + 额外间距
  const targetScrollTop = element.scrollHeight - element.clientHeight + inputHeight + extraPadding;

  if (immediate) {
    element.scrollTop = Math.max(0, targetScrollTop);
  } else {
    element.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  }
};

// 滚动到底部的函数（优化后）
const scrollToBottom = () => {
  scrollToBottomSmart(false);
};

// 强制滚动到底部（不使用平滑动画）
const scrollToBottomImmediate = () => {
  scrollToBottomSmart(true);
};

// 监听消息变化，智能滚动
watch(
  () => props.messages,
  () => {
    nextTick(() => {
      // 如果用户在底部或接近底部，自动滚动
      if (isNearBottom.value) {
        scrollToBottom();
      }
    });
  },
  { deep: true }
);

// 监听流式输出开始，强制滚动到底部
watch(
  () => props.isStreaming,
  (streaming) => {
    if (streaming) {
      nextTick(() => {
        scrollToBottomImmediate();
      });
    }
  }
);

// 监听加载状态，智能滚动
watch(
  () => props.isLoading,
  (loading) => {
    if (loading) {
      nextTick(() => {
        // 开始加载时，如果接近底部就滚动到底部
        if (isNearBottom.value) {
          scrollToBottom();
        }
      });
    }
  }
);

// 监听思考状态变化，自动滚动
watch(
  () => shouldShowThinking.value,
  (thinking) => {
    if (thinking) {
      nextTick(() => {
        scrollToBottom();
      });
    }
  }
);
</script>

<template>
  <div ref="scrollContainerRef"
    class="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 pb-4 box-border relative">
    <!-- 空状态显示 -->
    <div v-if="displayMessages.length === 0" class="flex items-center justify-center h-full text-muted-foreground">
      <div class="text-center">
        <p class="text-lg mb-2">👋 你好阿！</p>
        <p>我是你的英语学习AI助手，有什么可以帮助你的吗？</p>
      </div>
    </div>

    <!-- 消息列表 -->
    <MessageItem v-for="(message, index) in displayMessages" :key="message.id" :message="message"
      :is-loading="isLoading" :is-streaming="isStreaming" :is-last-message="index === displayMessages.length - 1" />

    <!-- 思考中状态 -->
    <div v-if="shouldShowThinking"
      class="w-full mx-auto max-w-3xl px-4 group/message min-h-96 animate-fade-in box-border">
      <div class="flex gap-4 w-full">
        <div class="size-8 flex items-center rounded-3 justify-center ring-1 shrink-0 ring-border bg-background">
          <div class="translate-y-px flex items-center justify-center">
            <icon-le-logo class="text-sm" />
          </div>
        </div>
        <div class="flex flex-col gap-2 w-full">
          <div class="flex items-center gap-2 text-muted-foreground">
            <icon-eos-icons-three-dots-loading class="text-sm animate-spin" />
            <span class="text-sm">正在思考...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 动态底部间距：确保最后的内容不会被输入框遮盖 -->
    <div class="shrink-0 min-w-[24px]" :style="{ height: getInputBoxHeight() + 20 + 'px' }" />
  </div>
</template>

<style scoped>
/* 自定义滚动条 */
.overflow-y-scroll::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-scroll::-webkit-scrollbar-thumb {
  background: var(--le-border);
  border-radius: 2px;
}

.overflow-y-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--le-text-tertiary);
}

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
</style>
