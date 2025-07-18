import { ChatModel } from '@/types/chat'
import { deepseek } from '@ai-sdk/deepseek'
import { LanguageModel } from 'ai'
import { createQwen } from './provider/qwen'

const qwen = createQwen({
  apiKey: process.env.MODEL_SCOPE_API_KEY,
  baseURL: process.env.MODEL_SCOPE_BASE_URL
})

// 静态模型
const staticModels = {
  modelscope: {
    'Qwen/QwQ-32B': qwen('Qwen/QwQ-32B'),
    'deepseek-ai/DeepSeek-R1-0528': qwen('deepseek-ai/DeepSeek-R1-0528'),
    'Qwen/Qwen3-235B-A22B': qwen('Qwen/Qwen3-235B-A22B'),
    'MiniMax/MiniMax-M1-80k': qwen('MiniMax/MiniMax-M1-80k'),
    'Qwen/QwQ-32B-Preview': qwen('Qwen/QwQ-32B-Preview'),
    'deepseek-ai/DeepSeek-V3': qwen('deepseek-ai/DeepSeek-V3'),
    'Qwen/Qwen2.5-72B-Instruct': qwen('Qwen/Qwen2.5-72B-Instruct')
  },
  deepseek: {
    'deepseek-ai/DeepSeek-R1-0528': deepseek('deepseek-reasoner')
  }
}

// 不支持工具调用的内置模型
const staticUnsupportedModels = new Set([
  staticModels.modelscope['deepseek-ai/DeepSeek-V3'],
  staticModels.modelscope['Qwen/Qwen2.5-72B-Instruct'],
  staticModels.modelscope['Qwen/QwQ-32B-Preview']
])

const allModels = { ...staticModels }

const allUnsupportedModels = new Set([...staticUnsupportedModels])

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model)
}

const firstProvider = Object.keys(allModels)[0] as keyof typeof allModels
const firstModel = Object.keys(
  allModels[firstProvider]
)[0] as keyof (typeof allModels)[typeof firstProvider]

const fallbackModel = allModels[firstProvider][firstModel]

export const customModelProvider = {
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      isToolCallUnsupported: isToolCallUnsupportedModel(model)
    }))
  })),
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) return fallbackModel
    return (allModels as any)[model.provider]?.[model.model] || fallbackModel
  }
}
