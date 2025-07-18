/**
 * MCP（Model Context Protocol）客户端创建器
 * 用于连接和管理 MCP 服务器，提供工具调用功能
 */

import logger from '@/lib/logger'
import {
  createDebounce,
  errorToString,
  isNull,
  Locker,
  toAny
} from '@/lib/utils'
import {
  MCPRemoteConfigZodSchema,
  MCPStdioConfigZodSchema,
  type MCPServerConfig,
  type MCPServerInfo,
  type MCPToolInfo
} from '@/types/mcp'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { jsonSchema, Tool, tool, ToolExecutionOptions } from 'ai'
import type { ConsolaInstance } from 'consola'
import { colorize } from 'consola/utils'
import { isMaybeRemoteConfig, isMaybeStdioConfig } from './is-mcp-config'

import { IS_MCP_SERVER_REMOTE_ONLY } from '@/lib/const'
import { safe } from 'ts-safe'

/** 客户端选项配置 */
type ClientOptions = {
  /** 自动断开连接的秒数（可选） */
  autoDisconnectSeconds?: number
}

/**
 * MCP（Model Context Protocol）客户端类
 * 用于连接和管理 MCP 服务器连接，提供工具调用功能
 */
export class MCPClient {
  /** MCP 客户端实例 */
  private client?: Client
  /** 连接错误信息 */
  private error?: unknown
  /** 是否已连接 */
  private isConnected = false
  /** 日志记录器 */
  private log: ConsolaInstance
  /** 锁定器，用于防止并发连接 */
  private locker = new Locker()
  /** 服务器可用工具信息 */
  toolInfo: MCPToolInfo[] = []
  /** 可用于 AI 函数的工具实例 */
  tools: { [key: string]: Tool } = {}

  /**
   * 构造函数
   * @param name 服务器名称
   * @param serverConfig 服务器配置
   * @param options 客户端选项
   * @param disconnectDebounce 断开连接防抖函数
   */
  constructor(
    private name: string,
    private serverConfig: MCPServerConfig,
    private options: ClientOptions = {},
    private disconnectDebounce = createDebounce()
  ) {
    // 初始化日志记录器，带有颜色标识
    this.log = logger.withDefaults({
      message: colorize('cyan', `MCP Client ${this.name}: `)
    })
  }

  /**
   * 获取服务器信息
   * @returns 服务器信息对象
   */
  getInfo(): MCPServerInfo {
    return {
      name: this.name,
      config: this.serverConfig,
      status: this.locker.isLocked
        ? 'loading'
        : this.isConnected
          ? 'connected'
          : 'disconnected',
      error: this.error,
      toolInfo: this.toolInfo
    }
  }

  /**
   * 安排自动断开连接
   * 如果设置了自动断开时间，则在指定时间后断开连接
   */
  private scheduleAutoDisconnect() {
    if (this.options.autoDisconnectSeconds) {
      this.disconnectDebounce(() => {
        this.disconnect()
      }, this.options.autoDisconnectSeconds * 1000)
    }
  }

