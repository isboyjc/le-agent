import { ref, reactive, computed } from 'vue'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

// MCP Server配置类型
export interface MCPServerConfig {
  name: string
  type: 'sse' | 'streamable-http'
  url: string
  headers?: Record<string, string>
  timeout?: number
}

// MCP工具类型
export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  serverName?: string // 跟踪工具来源的服务器
}

// MCP服务器返回的原始工具类型
interface MCPServerTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

// MCP工具调用结果
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
    uri?: string
  }>
  isError?: boolean
}

// MCP Client状态
export interface MCPClientState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  tools: MCPTool[]
  servers: Record<string, MCPServerConfig>
}

// Hook选项
export interface UseMCPClientOptions {
  servers?: Record<string, MCPServerConfig>
  autoConnect?: boolean
  onToolCall?: (
    toolName: string,
    args: Record<string, unknown>,
    result: MCPToolResult
  ) => void
  onError?: (error: Error) => void
}

// 获取MCP服务器URL (开发环境使用代理，生产环境直接访问)
const getMCPServerUrl = () => {
  const isDev = import.meta.env.DEV
  const baseUrl = isDev
    ? `${window.location.origin}/mcp-proxy`
    : 'https://mcp.api-inference.modelscope.net'
  return baseUrl
}

// 默认MCP服务器配置
const DEFAULT_SERVERS: Record<string, MCPServerConfig> = {
  'bing-cn-mcp-server': {
    name: 'bing-cn-mcp-server',
    type: 'sse',
    url: `${getMCPServerUrl()}/c9530a4cdf1945/sse`,
    timeout: 30000
  },
  'howtocook-mcp': {
    name: 'howtocook-mcp',
    type: 'sse',
    url: `${getMCPServerUrl()}/072d63046f474a/sse`
  }
}

