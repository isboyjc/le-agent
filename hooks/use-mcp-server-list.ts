'use client'
import { selectMcpClientsAction } from '@/app/api/mcp/actions'
import { appStore } from '@/app/store'
import { handleErrorWithToast } from '@/components/ui/toasts'
import useSWR, { SWRConfiguration } from 'swr'

export function useMcpServerList(options?: SWRConfiguration) {
  return useSWR('mcp-server-list', selectMcpClientsAction, {
    revalidateOnFocus: false,
    errorRetryCount: 0,
    focusThrottleInterval: 1000 * 60 * 5,
    fallbackData: [],
    onError: handleErrorWithToast,
    onSuccess: data => {
      appStore.setState({ mcpServerList: data })
    },
    ...options
  })
}
