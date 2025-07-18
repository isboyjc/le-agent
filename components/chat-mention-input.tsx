'use client'
import { RefObject, useCallback, useMemo } from 'react'

import { ToolCase as MCPIcon, WrenchIcon } from 'lucide-react'

import { ChatMention } from '@/types/chat'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'

import { appStore } from '@/app/store'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { capitalizeFirstLetter, cn, toAny } from '@/lib/utils'
import { Editor } from '@tiptap/react'
import { useTranslations } from 'next-intl'
import { createPortal } from 'react-dom'
import { useShallow } from 'zustand/shallow'
import MentionInput from './mention-input'

interface ChatMentionInputProps {
  onChange: (text: string) => void
  onChangeMention: (mentions: ChatMention[]) => void
  onEnter?: () => void
  placeholder?: string
  input: string
  ref?: RefObject<Editor | null>
}

/**
 * 聊天输入框
 */
export default function ChatMentionInput({
  onChange,
  onChangeMention,
  onEnter,
  placeholder,
  ref,
  input
}: ChatMentionInputProps) {
  const handleChange = useCallback(
    ({
      text,
      mentions
    }: {
      text: string
      mentions: { label: string; id: string }[]
    }) => {
      onChange(text)
      onChangeMention(
        mentions.map(mention => JSON.parse(mention.id) as ChatMention)
      )
    },
    [onChange, onChangeMention]
  )

  return (
    <MentionInput
      content={input}
      onEnter={onEnter}
      placeholder={placeholder}
      suggestionChar="@"
      onChange={handleChange}
      MentionItem={ChatMentionInputMentionItem}
      Suggestion={ChatMentionInputSuggestion}
      editorRef={ref}
    />
  )
}

/**
 * 聊天输入框提及项
 */
export function ChatMentionInputMentionItem({
  id,
  className
}: {
  id: string
  className?: string
}) {
  const item = useMemo(() => JSON.parse(id) as ChatMention, [id])
  const label = useMemo(() => {
    let appDefaultToolIcon
    return (
      <div
        className={cn(
          'mx-1 flex items-center gap-2 rounded-lg bg-blue-500/10 px-2 py-0.5 text-sm font-semibold text-blue-500 ring ring-blue-500/20 transition-colors hover:bg-blue-500/20 hover:ring-blue-500',
          item.type == 'mcpServer' &&
            'bg-indigo-500/10 text-indigo-500 ring-indigo-500/20 hover:bg-indigo-500/20 hover:ring-indigo-500',
          className
        )}
      >
        {item.type == 'defaultTool' ? (
          appDefaultToolIcon
        ) : item.type == 'mcpServer' ? (
          <MCPIcon className="size-3" />
        ) : (
          <WrenchIcon className="size-3" />
        )}
        <span
          className={cn(
            'ml-auto text-xs opacity-60',
            item.type == 'defaultTool' && 'hidden'
          )}
        >
          {capitalizeFirstLetter(item.type)}
        </span>
        {toAny(item).label || item.name}
      </div>
    )
  }, [item])

  return (
    <Tooltip>
      <TooltipTrigger asChild>{label}</TooltipTrigger>
      <TooltipContent className="max-w-xs p-4 whitespace-pre-wrap">
        {item.description || 'mention'}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * 聊天输入框提及建议
 */
function ChatMentionInputSuggestion({
  onSelectMention,
  onClose,
  top,
  left
}: {
  onClose: () => void
  onSelectMention: (item: { label: string; id: string }) => void
  top: number
  left: number
}) {
  const t = useTranslations()
  const [mcpServerList] = appStore(useShallow(state => [state.mcpServerList]))

  const mcpMentions = useMemo(() => {
    return mcpServerList
      ?.filter(mcp => mcp.toolInfo?.length)
      .map(mcp => {
        return (
          <CommandGroup heading={mcp.name} key={mcp.id}>
            <CommandItem
              key={`${mcp.id}-mcp`}
              className="cursor-pointer text-foreground"
              onSelect={() =>
                onSelectMention({
                  label: `mcp("${mcp.name}")`,
                  id: JSON.stringify({
                    type: 'mcpServer',
                    name: mcp.name,
                    serverId: mcp.id,
                    description: `${mcp.name} is an MCP server that includes ${mcp.toolInfo?.length ?? 0} tool(s).`,
                    toolCount: mcp.toolInfo?.length ?? 0
                  })
                })
              }
            >
              <MCPIcon className="size-3.5 text-foreground" />
              <span className="min-w-0 truncate">{mcp.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {mcp.toolInfo?.length} tools
              </span>
            </CommandItem>
            {mcp.toolInfo?.map(tool => {
              return (
                <CommandItem
                  key={`${mcp.id}-${tool.name}`}
                  className="cursor-pointer text-foreground"
                  onSelect={() =>
                    onSelectMention({
                      label: `tool("${tool.name}") `,
                      id: JSON.stringify({
                        type: 'mcpTool',
                        name: tool.name,
                        serverId: mcp.id,
                        description: tool.description,
                        serverName: mcp.name
                      })
                    })
                  }
                >
                  <WrenchIcon className="size-3.5" />
                  <span className="min-w-0 truncate">{tool.name}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        )
      })
  }, [mcpServerList])

  return createPortal(
    <Popover open onOpenChange={f => !f && onClose()}>
      <PopoverTrigger asChild>
        <span
          className="fixed z-50"
          style={{
            top,
            left
          }}
        ></span>
      </PopoverTrigger>
      <PopoverContent className="w-xs p-0" align="start" side="top">
        <Command>
          <CommandInput
            onKeyDown={e => {
              if (e.key == 'Backspace' && !e.currentTarget.value) {
                onClose()
              }
            }}
            placeholder={t('Common.search')}
          />
          <CommandList className="p-2">
            <CommandEmpty>{t('Common.noResults')}</CommandEmpty>
            {mcpMentions}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>,
    document.body
  )
}
