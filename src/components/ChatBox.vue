<template>
  <div
    class="relative box-border bg-card w-full overflow-hidden rounded-[24px] border border-border transition-all duration-200"
    :class="{ 'border-foreground': isFocused }">
    <Textarea ref="textareaRef"
      className="box-border w-full resize-none border-0! bg-transparent! px-5 py-4 text-base outline-none placeholder:text-text-tertiary"
      v-model:value="value" placeholder="Say something..." :autoSize="{ minRows: 1, maxRows: 6 }" class="w-full"
      @keydown.enter.exact.prevent="handleSendOrInterrupt" @focus="isFocused = true" @blur="isFocused = false" />

    <!-- 操作栏 -->
    <div class="">
      <div class="flex items-center justify-between px-2 pb-2">
        <div class="flex items-center">
          <Button type="text" shape="circle"
            class="flex justify-center items-center rounded-4! w-10 h-10 hover:bg-primary hover:text-white transition-all duration-200"
            title="添加对话" @click="handleAddConversation">
            <icon-material-symbols-add-2-rounded class="" />
          </Button>

          <!-- MCP服务器下拉菜单 -->
          <a-dropdown :trigger="['click']"
            v-if="Object.keys(mcpToolsByServer).length > 0 || mcpState?.isConnecting || mcpState?.error">
            <Button type="text" shape="circle"
              class="flex justify-center items-center rounded-4! w-10 h-10 hover:bg-primary hover:text-white transition-all duration-200"
              title="MCP服务状态">
              <icon-eos-icons-three-dots-loading v-if="mcpState?.isConnecting" class="text-base animate-spin" />
              <icon-solar-server-square-cloud-outline v-else class="text-base"
                :style="{ color: getMCPStatusColor('overall') }" />
            </Button>
            <template #overlay>
              <a-menu class="rounded-2! min-w-[300px]">
                <!-- MCP总体状态 -->
                <a-menu-item-group title="MCP服务状态">
                  <a-menu-item key="status" class="rounded-2! bg-transparent! cursor-default!" disabled>
                    <div class="flex items-center gap-2 py-1">
                      <icon-eos-icons-three-dots-loading v-if="mcpState?.isConnecting" class="text-sm animate-spin" />
                      <icon-solar-server-square-cloud-outline v-else class="text-sm"
                        :style="{ color: getMCPStatusColor('overall') }" />
                      <span class="text-sm">
                        {{ mcpState?.error ? '连接失败' :
                          mcpState?.isConnecting ? '连接中...' :
                            mcpState?.isConnected ? `已连接 (共 ${mcpState.tools.length} 个工具)` : '未连接' }}
                      </span>
                    </div>
                    <div v-if="mcpState?.error" class="text-xs mt-1" :style="{ color: 'var(--le-destructive-1)' }">
                      {{ mcpState.error }}
                    </div>
                  </a-menu-item>
                </a-menu-item-group>

                <!-- 服务器列表 -->
                <template v-if="Object.keys(mcpToolsByServer).length > 0">
                  <a-menu-item-group title="MCP服务器">
                    <a-sub-menu class="rounded-2! overflow-hidden" v-for="(tools, serverName) in mcpToolsByServer"
                      :key="serverName" :expandIcon="() => null">
                      <template #title>
                        <div class="flex items-center gap-2">
                          <icon-eos-icons-three-dots-loading v-if="mcpState?.isConnecting"
                            class="text-sm animate-spin" />
                          <icon-solar-server-square-cloud-outline v-else class="text-sm"
                            :style="{ color: getMCPStatusColor(serverName) }" />
                          <span class="flex-1 truncate text-sm">{{ serverName }}</span>
                          <span class="text-xs px-1 py-0.5 rounded bg-muted">{{ tools.length }}</span>
                        </div>
                      </template>

                      <!-- 工具列表 -->
                      <a-menu-item-group :title="`工具列表 (${tools.length}个)`">
                        <a-sub-menu class="rounded-2! overflow-hidden" v-for="tool in tools"
                          :key="`${serverName}-${tool.name}`" :expandIcon="() => null">
                          <template #title>
                            <div class="flex items-center gap-2">
                              <span class="flex-1 truncate text-sm font-mono">{{ tool.name }}</span>
                            </div>
                          </template>

                          <!-- 工具详情 -->
                          <a-menu-item key="description" class="rounded-2! bg-transparent! cursor-default!" disabled>
                            <div class="py-2 space-y-2 max-w-[250px]">
                              <div class="text-xs font-medium">描述:</div>
                              <div class="text-xs text-muted-foreground break-words">
                                {{ tool.description || '暂无描述' }}
                              </div>

                              <div v-if="tool.inputSchema && Object.keys(tool.inputSchema).length > 0">
                                <div class="text-xs font-medium">参数:</div>
                                <div class="text-xs font-mono bg-muted px-2 py-1 rounded mt-1">
                                  {{ formatToolSchema(tool.inputSchema) }}
                                </div>
                              </div>
                            </div>
                          </a-menu-item>
                        </a-sub-menu>
                      </a-menu-item-group>
                    </a-sub-menu>
                  </a-menu-item-group>
                </template>
              </a-menu>
            </template>
          </a-dropdown>

          <!-- 无MCP服务时的静态按钮 -->
          <Button v-else type="text" shape="circle"
            class="flex justify-center items-center rounded-4! w-10 h-10 hover:bg-primary hover:text-white transition-all duration-200"
            title="MCP服务 (未配置)">
            <icon-solar-server-square-cloud-outline class="" />
          </Button>

          <a-dropdown :trigger="['click']" v-if="props.models.length > 0">
            <a class="text-sm ml-3 text-text-tertiary hover:text-text-secondary flex items-center gap-1 cursor-pointer transition-colors"
              @click.prevent>
              <icon-mdi-brain v-if="currentModelInfo?.isReasoning" />
              <span class="max-w-[140px] truncate">
                {{ currentModelInfo ? getModelDisplayName(currentModelInfo.id) : '选择模型' }}
              </span>
              <icon-mdi-chevron-down class="text-xs" />
            </a>
            <template #overlay>
              <a-menu class="rounded-2!" @click="handleMenuClick" :selectedKeys="[props.currentModel]">
                <!-- 推理模型组 -->
                <template v-if="groupedModels.reasoning.length > 0">
                  <a-menu-item-group title="推理模型">
                    <a-menu-item class="rounded-2! bg-transparent! hover:bg-border!"
                      v-for="model in groupedModels.reasoning" :key="model.id">
                      <div class="flex items-center gap-2">
                        <icon-mdi-brain class="text-sm" />
                        <span class="flex-1 truncate" :title="model.id">{{ getModelDisplayName(model.id) }}</span>
                      </div>
                    </a-menu-item>
                  </a-menu-item-group>
                </template>

                <!-- 普通模型组 -->
                <template v-if="groupedModels.normal.length > 0">
                  <a-menu-item-group title="指令模型">
                    <a-menu-item class="rounded-2! bg-transparent! hover:bg-border!"
                      v-for="model in groupedModels.normal" :key="model.id">
                      <div class="flex items-center gap-2">
                        <icon-solar-chat-round-line-outline class="text-sm" />
                        <span class="flex-1 truncate" :title="model.id">{{ getModelDisplayName(model.id) }}</span>
                      </div>
                    </a-menu-item>
                  </a-menu-item-group>
                </template>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        <div class="flex items-center gap-[2px]">
          <!-- <Button type="text" shape="circle"
            class="flex justify-center items-center rounded-4! w-10 h-10 hover:bg-primary hover:text-white transition-all duration-200"
            title="对话记录">
            <icon-solar-dialog-2-outline class="" />
          </Button> -->
          <Button type="text" shape="circle" @click="toggleRecording" :class="[
            'flex justify-center items-center rounded-4! w-10 h-10 transition-all duration-300',
            isListening ? 'bg-destructive-1! text-white' : '',
            isBlinking ? 'fast-blink' : ''
          ]" :title="isListening ? '停止录音' : '开始录音'">
            <svg v-if="isListening" width="20" height="20" viewBox="0 0 100 100" fill="none"
              xmlns="http://www.w3.org/2000/svg" class="audio-wave">
              <rect x="10" y="30" width="8" height="40" rx="4" fill="currentColor" class="bar bar-1">
                <animate attributeName="height" values="40;20;60;40" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="y" values="30;40;20;30" dur="0.8s" repeatCount="indefinite" />
              </rect>
              <rect x="25" y="20" width="8" height="60" rx="4" fill="currentColor" class="bar bar-2">
                <animate attributeName="height" values="60;30;80;60" dur="0.6s" repeatCount="indefinite" />
                <animate attributeName="y" values="20;35;10;20" dur="0.6s" repeatCount="indefinite" />
              </rect>
              <rect x="40" y="35" width="8" height="30" rx="4" fill="currentColor" class="bar bar-3">
                <animate attributeName="height" values="30;50;15;30" dur="0.9s" repeatCount="indefinite" />
                <animate attributeName="y" values="35;25;42.5;35" dur="0.9s" repeatCount="indefinite" />
              </rect>
              <rect x="55" y="25" width="8" height="50" rx="4" fill="currentColor" class="bar bar-4">
                <animate attributeName="height" values="50;70;35;50" dur="0.7s" repeatCount="indefinite" />
                <animate attributeName="y" values="25;15;32.5;25" dur="0.7s" repeatCount="indefinite" />
              </rect>
              <rect x="70" y="40" width="8" height="20" rx="4" fill="currentColor" class="bar bar-5">
                <animate attributeName="height" values="20;45;10;20" dur="1s" repeatCount="indefinite" />
                <animate attributeName="y" values="40;27.5;45;40" dur="1s" repeatCount="indefinite" />
              </rect>
              <rect x="85" y="35" width="8" height="30" rx="4" fill="currentColor" class="bar bar-6">
                <animate attributeName="height" values="30;15;55;30" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="y" values="35;42.5;22.5;35" dur="0.8s" repeatCount="indefinite" />
              </rect>
            </svg>

            <icon-solar-microphone-large-outline v-else class="" />
          </Button>

          <transition name="send-button">
            <Button v-if="props.modelValue.trim() || props.loading" type="text" shape="circle"
              @click="handleSendOrInterrupt" :class="[
                'flex justify-center items-center rounded-4! w-10 h-10 transition-all duration-200',
                props.loading
                  ? 'bg-destructive-1! hover:bg-destructive text-white'
                  : 'bg-border hover:bg-primary hover:text-white'
              ]" :title="props.loading ? '中断对话' : '发送消息'">
              <icon-solar-stop-bold v-if="props.loading" class="animate-pulse" />
              <icon-solar-plain-outline v-else class="" />
            </Button>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue';