export function useMCPClient(options: UseMCPClientOptions = {}) {
  // 合并服务器配置
  const servers = reactive({ ...DEFAULT_SERVERS, ...options.servers })

  // 状态管理
  const state = reactive<MCPClientState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    tools: [],
    servers
  })

  // MCP客户端实例
  const clients = ref<Record<string, Client>>({})

  // 可用工具的计算属性
  const availableTools = computed(() => {
    return state.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }))
  })

  // 连接到MCP服务器
  const connectToServer = async (serverName: string): Promise<void> => {
    const serverConfig = servers[serverName]
    if (!serverConfig) {
      throw new Error(`MCP服务器 ${serverName} 配置不存在`)
    }

    try {
      console.log(`正在连接到MCP服务器: ${serverName}`)

      let transport
      if (serverConfig.type === 'sse') {
        transport = new SSEClientTransport(new URL(serverConfig.url))
      } else {
        // 对于streamable-http，我们也使用SSE transport作为基础
        // 如果需要特殊的HTTP transport，可以在这里扩展
        transport = new SSEClientTransport(new URL(serverConfig.url))
      }

      const client = new Client(
        {
          name: 'le-agent-mcp-client',
          version: '1.0.0'
        },
        {
          capabilities: {
            tools: {},
            resources: {}
          }
        }
      )

      await client.connect(transport)
      clients.value[serverName] = client

      // 获取可用工具
      const toolsResponse = await client.listTools()
      const serverTools = toolsResponse.tools || []

      // 更新工具列表 - 保持原始工具名称，不添加server前缀
      state.tools = state.tools.filter(tool => tool.serverName !== serverName)
      state.tools.push(
        ...serverTools.map((tool: MCPServerTool) => ({
          name: tool.name, // 保持原始名称
          description: tool.description || '',
          inputSchema: tool.inputSchema || {},
          serverName: serverName // 跟踪工具来源
        }))
      )

      console.log(
        `成功连接到MCP服务器: ${serverName}，可用工具: ${serverTools.length}`
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `连接MCP服务器 ${serverName} 失败`
      console.error(`连接MCP服务器失败:`, error)
      state.error = errorMessage
      options.onError?.(
        error instanceof Error ? error : new Error(errorMessage)
      )
      throw error
    }
  }

  // 连接到所有配置的服务器
  const connectAll = async (): Promise<void> => {
    state.isConnecting = true
    state.error = null

    try {
      const connections = Object.keys(servers).map(serverName =>
        connectToServer(serverName).catch(error => {
          console.error(`连接服务器 ${serverName} 失败:`, error)
          return null
        })
      )

      await Promise.allSettled(connections)

      // 检查是否至少有一个连接成功
      const connectedCount = Object.keys(clients.value).length
      if (connectedCount > 0) {
        state.isConnected = true
        console.log(`成功连接到 ${connectedCount} 个MCP服务器`)
      } else {
        throw new Error('没有成功连接到任何MCP服务器')
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '连接MCP服务器失败'
      state.error = errorMessage
      options.onError?.(
        error instanceof Error ? error : new Error(errorMessage)
      )
    } finally {
      state.isConnecting = false
    }
  }

  // 断开连接
  const disconnect = async (): Promise<void> => {
    try {
      const disconnections = Object.values(clients.value).map(client =>
        client.close().catch(error => {
          console.error('断开MCP连接失败:', error)
        })
      )

      await Promise.allSettled(disconnections)

      clients.value = {}
      state.isConnected = false
      state.tools = []
      state.error = null

      console.log('已断开所有MCP连接')
    } catch (error) {
      console.error('断开MCP连接时发生错误:', error)
    }
  }

  // 调用工具
  const callTool = async (
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> => {
    try {
      // 根据工具名称找到对应的服务器
      const tool = state.tools.find(t => t.name === toolName)
      if (!tool || !tool.serverName) {
        throw new Error(`工具 ${toolName} 未找到或未关联服务器`)
      }

      const client = clients.value[tool.serverName]
      if (!client) {
        throw new Error(`MCP服务器 ${tool.serverName} 未连接`)
      }

      console.log(
        `调用MCP工具: ${toolName}，来自服务器: ${tool.serverName}，参数:`,
        args
      )

      const result = await client.callTool({
        name: toolName, // 直接使用原始工具名称
        arguments: args
      })

      const mcpResult: MCPToolResult = {
        content: Array.isArray(result.content) ? result.content : [],
        isError: Boolean(result.isError)
      }

      options.onToolCall?.(toolName, args, mcpResult)

      return mcpResult
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : `调用工具 ${toolName} 失败`
      console.error(`调用MCP工具失败:`, error)

      const errorResult: MCPToolResult = {
        content: [
          {
            type: 'text',
            text: errorMessage
          }
        ],
        isError: true
      }

      options.onError?.(
        error instanceof Error ? error : new Error(errorMessage)
      )
      return errorResult
    }
  }

  // 添加新的MCP服务器
  const addServer = async (
    serverName: string,
    config: MCPServerConfig
  ): Promise<void> => {
    servers[serverName] = config
    await connectToServer(serverName)
  }

  // 移除MCP服务器
  const removeServer = async (serverName: string): Promise<void> => {
    const client = clients.value[serverName]
    if (client) {
      await client.close()
      delete clients.value[serverName]
    }

    delete servers[serverName]

    // 移除该服务器的工具
    state.tools = state.tools.filter(tool => tool.serverName !== serverName)

    // 更新连接状态
    state.isConnected = Object.keys(clients.value).length > 0
  }

  // 格式化工具结果为文本
  const formatToolResult = (result: MCPToolResult): string => {
    if (result.isError) {
      return `错误: ${result.content[0]?.text || '未知错误'}`
    }

    return result.content
      .map(item => {
        if (item.type === 'text') {
          return item.text || ''
        } else if (item.type === 'image') {
          return `[图片: ${item.mimeType || 'unknown'}]`
        } else if (item.type === 'resource') {
          return `[资源: ${item.uri || 'unknown'}]`
        }
        return ''
      })
      .join('\n')
  }

  // 自动连接
  if (options.autoConnect !== false) {
    connectAll()
  }

  return {
    // 状态
    state: reactive(state),
    availableTools,

    // 方法
    connectAll,
    connectToServer,
    disconnect,
    callTool,
    addServer,
    removeServer,
    formatToolResult
  }
}
