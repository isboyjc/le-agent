<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ToolCall } from '../hooks/useChat'

interface MessageToolCallsProps {
  toolCalls: ToolCall[]
  isLoading?: boolean
}

const props = defineProps<MessageToolCallsProps>()

// 是否展开工具调用详情
const isExpanded = ref(false)

// 计算工具调用摘要
const summary = computed(() => {
  const executingCount = props.toolCalls.filter(call => call.isExecuting).length
  const completedCount = props.toolCalls.filter(call => call.result && !call.isExecuting).length
  const errorCount = props.toolCalls.filter(call => call.isError).length

  if (executingCount > 0) {
    return `执行工具调用 (${executingCount}/${props.toolCalls.length})...`
  }

  if (errorCount > 0) {
    return `工具调用 (${completedCount}成功/${errorCount}失败)`
  }

  return `工具调用 (${props.toolCalls.length}个)`
})

// 格式化工具参数
const formatArguments = (args: string) => {
  try {
    const parsed = JSON.parse(args)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return args
  }
}

// 切换展开状态
const toggle = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="border border-border rounded-lg overflow-hidden bg-muted/30">
    <!-- 工具调用摘要 -->
    <button @click="toggle"
      class="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <icon-solar-widget-3-outline class="text-base shrink-0" />
        <span>{{ summary }}</span>
        <icon-eos-icons-three-dots-loading v-if="toolCalls.some(call => call.isExecuting)"
          class="text-xs animate-spin text-primary" />
      </div>
      <icon-solar-alt-arrow-down-outline class="text-sm text-muted-foreground transition-transform"
        :class="{ 'rotate-180': isExpanded }" />
    </button>

    <!-- 工具调用详情 -->
    <div v-if="isExpanded" class="border-t border-border">
      <div class="divide-y divide-border/50">
        <div v-for="toolCall in toolCalls" :key="toolCall.id" class="p-3">
          <!-- 工具调用头部 -->
          <div class="flex items-center gap-2 mb-2">
            <div class="flex items-center gap-2">
              <div class="size-2 rounded-full shrink-0" :class="{
                'bg-primary animate-pulse': toolCall.isExecuting,
                'bg-success-1': toolCall.result && !toolCall.isError,
                'bg-error-1': toolCall.isError,
                'bg-muted-foreground': !toolCall.result && !toolCall.isExecuting
              }" />
              <span class="text-sm font-medium text-foreground">
                {{ toolCall.name }}
              </span>
            </div>
            <span v-if="toolCall.isExecuting" class="text-xs text-muted-foreground">
              执行中...
            </span>
            <span v-else-if="toolCall.isError" class="text-xs text-error-1">
              失败
            </span>
            <span v-else-if="toolCall.result" class="text-xs text-success-1">
              成功
            </span>
          </div>

          <!-- 工具参数 -->
          <div v-if="toolCall.arguments" class="mb-2">
            <div class="text-xs text-muted-foreground mb-1">参数:</div>
            <pre
              class="text-xs bg-muted/50 p-2 rounded text-muted-foreground overflow-x-auto">{{ formatArguments(toolCall.arguments) }}</pre>
          </div>

          <!-- 工具调用结果 -->
          <div v-if="toolCall.result" class="mt-2">
            <div class="text-xs text-muted-foreground mb-1">
              {{ toolCall.isError ? '错误信息:' : '执行结果:' }}
            </div>
            <div class="text-xs p-2 rounded overflow-x-auto max-h-32 overflow-y-auto" :class="{
              'bg-error-1/10 text-error-1': toolCall.isError,
              'bg-success-1/10 text-foreground': !toolCall.isError
            }">
              <pre class="whitespace-pre-wrap">{{ toolCall.result }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
pre {
  font-family: 'SF Mono', Menlo, Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  margin: 0;
}
</style>
