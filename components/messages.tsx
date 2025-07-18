import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import equal from '@/lib/equal'
import { cn, truncateString } from '@/lib/utils'
import { ChatMessageAnnotation, ClientToolInvocation } from '@/types/chat'
import type { UseChatHelpers } from '@ai-sdk/react'
import { UIMessage } from 'ai'
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { memo, useMemo, useState } from 'react'
import {
  AssistMessagePart,
  ReasoningPart,
  ToolMessagePart,
  UserMessagePart
} from './message-parts'
import { Think } from './think'

interface Props {
  message: UIMessage
  threadId?: string
  isLoading: boolean
  isLastMessage: boolean
  setMessages: UseChatHelpers['setMessages']
  reload: UseChatHelpers['reload']
  className?: string
  onPoxyToolCall?: (result: ClientToolInvocation) => void
  status: UseChatHelpers['status']
  messageIndex: number
  isError?: boolean
}

const PurePreviewMessage = ({
  message,
  threadId,
  setMessages,
  isLoading,
  isLastMessage,
  reload,
  status,
  className,
  onPoxyToolCall,
  messageIndex,
  isError
}: Props) => {
  const isUserMessage = useMemo(() => message.role === 'user', [message.role])

  if (message.role == 'system') {
    return null // system message is not shown
  }
  return (
    <div className="group/message mx-auto w-full max-w-3xl px-6">
      <div
        className={cn(
          className,
          'flex w-full gap-4 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl'
        )}
      >
        <div className="flex w-full flex-col gap-4">
          {message.experimental_attachments && (
            <div
              data-testid={'message-attachments'}
              className="flex flex-row justify-end gap-2"
            >
              {message.experimental_attachments.map(attachment => (
                <Alert key={attachment.url}>
                  <AlertTitle>Attachment</AlertTitle>
                  <AlertDescription>
                    attachment not yet implemented 😁
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {message.parts?.map((part, index) => {
            const key = `message-${messageIndex}-part-${part.type}-${index}`
            const isLastPart = index === message.parts.length - 1

            console.log('part', part)

            if (part.type === 'reasoning') {
              console.log('reasoning', part, isLastPart)
              // 添加reasoning字段的验证
              if (!part.reasoning) {
                console.error('Reasoning part missing reasoning field:', part)
                return null
              }
              return (
                <ReasoningPart
                  key={key}
                  reasoning={part.reasoning}
                  isThinking={isLastPart}
                />
              )
            }

            if (isUserMessage && part.type === 'text' && part.text) {
              return (
                <UserMessagePart
                  key={key}
                  status={status}
                  part={part}
                  isLast={isLastPart}
                  isError={isError}
                  message={message}
                  setMessages={setMessages}
                  reload={reload}
                />
              )
            }

            if (part.type === 'text' && !isUserMessage) {
              return (
                <AssistMessagePart
                  threadId={threadId}
                  key={key}
                  part={part}
                  showActions={
                    isLastMessage ? isLastPart && !isLoading : isLastPart
                  }
                  message={message}
                  setMessages={setMessages}
                  reload={reload}
                  isError={isError}
                />
              )
            }

            if (part.type === 'tool-invocation') {
              const isLast = isLastMessage && isLastPart
              const isManualToolInvocation = (
                message.annotations as ChatMessageAnnotation[]
              )?.some(a => a.toolChoice == 'manual')

              return (
                <ToolMessagePart
                  isLast={isLast}
                  messageId={message.id}
                  isManualToolInvocation={isManualToolInvocation}
                  showActions={
                    isLastMessage ? isLastPart && !isLoading : isLastPart
                  }
                  onPoxyToolCall={onPoxyToolCall}
                  key={key}
                  part={part}
                  isError={isError}
                  setMessages={setMessages}
                />
              )
            }
          })}
          {isLoading && isLastMessage && <Think />}
        </div>
      </div>
    </div>
  )
}

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.message.id !== nextProps.message.id) return false
    if (prevProps.isLoading !== nextProps.isLoading) return false
    if (prevProps.isLastMessage !== nextProps.isLastMessage) return false
    if (prevProps.className !== nextProps.className) return false
    if (prevProps.status !== nextProps.status) return false
    if (prevProps.message.annotations !== nextProps.message.annotations)
      return false
    if (prevProps.isError !== nextProps.isError) return false
    if (!!prevProps.onPoxyToolCall !== !!nextProps.onPoxyToolCall) return false
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false
    return true
  }
)

export const ErrorMessage = ({
  error
}: {
  error: Error
  message?: UIMessage
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const maxLength = 200
  const t = useTranslations()
  return (
    <div className="mx-auto mt-4 w-full max-w-3xl animate-in px-6 fade-in">
      <Alert variant="destructive" className="border-destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle className="mb-2">{t('Chat.Error')}</AlertTitle>
        <AlertDescription className="text-sm">
          <div className="whitespace-pre-wrap">
            {isExpanded
              ? error.message
              : truncateString(error.message, maxLength)}
          </div>
          {error.message.length > maxLength && (
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant={'ghost'}
              className="ml-auto"
              size={'sm'}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  {t('Common.showLess')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  {t('Common.showMore')}
                </>
              )}
            </Button>
          )}
        </AlertDescription>
        <AlertDescription>
          <p className="my-2 text-sm text-muted-foreground">
            {t('Chat.thisMessageWasNotSavedPleaseTryTheChatAgain')}
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
