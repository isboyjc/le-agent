'use client'

import { Button } from '@/components/ui/button'
import JsonView from '@/components/ui/json-view'
import { Separator } from '@/components/ui/separator'
import { TextShimmer } from '@/components/ui/text-shimmer'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useCopy } from '@/hooks/use-copy'
import equal from '@/lib/equal'
import { cn, safeJSONParse } from '@/lib/utils'
import type { UseChatHelpers } from '@ai-sdk/react'
import { UIMessage } from 'ai'
import {
  Check,
  ChevronDownIcon,
  ChevronRight,
  Copy,
  Loader,
  Pencil,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Wrench,
  X
} from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MessageEditor } from './message-editor'

import { AnimatePresence, motion } from 'framer-motion'
import { SelectModel } from './select-model'

import {
  ChatMentionSchema,
  ChatMessageAnnotation,
  ChatModel,
  ClientToolInvocation
} from '@/types/chat'
import { toast } from 'sonner'
import { safe } from 'ts-safe'

import { useTranslations } from 'next-intl'

import { extractMCPToolId } from '@/lib/ai/mcp/mcp-tool-id'

import { ChatMentionInputMentionItem } from './chat-mention-input'

import { Markdown } from './markdown'

type MessagePart = UIMessage['parts'][number]

type TextMessagePart = Extract<MessagePart, { type: 'text' }>
type AssistMessagePart = Extract<MessagePart, { type: 'text' }>
type ToolMessagePart = Extract<MessagePart, { type: 'tool-invocation' }>

interface UserMessagePartProps {
  part: TextMessagePart
  isLast: boolean
  message: UIMessage
  setMessages: UseChatHelpers['setMessages']
  reload: UseChatHelpers['reload']
  status: UseChatHelpers['status']
  isError?: boolean
}

interface AssistMessagePartProps {
  part: AssistMessagePart
  message: UIMessage
  showActions: boolean
  threadId?: string
  setMessages: UseChatHelpers['setMessages']
  reload: UseChatHelpers['reload']
  isError?: boolean
}

interface ToolMessagePartProps {
  part: ToolMessagePart
  messageId: string
  showActions: boolean
  isLast?: boolean
  isManualToolInvocation?: boolean
  onPoxyToolCall?: (result: ClientToolInvocation) => void
  isError?: boolean
  setMessages?: UseChatHelpers['setMessages']
}