import { Textarea, Button } from 'ant-design-vue';
import { useSpeechRecognition } from '@vueuse/core';

// 模型信息类型
interface ModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
  isReasoning?: boolean
}

// MCP相关类型
interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName?: string
}

interface MCPState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  tools: MCPTool[]
  servers: Record<string, { name: string; type: string; url: string }>
}

// Props定义
interface Props {
  modelValue?: string;
  models?: ModelInfo[];
  currentModel?: string;
  loading?: boolean;
  // MCP相关props
  mcpState?: MCPState;
  mcpTools?: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  models: () => [],
  currentModel: '',
  loading: false,
  mcpState: () => ({
    isConnected: false,
    isConnecting: false,
    error: null,
    tools: [],
    servers: {}
  }),
  mcpTools: () => []
});

// Emits定义
interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'send', value: string): void;
  (e: 'model-change', modelId: string): void;
  (e: 'interrupt'): void;
  (e: 'add'): void;
}

const emit = defineEmits<Emits>();

// 输入框引用和焦点状态
const textareaRef = ref();
const isFocused = ref(false);

// 暴露focus方法给父组件
const focus = () => {
  textareaRef.value?.focus();
};

// 暴露给父组件的方法
defineExpose({
  focus
});

// 使用计算属性来处理v-model
const value = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val)
});

