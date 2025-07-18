import { ChatModel, ChatThread } from '@/types/chat'
import { BilingualContent } from '@/types/le'
import { AllowedMCPServer, MCPServerInfo } from '@/types/mcp'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 应用程序状态接口
 * 定义了全局状态的数据结构
 */
export interface AppState {
  /** 当前线程列表 */
  threadList: ChatThread[]
  /** 当前线程 ID */
  currentThreadId: ChatThread['id'] | null
  /** 快捷键弹窗是否打开 */
  openShortcutsPopup: boolean
  /** MCP 服务列表 */
  mcpServerList: (MCPServerInfo & { id: string })[]
  /** 工具选择 - 自动、手动、禁用 */
  toolChoice: 'auto' | 'manual' | 'none'
  /** 允许的 MCP 服务列表 */
  allowedMcpServers?: Record<string, AllowedMCPServer>
  /** 当前选择的模型 */
  chatModel?: ChatModel
  /** 自动朗读 */
  autoSpeech: boolean
  /** 学习模式弹窗是否打开 */
  openLeagentLearningMode: boolean
  /** 学习模式数据 */
  leagentLearningData: BilingualContent | null
}

/**
 * 应用程序调度接口
 * 定义了状态更新的方法类型
 */
export interface AppDispatch {
  /**
   * 状态变更方法
   * @param state 要更新的状态对象
   */
  mutate: (state: Mutate<AppState>) => void
}

/**
 * 初始状态配置
 * 定义应用程序的默认状态值
 */
const initialState: AppState = {
  threadList: [], // 线程列表
  currentThreadId: null, // 当前线程 ID
  mcpServerList: [], // MCP Server 列表
  openShortcutsPopup: false, // 快捷键弹窗 - 默认关闭
  toolChoice: 'auto', // 工具选择 - 默认自动
  allowedMcpServers: undefined,
  autoSpeech: true,
  openLeagentLearningMode: false, // 学习模式弹窗 - 默认关闭
  leagentLearningData: null // 学习模式数据 - 默认为空
}

export const appStore = create<AppState & AppDispatch>()(
  persist(
    set => ({
      ...initialState,
      // 通用状态更新方法，支持部分状态更新
      mutate: state => set(state)
    }),
    {
      name: 'le-agent-store-v0.1.0', // localStorage 中的存储键名
      // 部分持久化配置
      partialize: state => ({
        chatModel: state.chatModel || initialState.chatModel,
        toolChoice: state.toolChoice || initialState.toolChoice,
        allowedMcpServers:
          state.allowedMcpServers || initialState.allowedMcpServers,
        autoSpeech: state.autoSpeech || initialState.autoSpeech
      })
    }
  )
)
