'use client'

import { appStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import { notImplementedToast } from '@/components/ui/toasts'
import { ChatMention, ChatMessageAnnotation, ChatModel } from '@/types/chat'
import { UseChatHelpers } from '@ai-sdk/react'
import { Editor } from '@tiptap/react'
import {
  ChevronDown,
  CirclePause,
  CornerRightUp,
  Paperclip
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/shallow'
import { SelectModel } from './select-model'
import { ToolModeDropdown } from './tool-mode-dropdown'
import { ToolSelectDropdown } from './tool-select-dropdown'

interface ChatInputProps {
  placeholder?: string
  setInput: (value: string) => void
  input: string
  onStop: () => void
  append: UseChatHelpers['append']
  toolDisabled?: boolean
  isLoading?: boolean
  model?: ChatModel
  setModel?: (model: ChatModel) => void
}

const ChatMentionInput = dynamic(() => import('./chat-mention-input'), {
  ssr: false,
  loading() {
    return <div className="h-[2rem] w-full animate-pulse"></div>
  }
})

export function ChatInput({
  placeholder,
  append,
  model,
  setModel,
  input,
  setInput,
  onStop,
  isLoading,
  toolDisabled
}: ChatInputProps) {
  const t = useTranslations()

  const [globalModel, appStoreMutate] = appStore(
    useShallow(state => [state.chatModel, state.mutate])
  )

  const chatModel = useMemo(() => {
    return model ?? globalModel
  }, [model, globalModel])

  const editorRef = useRef<Editor | null>(null)

  const setChatModel = useCallback(
    (model: ChatModel) => {
      if (setModel) {
        setModel(model)
      } else {
        appStoreMutate({ chatModel: model })
      }
    },
    [setModel, appStoreMutate]
  )

  const [toolMentionItems, setToolMentionItems] = useState<ChatMention[]>([])

  const submit = () => {
    console.log('submit')
    if (isLoading) return
    console.log('submit', input)
    const userMessage = input?.trim() || ''
    if (userMessage.length === 0) return
    const annotations: ChatMessageAnnotation[] = []

    if (toolMentionItems.length > 0) {
      annotations.push({
        mentions: toolMentionItems
      })
    }
    setToolMentionItems([])
    setInput('')
    append!({
      role: 'user',
      content: '',
      annotations,
      parts: [
        {
          type: 'text',
          text: userMessage
        }
      ]
    })
  }

  return (
    <div className="mx-auto max-w-3xl animate-in fade-in">
      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <fieldset className="flex w-full max-w-full min-w-0 flex-col px-2">
          <div className="relative z-10 flex w-full cursor-text flex-col items-stretch rounded-4xl bg-muted/60 p-3 backdrop-blur-sm transition-all duration-200 focus-within:bg-muted hover:bg-muted">
            <div className="flex w-full flex-col gap-3.5 px-1">
              <div className="relative min-h-[2rem] w-full">
                <ChatMentionInput
                  input={input}
                  onChange={setInput}
                  onChangeMention={setToolMentionItems}
                  onEnter={submit}
                  placeholder={placeholder ?? t('Chat.placeholder')}
                  ref={editorRef}
                />
              </div>
              <div className="z-30 flex w-full items-center gap-[1px]">
                <Button
                  variant={'ghost'}
                  size={'sm'}
                  className="rounded-full p-2! hover:bg-input!"
                  onClick={() =>
                    notImplementedToast(
                      t('Common.notImplementedYet'),
                      t('Common.comingSoon')
                    )
                  }
                >
                  <Paperclip />
                </Button>

                {!toolDisabled && (
                  <>
                    <ToolModeDropdown />
                    <ToolSelectDropdown
                      align="start"
                      side="top"
                      mentions={toolMentionItems}
                    />
                  </>
                )}

                <div className="flex-1" />

                <SelectModel onSelect={setChatModel} defaultModel={chatModel}>
                  <Button
                    variant={'ghost'}
                    size={'sm'}
                    className="mr-1 rounded-full hover:bg-input! data-[state=open]:bg-input!"
                  >
                    {chatModel?.model?.split('/').pop() ?? (
                      <span className="text-muted-foreground">model</span>
                    )}
                    <ChevronDown className="size-3" />
                  </Button>
                </SelectModel>
                <div
                  onClick={() => {
                    if (isLoading) {
                      onStop()
                    } else {
                      submit()
                    }
                  }}
                  className="animate-in cursor-pointer rounded-full bg-secondary p-2 text-muted-foreground transition-all duration-200 fade-in hover:bg-accent-foreground hover:text-accent"
                >
                  {isLoading ? (
                    <CirclePause size={16} className="text-muted-foreground" />
                  ) : (
                    <CornerRightUp size={16} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  )
}