export const UserMessagePart = memo(function UserMessagePart({
  part,
  isLast,
  status,
  message,
  setMessages,
  reload,
  isError
}: UserMessagePartProps) {
  const { copied, copy } = useCopy()
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [isDeleting, setIsDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const mentions = useMemo(() => {
    return (message.annotations ?? [])
      .flatMap(annotation => {
        return (annotation as ChatMessageAnnotation).mentions ?? []
      })
      .filter(mention => {
        return ChatMentionSchema.safeParse(mention).success
      })
  }, [message.annotations])

  const deleteMessage = useCallback(() => {
    safe(() => setIsDeleting(true))
      // .ifOk(() => deleteMessageAction(message.id))
      .ifOk(() =>
        setMessages(messages => {
          const index = messages.findIndex(m => m.id === message.id)
          if (index !== -1) {
            return messages.filter((_, i) => i !== index)
          }
          return messages
        })
      )
      .ifFail((error: any) => toast.error(error.message))
      .watch(() => setIsDeleting(false))
      .unwrap()
  }, [message.id])

  useEffect(() => {
    if (status === 'submitted' && isLast) {
      ref.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [status])

  if (mode === 'edit') {
    return (
      <div className="flex w-full flex-row items-start gap-2">
        <MessageEditor
          message={message}
          setMode={setMode}
          setMessages={setMessages}
          reload={reload}
        />
      </div>
    )
  }

  return (
    <div className="my-2 flex flex-col items-end gap-2">
      <div
        data-testid="message-content"
        className={cn(
          'flex max-w-full flex-col gap-4',
          {
            'rounded-2xl bg-accent px-4 py-3 text-accent-foreground': isLast,
            'opacity-50': isError
          },
          isError && 'border border-destructive'
        )}
      >
        <p className={cn('text-sm break-words whitespace-pre-wrap')}>
          {part.text}
        </p>
      </div>
      {isLast && mentions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {mentions.map((mention, i) => {
            return (
              <ChatMentionInputMentionItem
                key={i}
                id={JSON.stringify(mention)}
                className="mx-0"
              />
            )
          })}
        </div>
      )}
      {isLast && (
        <div className="flex w-full justify-end opacity-0 transition-opacity duration-300 group-hover/message:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="message-edit-button"
                variant="ghost"
                size="icon"
                className={cn('size-3! p-4!')}
                onClick={() => copy(part.text)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Copy</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="message-edit-button"
                variant="ghost"
                size="icon"
                className="size-3! p-4!"
                onClick={() => setMode('edit')}
              >
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                disabled={isDeleting}
                onClick={deleteMessage}
                variant="ghost"
                size="icon"
                className="size-3! p-4! hover:text-destructive"
              >
                {isDeleting ? <Loader className="animate-spin" /> : <Trash2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-destructive" side="bottom">
              Delete Message
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      <div ref={ref} className="min-w-0" />
    </div>
  )
})
UserMessagePart.displayName = 'UserMessagePart'

export const AssistMessagePart = memo(function AssistMessagePart({
  part,
  showActions,
  reload,
  message,
  setMessages,
  isError,
  threadId
}: AssistMessagePartProps) {
  const { copied, copy } = useCopy()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteMessage = useCallback(() => {
    safe(() => setIsDeleting(true))
      // .ifOk(() => deleteMessageAction(message.id))
      .ifOk(() =>
        setMessages(messages => {
          const index = messages.findIndex(m => m.id === message.id)
          if (index !== -1) {
            return messages.filter((_, i) => i !== index)
          }
          return messages
        })
      )
      .ifFail((error: any) => toast.error(error.message))
      .watch(() => setIsDeleting(false))
      .unwrap()
  }, [message.id])

  const handleModelChange = (model: ChatModel) => {
    safe(() => setIsLoading(true))
      // .ifOk(() =>
      //   threadId
      //     ? deleteMessagesByChatIdAfterTimestampAction(message.id)
      //     : Promise.resolve()
      // )
      .ifOk(() =>
        setMessages(messages => {
          const index = messages.findIndex(m => m.id === message.id)
          if (index !== -1) {
            return [...messages.slice(0, index)]
          }
          return messages
        })
      )
      .ifOk(() =>
        reload({
          body: {
            model,
            action: 'update-assistant',
            id: threadId
          }
        })
      )
      .ifFail((error: any) => toast.error(error.message))
      .watch(() => setIsLoading(false))
      .unwrap()
  }

  return (
    <div
      className={cn(isLoading && 'animate-pulse', 'group flex flex-col gap-2')}
    >
      <div
        data-testid="message-content"
        className={cn('flex flex-col gap-4 px-2', {
          'rounded-lg border border-destructive bg-card opacity-50': isError
        })}
      >
        <Markdown>{part.text}</Markdown>
      </div>
      {showActions && (
        <div className="flex w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-testid="message-edit-button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-3! p-4! opacity-0 group-hover/message:opacity-100'
                )}
                onClick={() => copy(part.text)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <SelectModel onSelect={handleModelChange}>
                  <Button
                    data-testid="message-edit-button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'size-3! p-4! opacity-0 group-hover/message:opacity-100'
                    )}
                  >
                    {<RefreshCw />}
                  </Button>
                </SelectModel>
              </div>
            </TooltipTrigger>
            <TooltipContent>Change Model</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleting}
                onClick={deleteMessage}
                className="size-3! p-4! opacity-0 group-hover/message:opacity-100 hover:text-destructive"
              >
                {isDeleting ? <Loader className="animate-spin" /> : <Trash2 />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-destructive" side="bottom">
              Delete Message
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
})
AssistMessagePart.displayName = 'AssistMessagePart'

export const ToolMessagePart = memo(
  ({
    part,
    isLast,
    showActions,
    onPoxyToolCall,
    isError,
    messageId,
    setMessages,
    isManualToolInvocation
  }: ToolMessagePartProps) => {
    const t = useTranslations()
    const { toolInvocation } = part
    const { toolName, toolCallId, state, args } = toolInvocation
    const [expanded, setExpanded] = useState(false)
    const { copied: copiedInput, copy: copyInput } = useCopy()
    const { copied: copiedOutput, copy: copyOutput } = useCopy()
    const [isDeleting, setIsDeleting] = useState(false)

    const deleteMessage = useCallback(() => {
      safe(() => setIsDeleting(true))
        // .ifOk(() => deleteMessageAction(messageId))
        .ifOk(() =>
          setMessages?.(messages => {
            const index = messages.findIndex(m => m.id === messageId)
            if (index !== -1) {
              return messages.filter((_, i) => i !== index)
            }
            return messages
          })
        )
        .ifFail((error: any) => toast.error(error.message))
        .watch(() => setIsDeleting(false))
        .unwrap()
    }, [messageId, setMessages])

    const result = useMemo(() => {
      if (state === 'result') {
        return toolInvocation.result?.content
          ? {
              ...toolInvocation.result,
              content: toolInvocation.result.content.map((node: any) => {
                if (node.type === 'text') {
                  const parsed = safeJSONParse(node.text)
                  return {
                    ...node,
                    text: parsed.success ? parsed.value : node.text
                  }
                }
                return node
              })
            }
          : toolInvocation.result
      }
      return null
    }, [toolInvocation, onPoxyToolCall])

    const { serverName: mcpServerName, toolName: mcpToolName } = useMemo(() => {
      return extractMCPToolId(toolName)
    }, [toolName])

    const isExpanded = useMemo(() => {
      return expanded || result === null
    }, [expanded, result])

    const isExecuting = useMemo(() => {
      return state !== 'result' && (isLast || !!onPoxyToolCall)
    }, [result, state, isLast, !!onPoxyToolCall])

    return (
      <div key={toolCallId} className="group w-full">
        <div className="flex animate-in flex-col duration-300 fade-in">
          <div
            className="group/title flex cursor-pointer items-center gap-2"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="rounded bg-input/40 p-1.5 text-primary">
              {isExecuting ? (
                <Loader className="size-3.5 animate-spin" />
              ) : isError ? (
                <TriangleAlert className="size-3.5 text-destructive" />
              ) : (
                <Wrench className="size-3.5" />
              )}
            </div>
            <span className="flex items-center gap-2 font-bold">
              {isExecuting ? (
                <TextShimmer>{mcpServerName}</TextShimmer>
              ) : (
                mcpServerName
              )}
            </span>
            {mcpToolName && (
              <>
                <ChevronRight className="size-3.5" />
                <span className="text-muted-foreground transition-colors duration-300 group-hover/title:text-primary">
                  {mcpToolName}
                </span>
              </>
            )}
            <div className="ml-auto rounded p-1.5 transition-colors duration-300 group-hover/title:bg-input">
              <ChevronDownIcon
                className={cn(isExpanded && 'rotate-180', 'size-3.5')}
              />
            </div>
          </div>
          <div className="flex gap-2 py-2">
            <div className="flex w-7 justify-center">
              <Separator
                orientation="vertical"
                className="h-full bg-gradient-to-t from-transparent to-border to-5%"
              />
            </div>
            <div className="flex w-full flex-col gap-2">
              <div
                className={cn(
                  'fade-300 w-full min-w-0 rounded-lg border bg-card p-4 px-4 text-xs transition-colors',
                  !isExpanded && 'cursor-pointer hover:bg-secondary'
                )}
                onClick={() => {
                  if (!isExpanded) {
                    setExpanded(true)
                  }
                }}
              >
                <div className="flex items-center">
                  <h5 className="font-medium text-muted-foreground transition-colors select-none">
                    Request
                  </h5>
                  <div className="flex-1" />
                  {copiedInput ? (
                    <Check className="size-3" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-3 text-muted-foreground"
                      onClick={() =>
                        copyInput(JSON.stringify(toolInvocation.args))
                      }
                    >
                      <Copy />
                    </Button>
                  )}
                </div>
                {isExpanded && (
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    <JsonView data={toolInvocation.args} />
                  </div>
                )}
              </div>
              {!result ? null : (
                <div
                  className={cn(
                    'fade-300 mt-2 w-full min-w-0 rounded-lg border bg-card p-4 px-4 text-xs transition-colors',
                    !isExpanded && 'cursor-pointer hover:bg-secondary'
                  )}
                  onClick={() => {
                    if (!isExpanded) {
                      setExpanded(true)
                    }
                  }}
                >
                  <div className="flex items-center">
                    <h5 className="font-medium text-muted-foreground select-none">
                      Response
                    </h5>
                    <div className="flex-1" />
                    {copiedOutput ? (
                      <Check className="size-3" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-3 text-muted-foreground"
                        onClick={() => copyOutput(JSON.stringify(result))}
                      >
                        <Copy />
                      </Button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      <JsonView data={result} />
                    </div>
                  )}
                </div>
              )}

              {onPoxyToolCall && isManualToolInvocation && (
                <div className="mt-2 flex flex-row items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full text-xs hover:ring"
                    onClick={() =>
                      onPoxyToolCall({ action: 'manual', result: true })
                    }
                  >
                    <Check />
                    {t('Common.approve')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs"
                    onClick={() =>
                      onPoxyToolCall({ action: 'manual', result: false })
                    }
                  >
                    <X />
                    {t('Common.reject')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex flex-row items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={isDeleting}
                    onClick={deleteMessage}
                    variant="ghost"
                    size="icon"
                    className="size-3! p-4! opacity-0 group-hover/message:opacity-100 hover:text-destructive"
                  >
                    {isDeleting ? (
                      <Loader className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-destructive" side="bottom">
                  Delete Message
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    )
  },
  (prev, next) => {
    if (prev.isError !== next.isError) return false
    if (prev.isLast !== next.isLast) return false
    if (prev.showActions !== next.showActions) return false
    if (!!prev.onPoxyToolCall !== !!next.onPoxyToolCall) return false
    if (prev.isManualToolInvocation !== next.isManualToolInvocation)
      return false
    if (prev.messageId !== next.messageId) return false
    if (!equal(prev.part.toolInvocation, next.part.toolInvocation)) return false
    return true
  }
)

ToolMessagePart.displayName = 'ToolMessagePart'

export const ReasoningPart = memo(function ReasoningPart({
  reasoning
}: {
  reasoning: string
  isThinking?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const variants = {
    collapsed: {
      height: 0,
      opacity: 0,
      marginTop: 0,
      marginBottom: 0
    },
    expanded: {
      height: 'auto',
      opacity: 1,
      marginTop: '1rem',
      marginBottom: '0.5rem'
    }
  }

  return (
    <div
      className="flex cursor-pointer flex-col"
      onClick={() => {
        setIsExpanded(!isExpanded)
      }}
    >
      <div className="flex flex-row items-center gap-2 text-ring transition-colors hover:text-primary">
        <div className="font-medium">Reasoned for a few seconds</div>
        <button
          data-testid="message-reasoning-toggle"
          type="button"
          className="cursor-pointer"
        >
          <ChevronDownIcon size={16} />
        </button>
      </div>

      <div className="pl-4">
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              data-testid="message-reasoning"
              key="content"
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={variants}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
              className="flex flex-col gap-4 border-l pl-6 text-muted-foreground"
            >
              <Markdown>{reasoning}</Markdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})
ReasoningPart.displayName = 'ReasoningPart'