// 计算当前选中的模型信息
const currentModelInfo = computed(() => {
  return props.models.find(model => model.id === props.currentModel);
});

// 获取模型显示名称（简化长名称）
const getModelDisplayName = (modelId: string) => {
  const parts = modelId.split('/');
  return parts[parts.length - 1] || modelId;
};

// 分组模型：推理模型和普通模型
const groupedModels = computed(() => {
  const reasoning = props.models.filter(model => model.isReasoning);
  const normal = props.models.filter(model => !model.isReasoning);

  return {
    reasoning,
    normal
  };
});

// 处理模型选择
const handleModelSelect = (modelId: string) => {
  emit('model-change', modelId);
};

// 处理菜单点击事件
const handleMenuClick = (event: { key: string }) => {
  handleModelSelect(event.key);
};

// 处理添加对话
const handleAddConversation = () => {
  emit('add');
};

// 静音检测相关状态
const SILENCE_DETECTION_TIME = 2000; // 2秒静音检测
const AUTO_STOP_DELAY = 2000; // 闪烁2秒后自动停止
const silenceTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const autoStopTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const isBlinking = ref(false); // 控制按钮闪烁状态

// 使用语音识别
const {
  isListening,
  isSupported,
  start,
  stop,
  result,
  isFinal
} = useSpeechRecognition({
  continuous: true,
  interimResults: true,
  lang: 'zh-CN',
});

