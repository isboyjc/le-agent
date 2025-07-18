'use client'

import { appStore } from '@/app/store'
import { useToRef } from '@/hooks/use-latest'
import { cn, generateUUID, truncateString } from '@/lib/utils'
import { ChatApiSchemaRequestBody, ClientToolInvocation } from '@/types/chat'
import { useChat } from '@ai-sdk/react'
import { UIMessage } from 'ai'
import clsx from 'clsx'
import { ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { safe } from 'ts-safe'
import { useShallow } from 'zustand/react/shallow'
import { ChatGreeting } from './chat-greeting'
import { ChatInput } from './chat-input'
import { ErrorMessage, PreviewMessage } from './messages'

type Props = {
  threadId: string
  initialMessages: Array<UIMessage>
  slots?: {
    emptySlot?: ReactNode
    inputBottomSlot?: ReactNode
  }
}

export function ChatBox({ threadId, initialMessages, slots }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [model, toolChoice, threadList, appStoreMutate] = appStore(
    useShallow(state => [
      state.chatModel,
      state.toolChoice,
      state.threadList,
      state.mutate
    ])
  )

  // Chat Hooks
  const {
    messages,
    input,
    setInput,
    append,
    status,
    reload,
    setMessages,
    addToolResult,
    error,
    stop
  } = useChat({
    id: threadId,
    api: '/api/chat',
    initialMessages,
    experimental_prepareRequestBody: ({ messages }) => {
      console.log('messages', messages)
      // window.history.replaceState({}, '', `/chat/${threadId}`)
      const lastMessage = messages.at(-1)!
      vercelAISdkV4ToolInvocationIssueCatcher(lastMessage)
      const request: ChatApiSchemaRequestBody = {
        id: latestRef.current.threadId,
        chatModel: latestRef.current.model,
        toolChoice: latestRef.current.toolChoice,
        message: lastMessage
      }
      return request
    },
    sendExtraMessageFields: true,
    generateId: generateUUID,
    experimental_throttle: 100,
    onFinish() {
      if (threadList[0]?.id !== threadId) {
        mutate('threads')
      }
    },
    onError: error => {
      console.error(error)

      toast.error(
        truncateString(error.message, 100) ||
          'An error occured, please try again!'
      )
    }
  })
  console.log(messages, input)

  // 最新引用
  const latestRef = useToRef({
    toolChoice,
    model,
    messages,
    threadId
  })

  // 判断是否正在加载
  const isLoading = useMemo(
    () => status === 'streaming' || status === 'submitted',
    [status]
  )

  const isInitialThreadEntry = useMemo(
    () =>
      initialMessages.length > 0 &&
      initialMessages.at(-1)?.id === messages.at(-1)?.id,
    [initialMessages, messages]
  )

  const needSpaceClass = useCallback(
    (index: number) => {
      if (error || isInitialThreadEntry || index != messages.length - 1)
        return false
      const message = messages[index]
      if (message.role === 'user') return false
      return true
    },
    [messages, error]
  )

  const [isExecutingProxyToolCall, setIsExecutingProxyToolCall] =
    useState(false)

  // 判断是否正在等待工具调用结果
  const isPendingToolCall = useMemo(() => {
    if (status != 'ready') return false
    const lastMessage = messages.at(-1)
    if (lastMessage?.role != 'assistant') return false
    const lastPart = lastMessage.parts.at(-1)
    if (!lastPart) return false
    if (lastPart.type != 'tool-invocation') return false
    if (lastPart.toolInvocation.state == 'result') return false
    return true
  }, [status, messages])

  const proxyToolCall = useCallback(
    (result: ClientToolInvocation) => {
      setIsExecutingProxyToolCall(true)
      return safe(async () => {
        const lastMessage = messages.at(-1)!
        const lastPart = lastMessage.parts.at(-1)! as Extract<
          UIMessage['parts'][number],
          { type: 'tool-invocation' }
        >
        return addToolResult({
          toolCallId: lastPart.toolInvocation.toolCallId,
          result
        })
      })
        .watch(() => setIsExecutingProxyToolCall(false))
        .unwrap()
    },
    [addToolResult]
  )

  return (
    <div
      className={cn(
        messages.length === 0 && 'justify-center pb-24',
        'relative flex h-full min-w-0 flex-col'
      )}
    >
      {messages.length === 0 ? (
        slots?.emptySlot ? (
          slots.emptySlot
        ) : (
          <ChatGreeting onAppend={append} />
        )
      ) : (
        <div
          className={'box-border flex flex-col gap-2 overflow-y-auto py-6'}
          ref={containerRef}
        >
          {messages.map((message, index) => {
            const isLastMessage = messages.length - 1 === index
            return (
              <PreviewMessage
                threadId={threadId}
                messageIndex={index}
                key={index}
                message={message}
                status={status}
                onPoxyToolCall={
                  isPendingToolCall &&
                  !isExecutingProxyToolCall &&
                  isLastMessage
                    ? proxyToolCall
                    : undefined
                }
                isLoading={isLoading || isPendingToolCall}
                isError={!!error && isLastMessage}
                isLastMessage={isLastMessage}
                setMessages={setMessages}
                reload={reload}
                className={needSpaceClass(index) ? 'min-h-[55dvh]' : ''}
              />
            )
          })}
          {status === 'submitted' && messages.at(-1)?.role === 'user' && (
            <div className="min-h-[calc(55dvh-56px)]" />
          )}
          {error && <ErrorMessage error={error} />}
          <div className="min-h-52 min-w-0" />
        </div>
      )}
      <div className={clsx(messages.length && 'absolute bottom-14', 'w-full')}>
        <ChatInput
          input={input}
          append={append}
          setInput={setInput}
          isLoading={isLoading || isPendingToolCall}
          onStop={stop}
        />
        {slots?.inputBottomSlot}
      </div>
    </div>
  )
}

// This is a workaround for a bug in the Vercel AI SDK v4.
// It is used to catch tool invocation issues and add them to the message.
// https://github.com/vercel/ai/issues/1000
function vercelAISdkV4ToolInvocationIssueCatcher(message: UIMessage) {
  if (message.role != 'assistant') return
  const lastPart = message.parts.at(-1)
  if (lastPart?.type != 'tool-invocation') return
  if (!message.toolInvocations)
    message.toolInvocations = [lastPart.toolInvocation]
}
