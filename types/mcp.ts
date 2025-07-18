import { Tool } from 'ai'
import { z } from 'zod'

/**
 * MCP Server 远程配置（SSE、StreamableHttp）
 */
export const MCPRemoteConfigZodSchema = z.object({
  url: z.string().url().describe('The URL of the SSE endpoint'),
  headers: z.record(z.string(), z.string()).optional()
})

/**
 * MCP Server Stdio模式配置
 */
export const MCPStdioConfigZodSchema = z.object({
  command: z.string().min(1).describe('The command to run'),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional()
})

/**
 * MCP Server 允许的工具列表
 */
export const AllowedMCPServerZodSchema = z.object({
  tools: z.array(z.string())
  // resources: z.array(z.string()).optional(),
})

export type AllowedMCPServer = z.infer<typeof AllowedMCPServerZodSchema>
export type MCPRemoteConfig = z.infer<typeof MCPRemoteConfigZodSchema>
export type MCPStdioConfig = z.infer<typeof MCPStdioConfigZodSchema>
export type MCPServerConfig = MCPRemoteConfig | MCPStdioConfig

/**
 * MCP Server 详情
 */
export type MCPServerInfo = {
  name: string
  config: MCPServerConfig
  error?: unknown
  status: 'connected' | 'disconnected' | 'loading'
  toolInfo: MCPToolInfo[]
}

export type McpServerInsert = {
  name: string
  config: MCPServerConfig
  id?: string
}
export type McpServerSelect = {
  name: string
  config: MCPServerConfig
  id: string
}

export type VercelAIMcpTool = Tool & {
  _mcpServerName: string
  _mcpServerId: string
  _originToolName: string
  __$ref__: 'mcp'
}

/**
 * MCP Server Tool 详情
 */
export type MCPToolInfo = {
  name: string
  description: string
  inputSchema?: {
    type?: any
    properties?: Record<string, any>
    required?: string[]
  }
}

export type McpServerCustomizationsPrompt = {
  name: string
  id: string
  prompt?: string
  tools?: {
    [toolName: string]: string
  }
}