  /**
   * 连接到 MCP 服务器
   * 不会抛出错误，错误信息会保存在 error 属性中
   * @returns 客户端实例
   */
  async connect() {
    // 如果正在连接中，等待完成
    if (this.locker.isLocked) {
      await this.locker.wait()
      return this.client
    }
    // 如果已连接，直接返回客户端
    if (this.isConnected) {
      return this.client
    }
    try {
      const startedAt = Date.now()
      this.locker.lock()

      // 创建 MCP 客户端实例
      const client = new Client({
        name: this.name,
        version: '0.1.0'
      })

      // 根据服务器配置类型创建相应的传输方式
      if (isMaybeStdioConfig(this.serverConfig)) {
        // 跳过 stdio 传输（如果是仅远程模式）
        if (IS_MCP_SERVER_REMOTE_ONLY) {
          throw new Error('Stdio transport is not supported')
        }

        const config = MCPStdioConfigZodSchema.parse(this.serverConfig)
        const transport = new StdioClientTransport({
          command: config.command,
          args: config.args,
          // 合并 process.env 和 config.env，确保保留 PATH 并过滤掉 undefined 值
          env: Object.entries({ ...process.env, ...config.env }).reduce(
            (acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value
              }
              return acc
            },
            {} as Record<string, string>
          ),
          cwd: process.cwd()
        })

        await client.connect(transport)
      } else if (isMaybeRemoteConfig(this.serverConfig)) {
        const config = MCPRemoteConfigZodSchema.parse(this.serverConfig)
        const abortController = new AbortController()
        const url = new URL(config.url)
        try {
          // 尝试使用流式 HTTP 传输
          const transport = new StreamableHTTPClientTransport(url, {
            requestInit: {
              headers: config.headers,
              signal: abortController.signal
            }
          })
          await client.connect(transport)
        } catch (streamableHttpError) {
          this.log.error(streamableHttpError)
          this.log.warn(
            'Streamable HTTP connection failed, falling back to SSE transport'
          )
          // 如果流式 HTTP 失败，回退到 SSE 传输
          const transport = new SSEClientTransport(url, {
            requestInit: {
              headers: config.headers,
              signal: abortController.signal
            }
          })
          await client.connect(transport)
        }
      } else {
        throw new Error('Invalid server config')
      }

      this.log.info(
        `Connected to MCP server in ${((Date.now() - startedAt) / 1000).toFixed(2)}s`
      )
      this.isConnected = true
      this.error = undefined
      this.client = client

      // 获取服务器可用工具列表
      const toolResponse = await client.listTools()
      this.toolInfo = toolResponse.tools.map(
        tool =>
          ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }) as MCPToolInfo
      )

      // 为每个 MCP 工具创建 AI SDK 工具包装器
      this.tools = toolResponse.tools.reduce(
        (prev, _tool) => {
          // 创建工具参数的 JSON Schema
          const parameters = jsonSchema(
            toAny({
              ..._tool.inputSchema,
              properties: _tool.inputSchema.properties ?? {},
              additionalProperties: false
            })
          )
          // 包装 MCP 工具为 AI SDK 工具
          prev[_tool.name] = tool({
            parameters,
            description: _tool.description,
            execute: (params, options: ToolExecutionOptions) => {
              options?.abortSignal?.throwIfAborted()
              return this.callTool(_tool.name, params)
            }
          })
          return prev
        },
        {} as { [key: string]: Tool }
      )
      this.scheduleAutoDisconnect()
    } catch (error) {
      this.log.error(error)
      this.isConnected = false
      this.error = error
    }

    this.locker.unlock()
    return this.client
  }
  /**
   * 断开与 MCP 服务器的连接
   */
  async disconnect() {
    this.log.info('Disconnecting from MCP server')
    await this.locker.wait()
    this.isConnected = false
    const client = this.client
    this.client = undefined
    await client?.close().catch(e => this.log.error(e))
  }

  /**
   * 调用 MCP 工具
   * @param toolName 工具名称
   * @param input 输入参数
   * @returns 工具调用结果
   */
  async callTool(toolName: string, input?: unknown) {
    return safe(() => this.log.info('tool call', toolName))
      .ifOk(() => {
        // 检查服务器是否处于错误状态
        if (this.error) {
          throw new Error(
            'MCP Server is currently in an error state. Please check the configuration and try refreshing the server.'
          )
        }
      })
      .ifOk(() => this.scheduleAutoDisconnect()) // 如果设置了自动断开，则安排断开连接
      .map(async () => {
        // 确保客户端已连接
        const client = await this.connect()
        return client?.callTool({
          name: toolName,
          arguments: input as Record<string, unknown>
        })
      })
      .ifOk(v => {
        // 检查结果是否为空
        if (isNull(v)) {
          throw new Error('Tool call failed with null')
        }
        return v
      })
      .ifOk(() => this.scheduleAutoDisconnect())
      .watch(status => {
        // 记录工具调用状态
        if (!status.isOk) {
          this.log.error('Tool call failed', toolName, status.error)
        } else if (status.value?.isError) {
          this.log.error('Tool call failed', toolName, status.value.content)
        }
      })
      .ifFail(err => {
        // 返回错误响应
        return {
          isError: true,
          error: {
            message: errorToString(err),
            name: err?.name || 'ERROR'
          },
          content: []
        }
      })
      .unwrap()
  }
}

/**
 * 创建 MCP 客户端的工厂函数
 * @param name 服务器名称
 * @param serverConfig 服务器配置
 * @param options 客户端选项
 * @returns MCP 客户端实例
 */
export const createMCPClient = (
  name: string,
  serverConfig: MCPServerConfig,
  options: ClientOptions = {}
): MCPClient => new MCPClient(name, serverConfig, options)
