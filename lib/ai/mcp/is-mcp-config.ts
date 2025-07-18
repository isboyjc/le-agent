import type {
  MCPRemoteConfig,
  MCPServerConfig,
  MCPStdioConfig
} from '@/types/mcp'

/**
 * 类型防护，用于检查对象是否可能是有效的 stdio 配置
 */
export function isMaybeStdioConfig(config: unknown): config is MCPStdioConfig {
  if (typeof config !== 'object' || config === null) {
    return false
  }
  return 'command' in config && typeof config.command === 'string'
}

/**
 * 键入守卫要检查对象是否可能是有效的远程配置（SSE，流）
 */
export function isMaybeRemoteConfig(
  config: unknown
): config is MCPRemoteConfig {
  if (typeof config !== 'object' || config === null) {
    return false
  }
  return 'url' in config && typeof config.url === 'string'
}

/**
 * MCP 服务器配置的类型保护（stdio 或远程）
 */
export function isMaybeMCPServerConfig(
  config: unknown
): config is MCPServerConfig {
  return isMaybeStdioConfig(config) || isMaybeRemoteConfig(config)
}
