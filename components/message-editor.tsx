'use client'

import type { UseChatHelpers } from '@ai-sdk/react'
import type { Message } from 'ai'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

type TextUIPart = {
  type: 'text'
  text: string
}

export type MessageEditorProps = {
  message: Message
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>
  setMessages: UseChatHelpers['setMessages']
  reload: UseChatHelpers['reload']
}

export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [draftParts, setDraftParts] = useState<TextUIPart[]>(() => {
    if (message.parts && message.parts.length > 0) {
      return message.parts.map((part: any) => ({
        type: 'text',
        text: part.text
      }))
    }
    return [{ type: 'text', text: '' }]
  })

  const handlePartChange = (index: number, value: string) => {
    setDraftParts(prev => {
      const newParts = [...prev]
      newParts[index] = { type: 'text', text: value }
      return newParts
    })
  }

  return (
    <div className="mb-4 flex w-full flex-col gap-4">
      {draftParts.map((part, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Textarea
            data-testid={`message-editor-part-${index}`}
            className="min-h-[100px] w-full resize-none overflow-hidden overflow-y-auto rounded-xl bg-transparent !text-base outline-none"
            value={part.text}
            onChange={e => handlePartChange(index, e.target.value)}
            placeholder={`Part ${index + 1}`}
          />
        </div>
      ))}

      <div className="flex flex-row justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-fit px-3 py-2"
          onClick={() => {
            setMode('view')
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          size="sm"
          className="h-fit px-3 py-2"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true)

            // await deleteMessagesByChatIdAfterTimestampAction(message.id);

            setMessages(messages => {
              const index = messages.findIndex(m => m.id === message.id)

              if (index !== -1) {
                const updatedMessage: Message = {
                  ...message,
                  parts: draftParts
                }

                return [...messages.slice(0, index), updatedMessage]
              }

              return messages
            })

            setMode('view')
            reload({})
          }}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
