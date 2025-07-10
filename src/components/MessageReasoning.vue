<script setup lang="ts">
import { ref, watch } from 'vue';

interface MessageReasoningProps {
  reasoning: string;
  isLoading: boolean;
}

const props = defineProps<MessageReasoningProps>();

// 展开/折叠状态
const isExpanded = ref(true);

// 监听加载状态，当推理完成后自动收起
watch(() => props.isLoading, (newIsLoading, oldIsLoading) => {
  // 当从加载中变为加载完成时，自动收起
  if (oldIsLoading && !newIsLoading) {
    isExpanded.value = false;
  }
});

// 切换展开状态
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<template>
  <div class="flex flex-col">
    <!-- 推理过程头部 -->
    <div class="flex flex-row gap-2 items-center">
      <div class="font-medium text-sm">
        {{ isLoading ? '正在推理...' : '推理了几秒钟' }}
      </div>

      <!-- 加载指示器 -->
      <div v-if="isLoading" class="animate-spin">
        <icon-eos-icons-three-dots-loading class="text-sm" />
      </div>

      <!-- 展开/折叠按钮 -->
      <button v-else type="button" class="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
        @click="toggleExpanded">
        <icon-mdi-chevron-down class="text-sm transition-transform duration-200"
          :class="{ 'rotate-180': !isExpanded }" />
      </button>
    </div>

    <!-- 推理内容 -->
    <Transition name="reasoning" enter-active-class="transition-all duration-200 ease-in-out"
      leave-active-class="transition-all duration-200 ease-in-out" enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-96" leave-from-class="opacity-100 max-h-96" leave-to-class="opacity-0 max-h-0">
      <div v-if="isExpanded"
        class="pl-4 text-text-quaternary border-l border-border flex flex-col gap-4 mt-4 mb-2 overflow-hidden">
        <div class="prose prose-sm max-w-none text-text-quaternary">
          <div class="whitespace-pre-wrap break-words">{{ reasoning }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.reasoning-enter-active,
.reasoning-leave-active {
  transition: all 0.2s ease-in-out;
}

.reasoning-enter-from,
.reasoning-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.reasoning-enter-to,
.reasoning-leave-from {
  opacity: 1;
  max-height: 400px;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.prose {
  color: inherit;
}

.prose p {
  margin: 0;
}
</style>
