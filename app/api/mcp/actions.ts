'use server'
import { mcpClientsManager } from '@/lib/ai/mcp/mcp-manager'
import { errorToString, safeJSONParse } from '@/lib/utils'
import { Safe, safe } from 'ts-safe'

export async function selectMcpClientsAction() {
  const list = await mcpClientsManager.getClients()
  return list.map(({ client, id }) => {
    return {
      ...client.getInfo(),
      id
    }
  })
}

function safeCallToolResult(chain: Safe<any>) {
  return chain
    .map(res => {
      if (res?.content && Array.isArray(res.content)) {
        const parsedResult = {
          ...res,
          content: res.content.map((c: any) => {
            if (c?.type === 'text' && c?.text) {
              const parsed = safeJSONParse(c.text)
              return {
                type: 'text',
                text: parsed.success ? parsed.value : c.text
              }
            }
            return c
          })
        }
        return parsedResult
      }

      return res
    })
    .ifFail(err => {
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

export async function callMcpToolAction(
  id: string,
  toolName: string,
  input?: unknown
) {
  const chain = safe(async () => {
    const client = await mcpClientsManager.getClient(id)
    if (!client) {
      throw new Error('Client not found')
    }
    return client.client.callTool(toolName, input)
  })
  return safeCallToolResult(chain)
}