// 保存开始录音前的基础内容
const baseContent = ref<string>('');
// 保存已确认的最终结果
const confirmedResults = ref<string>('');
// 保存上一次的识别结果，用于检测变化
const lastResult = ref<string>('');
// 用于检测语音活动
const lastResultTime = ref<number>(0);

// 监听识别结果变化
watch(result, (newResult) => {
  if (!newResult || !shouldUpdateInput.value) return;

  // 检测到语音活动，重置静音检测
  if (newResult.trim() && newResult !== lastResult.value) {
    resetSilenceDetection();
    lastResultTime.value = Date.now();
  }

  if (isFinal.value) {
    // 最终结果：只有真正不同的结果才追加
    if (newResult && newResult !== lastResult.value) {
      confirmedResults.value += newResult;
      lastResult.value = newResult;
    }
    // 显示基础内容加已确认的结果
    value.value = baseContent.value + confirmedResults.value;
  } else {
    // 临时结果：显示基础内容、已确认结果加当前临时结果
    value.value = baseContent.value + confirmedResults.value + newResult;
  }
}, { immediate: true });

// 添加一个标志来控制是否应该更新输入框
const shouldUpdateInput = ref(true);

// 监听最终结果状态变化
watch(isFinal, (isResultFinal) => {
  if (isResultFinal && result.value && shouldUpdateInput.value) {
    // 确保最终结果被保存
    if (result.value !== lastResult.value) {
      confirmedResults.value += result.value;
      lastResult.value = result.value;
      value.value = baseContent.value + confirmedResults.value;
    }
  }
});

// 监听录音状态变化
watch(isListening, (listening) => {
  if (!listening) {
    // 停止录音时，确保所有内容都保存到基础内容
    if (result.value && result.value !== lastResult.value) {
      confirmedResults.value += result.value;
      lastResult.value = result.value;
    }
    // 只在允许更新输入框时更新
    if (shouldUpdateInput.value) {
      value.value = baseContent.value + confirmedResults.value;
    }

    // 清除所有定时器
    clearAllTimers();
  } else {
    // 开始录音时，启动静音检测
    startSilenceDetection();
  }
});

// 开始静音检测
const startSilenceDetection = () => {
  clearAllTimers();
  lastResultTime.value = Date.now();

  // 2秒后检测静音
  silenceTimer.value = setTimeout(() => {
    if (isListening.value) {
      // 开始闪烁
      isBlinking.value = true;

      // 再过2秒自动停止
      autoStopTimer.value = setTimeout(() => {
        if (isListening.value) {
          console.log('检测到长时间静音，自动停止录音');
          // 确保在自动停止录音时也能更新输入框
          shouldUpdateInput.value = true;
          toggleRecording();
        }
      }, AUTO_STOP_DELAY);
    }
  }, SILENCE_DETECTION_TIME);
};

// 重置静音检测
const resetSilenceDetection = () => {
  clearAllTimers();
  isBlinking.value = false;

  if (isListening.value) {
    // 重新开始静音检测
    startSilenceDetection();
  }
};

// 清除所有定时器
const clearAllTimers = () => {
  if (silenceTimer.value) {
    clearTimeout(silenceTimer.value);
    silenceTimer.value = null;
  }
  if (autoStopTimer.value) {
    clearTimeout(autoStopTimer.value);
    autoStopTimer.value = null;
  }
  isBlinking.value = false;
};

