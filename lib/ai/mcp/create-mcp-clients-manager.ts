/**
 * MCP（Model Context Protocol）客户端管理器
 * 用于管理多个 MCP 客户端实例的生命周期和存储
 */

import { Locker } from '@/lib/utils'
import type {
  MCPServerConfig,
  McpServerInsert,
  McpServerSelect,
  VercelAIMcpTool
} from '@/types/mcp'
import { safe } from 'ts-safe'
import { createMCPClient, type MCPClient } from './create-mcp-client'
import { createMCPToolId } from './mcp-tool-id'

/**
 * MCP 服务器配置存储接口
 * 实现此接口的类应该处理服务器配置的持久化存储
 *
 * 重要注意事项：
 * - 存储可能会被外部修改（例如，手动编辑文件）
 * - 可能出现来自多个进程的并发修改
 * - 实现应该处理这些场景或记录限制
 */
export interface MCPConfigStorage {
  /** 初始化存储 */
  init(manager: MCPClientsManager): Promise<void>
  /** 加载所有服务器配置 */
  loadAll(): Promise<McpServerSelect[]>
  /** 保存服务器配置 */
  save(server: McpServerInsert): Promise<McpServerSelect>
  /** 删除服务器配置 */
  delete(id: string): Promise<void>
  /** 检查是否存在指定的服务器配置 */
  has(id: string): Promise<boolean>
  /** 获取指定的服务器配置 */
  get(id: string): Promise<McpServerSelect | null>
}

/**
 * MCP 客户端管理器类
 * 负责管理多个 MCP 客户端实例的生命周期
 */
export class MCPClientsManager {
  /** 客户端映射表，存储客户端实例和相关信息 */
  protected clients = new Map<
    string,
    {
      client: MCPClient
      name: string
    }
  >()
  /** 初始化锁，防止重复初始化 */
  private initializedLock = new Locker()

  /**
   * 构造函数
   * @param storage 可选的持久化存储实现
   * @param autoDisconnectSeconds 自动断开连接时间（秒）
   */
  constructor(
    private storage?: MCPConfigStorage,
    private autoDisconnectSeconds: number = 60 * 30 // 30 分钟
  ) {
    // 监听进程退出信号，确保清理资源
    process.on('SIGINT', this.cleanup.bind(this))
    process.on('SIGTERM', this.cleanup.bind(this))
  }

  /**
   * 初始化管理器
   * 加载存储中的所有客户端配置并创建连接
   */
  async init() {
    return safe(() => this.initializedLock.lock())
      .ifOk(() => this.cleanup())
      .ifOk(async () => {
        if (this.storage) {
          await this.storage.init(this)
          const configs = await this.storage.loadAll()
          await Promise.all(
            configs.map(({ id, name, config }) =>
              this.addClient(id, name, config)
            )
          )
        }
      })
      .watch(() => this.initializedLock.unlock())
      .unwrap()
  }

  /**
   * 获取所有客户端的工具列表
   * @returns 扁平化的工具对象，键为工具ID，值为工具实例
   */
  tools(): Record<string, VercelAIMcpTool> {
    return Object.fromEntries(
      Array.from(this.clients.entries())
        .filter(([_, { client }]) => client.getInfo().toolInfo.length > 0)
        .flatMap(([id, { client }]) =>
          Object.entries(client.tools).map(([name, tool]) => [
            createMCPToolId(client.getInfo().name, name),
            {
              ...tool,
              _originToolName: name,
              __$ref__: 'mcp',
              _mcpServerName: client.getInfo().name,
              _mcpServerId: id
            }
          ])
        )
    )
  }
  /**
   * 创建并添加新的客户端实例到内存（不持久化存储）
   * @param id 客户端ID
   * @param name 客户端名称
   * @param serverConfig 服务器配置
   */
  async addClient(id: string, name: string, serverConfig: MCPServerConfig) {
    // 如果客户端已存在，先断开旧的连接
    if (this.clients.has(id)) {
      const prevClient = this.clients.get(id)!
      void prevClient.client.disconnect()
    }
    // 创建新的客户端实例
    const client = createMCPClient(name, serverConfig, {
      autoDisconnectSeconds: this.autoDisconnectSeconds
    })
    this.clients.set(id, { client, name })
    return client.connect()
  }

  /**
   * 持久化新的客户端配置到存储并添加客户端实例到内存
   * @param server 服务器配置对象
   */
  async persistClient(server: McpServerInsert) {
    let id = server.name
    if (this.storage) {
      const entity = await this.storage.save(server)
      id = entity.id
    }
    return this.addClient(id, server.name, server.config)
  }

  /**
   * 根据ID移除客户端，释放资源并从存储中删除
   * @param id 客户端ID
   */
  async removeClient(id: string) {
    // 如果有存储，先从存储中删除
    if (this.storage) {
      if (await this.storage.has(id)) {
        await this.storage.delete(id)
      }
    }
    // 从内存中获取并移除客户端
    const client = this.clients.get(id)
    this.clients.delete(id)
    if (client) {
      void client.client.disconnect()
    }
  }

  /**
   * 刷新现有客户端，使用新配置或其现有配置
   * @param id 客户端ID
   */
  async refreshClient(id: string) {
    const prevClient = this.clients.get(id)
    if (!prevClient) {
      throw new Error(`Client ${id} not found`)
    }
    const currentConfig = prevClient.client.getInfo().config
    // 如果有存储，从存储中获取最新配置
    if (this.storage) {
      const server = await this.storage.get(id)
      if (!server) {
        throw new Error(`Client ${id} not found`)
      }
      return this.addClient(id, server.name, server.config)
    }
    // 否则使用当前配置重新创建客户端
    return this.addClient(id, prevClient.name, currentConfig)
  }

  /**
   * 清理所有客户端资源
   * 断开所有连接并清空客户端映射表
   */
  async cleanup() {
    const clients = Array.from(this.clients.values())
    this.clients.clear()
    await Promise.allSettled(clients.map(({ client }) => client.disconnect()))
  }

  /**
   * 获取所有客户端列表
   * @returns 包含客户端ID和实例的数组
   */
  async getClients() {
    await this.initializedLock.wait()
    return Array.from(this.clients.entries()).map(([id, { client }]) => ({
      id,
      client: client
    }))
  }

  /**
   * 根据ID获取特定客户端
   * @param id 客户端ID
   * @returns 客户端实例或undefined
   */
  async getClient(id: string) {
    await this.initializedLock.wait()
    return this.clients.get(id)
  }
}

/**
 * 创建 MCP 客户端管理器的工厂函数
 * @param storage 可选的持久化存储实现
 * @param autoDisconnectSeconds 自动断开连接时间（秒）
 * @returns MCP 客户端管理器实例
 */
export function createMCPClientsManager(
  storage?: MCPConfigStorage,
  autoDisconnectSeconds: number = 60 * 30 // 30 分钟
): MCPClientsManager {
  return new MCPClientsManager(storage, autoDisconnectSeconds)
}
