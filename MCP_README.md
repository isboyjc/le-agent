# MCP Client 集成使用指南

## 概述

本项目已成功集成了 MCP (Model Context Protocol) Client，允许AI助手调用外部工具来增强功能。

## 功能特性

### 1. 自动工具集成

- 自动连接到配置的MCP服务器
- 实时获取可用工具列表
- 在AI对话中自动传递工具信息

### 2. 支持的连接方式

- **SSE (Server-Sent Events)**: 实时双向通信
- **StreamableHTTP**: HTTP流式传输

### 3. 默认集成的工具

- **搜索工具**: 通过Bing搜索获取实时信息
- 服务器地址: `https://mcp.api-inference.modelscope.net/c9530a4cdf1945/sse`

## 使用方法

### 1. 基本用法

在聊天中，AI助手会自动判断何时需要使用工具：

```
用户: 今天北京的天气如何？
AI助手: [自动调用搜索工具获取实时天气信息]
```

### 2. 状态监控

界面左上角显示MCP连接状态：

- ✅ **已连接**: 显示可用工具数量
- ⏳ **连接中**: 正在建立连接
- ❌ **错误**: 显示错误信息

### 3. 工具调用流程

1. 用户发送消息
2. AI分析是否需要使用工具
3. 如果需要，AI请求调用相应工具
4. MCP Client执行工具调用
5. 将结果返回给AI
6. AI基于结果生成最终回复

## 配置选项

### 添加新的MCP服务器

在 `src/hooks/useMCPClient.ts` 中修改 `DEFAULT_SERVERS` 配置：

```typescript
const DEFAULT_SERVERS: Record<string, MCPServerConfig> = {
  'your-server-name': {
    name: 'your-server-name',
    type: 'sse', // 或 'streamable-http'
    url: 'https://your-mcp-server.com/sse',
    timeout: 30000
  }
}
```

### 自定义工具处理

在 `useChat` Hook中可以自定义工具调用的处理逻辑：

```typescript
const mcpClient = useMCPClient({
  onToolCall: (toolName, args, result) => {
    console.log('工具调用:', toolName, args, result)
    // 自定义处理逻辑
  },
  onError: error => {
    console.error('MCP错误:', error)
    // 错误处理逻辑
  }
})
```

## 技术实现

### 核心文件

- `src/hooks/useMCPClient.ts`: MCP客户端Hook
- `src/hooks/useChat.ts`: 聊天Hook（已集成MCP）
- `src/components/MCPStatus.vue`: MCP状态显示组件

### 依赖包

- `@modelcontextprotocol/sdk`: MCP官方SDK

### 关键特性

1. **自动重连**: 连接断开时自动尝试重连
2. **错误处理**: 完善的错误处理和用户提示
3. **类型安全**: 完整的TypeScript类型定义
4. **响应式状态**: 基于Vue 3的响应式状态管理

## 示例对话

```
用户: 请搜索一下最新的Vue 3特性
AI助手: 我来为您搜索最新的Vue 3特性。

**工具调用结果:**
[搜索结果显示最新的Vue 3特性信息]

基于搜索结果，Vue 3的最新特性包括...
```

## 注意事项

1. 确保MCP服务器可访问
2. 检查网络连接状态
3. 监控控制台输出以调试问题
4. 工具调用可能需要一定时间，请耐心等待

## 故障排除

### 连接失败

- 检查MCP服务器地址是否正确
- 确认服务器是否正常运行
- 检查网络连接

### 工具调用失败

- 查看控制台错误信息
- 检查工具参数是否正确
- 确认工具权限设置

### 状态显示异常

- 刷新页面重试
- 检查浏览器控制台错误
- 确认组件是否正确加载