// 切换录音状态
const toggleRecording = () => {
  if (!isSupported.value) {
    console.warn('浏览器不支持语音识别');
    return;
  }

  if (isListening.value) {
    stop();
  } else {
    // 开始录音前，保存当前输入框内容作为基础内容
    baseContent.value = props.modelValue;
    confirmedResults.value = '';
    lastResult.value = '';
    isBlinking.value = false;
    // 确保允许语音识别结果更新输入框
    shouldUpdateInput.value = true;
    start();
  }
};

// 发送消息或中断
const handleSendOrInterrupt = () => {
  if (props.loading) {
    // loading状态下，发送中断事件
    emit('interrupt');
    return;
  }

  if (props.modelValue.trim()) {
    // 发送事件到父级
    emit('send', props.modelValue);

    // 如果正在录音，停止录音
    if (isListening.value) {
      stop();
    }

    // 停止语音识别结果更新输入框
    shouldUpdateInput.value = false;

    // 清空输入框和相关状态
    value.value = '';
    baseContent.value = '';
    confirmedResults.value = '';
    lastResult.value = '';

    // 清除所有定时器
    clearAllTimers();

    // 延迟恢复语音识别更新功能，确保输入框已清空
    setTimeout(() => {
      shouldUpdateInput.value = true;
    }, 100);
  }
};

// 按服务器分组MCP工具
const mcpToolsByServer = computed(() => {
  const grouped: Record<string, MCPTool[]> = {}

  if (props.mcpState?.tools) {
    props.mcpState.tools.forEach(tool => {
      const serverName = tool.serverName || '未知服务器'
      if (!grouped[serverName]) {
        grouped[serverName] = []
      }
      grouped[serverName].push(tool)
    })
  }

  return grouped
})

// MCP连接状态颜色
const getMCPStatusColor = (serverName: string) => {
  if (!props.mcpState) return 'var(--le-text-tertiary)'

  // 处理整体状态
  if (serverName === 'overall') {
    if (props.mcpState.error) {
      return 'var(--le-destructive-1)'
    } else if (props.mcpState.isConnecting) {
      return 'var(--le-warning-1)'
    } else if (props.mcpState.isConnected) {
      return 'var(--le-success-1)'
    }
    return 'var(--le-text-tertiary)'
  }

  // 处理特定服务器状态
  if (props.mcpState.error) {
    return 'var(--le-destructive-1)'
  } else if (props.mcpState.isConnecting) {
    return 'var(--le-warning-1)'
  } else if (props.mcpState.isConnected && props.mcpState.servers[serverName]) {
    return 'var(--le-success-1)'
  }
  return 'var(--le-text-tertiary)'
}

// 格式化工具参数schema
const formatToolSchema = (schema: Record<string, unknown>) => {
  try {
    if (schema.properties && typeof schema.properties === 'object') {
      const props = schema.properties as Record<string, unknown>
      const paramNames = Object.keys(props)
      if (paramNames.length > 0) {
        return paramNames.join(', ')
      }
    }
    return 'schema'
  } catch {
    return 'schema'
  }
}

// 组件卸载时停止录音
onUnmounted(() => {
  if (isListening.value) {
    stop();
  }
  clearAllTimers();
});
</script>

<style scoped>
.audio-wave {
  transform-origin: center;
}

.audio-wave .bar {
  transform-origin: center bottom;
}

/* 为每个条形添加稍微不同的动画延迟 */
.bar-1 {
  animation-delay: 0s;
}

.bar-2 {
  animation-delay: 0.1s;
}

.bar-3 {
  animation-delay: 0.2s;
}

.bar-4 {
  animation-delay: 0.3s;
}

.bar-5 {
  animation-delay: 0.4s;
}

.bar-6 {
  animation-delay: 0.5s;
}

/* 快速闪烁动画 */
.fast-blink {
  animation: fast-blink 0.5s ease-in-out infinite;
}

@keyframes fast-blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.3;
  }

  100% {
    opacity: 1;
  }
}

/* 发送按钮过渡动画 */
.send-button-enter-active,
.send-button-leave-active {
  transition: all 0.3s ease;
}

.send-button-enter-from {
  opacity: 0;
  transform: translateX(20px) scale(0.8);
}

.send-button-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.8);
}

.send-button-enter-to,
.send-button-leave-from {
  opacity: 1;
  transform: translateX(0) scale(1);
}

/* 确保所有按钮都有平滑的位置过渡 */
.flex.items-center.gap-2>* {
  transition: transform 0.3s ease;
}
</style>
