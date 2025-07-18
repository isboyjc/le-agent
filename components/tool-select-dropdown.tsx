import { appStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useMcpServerList } from '@/hooks/use-mcp-server-list'
import { cn, objectFlow } from '@/lib/utils'
import {
  AtSign,
  Ban,
  Check,
  ChevronRight,
  Crosshair,
  Infinity,
  Loader,
  ToolCase as MCPIcon,
  Settings2Icon,
  WrenchIcon
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'

import { useTranslations } from 'next-intl'

import { CountAnimation } from '@/components/ui/count-animation'
import { Switch } from '@/components/ui/switch'
import { ChatMention } from '@/types/chat'
import { useShallow } from 'zustand/shallow'

import { Separator } from '@/components/ui/separator'
import { getShortcutKeyList, Shortcuts } from '@/lib/keyboard-shortcuts'

interface ToolSelectDropdownProps {
  align?: 'start' | 'end' | 'center'
  side?: 'left' | 'right' | 'top' | 'bottom'
  disabled?: boolean
  mentions?: ChatMention[]
}

export function ToolSelectDropdown({
  align,
  side,
  mentions
}: ToolSelectDropdownProps) {
  const [toolChoice, allowedMcpServers, mcpServerList] = appStore(
    useShallow(state => [
      state.toolChoice,
      state.allowedMcpServers,
      state.mcpServerList
    ])
  )
  const t = useTranslations()
  const { isLoading, data } = useMcpServerList({
    refreshInterval: 1000 * 60 * 5
  })
  console.log(data)

  const bindingTools = useMemo<string[]>(() => {
    if (mentions?.length) {
      return mentions.map(m => m.name)
    }
    if (toolChoice == 'none') return []
    const mcpIds = mcpServerList.map(v => v.id)
    const mcpTools = Object.values(
      objectFlow(allowedMcpServers ?? {}).filter((_, id) => mcpIds.includes(id))
    )
      .map(v => v.tools)
      .flat()

    return [...mcpTools]
  }, [mentions, allowedMcpServers, toolChoice, mcpServerList])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={'sm'}
          className={cn(
            'gap-0.5 rounded-full border bg-input/60 hover:bg-input! data-[state=open]:bg-input!',
            !bindingTools.length &&
              !isLoading &&
              'border-transparent bg-transparent text-muted-foreground',
            isLoading && 'bg-input/60'
          )}
        >
          <span
            className={
              (mentions?.length ?? 0 > 0) ? 'text-muted-foreground' : ''
            }
          >
            Tools
          </span>
          {(bindingTools.length > 0 || isLoading) && (
            <>
              <div className="mx-1 hidden h-4 sm:block">
                <Separator orientation="vertical" />
              </div>
              <div className="flex min-w-5 justify-center">
                {isLoading ? (
                  <Loader className="size-3.5 animate-spin" />
                ) : (mentions?.length ?? 0) > 0 ? (
                  <AtSign className="size-3.5" />
                ) : (
                  <CountAnimation
                    number={bindingTools.length}
                    className="text-xs"
                  />
                )}
              </div>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="md:w-72" align={align} side={side}>
        <DropdownMenuLabel className="flex items-center gap-2">
          <WrenchIcon className="size-3.5" />
          {t('Chat.Tool.toolsSetup')}
        </DropdownMenuLabel>

        <p className="mb-2 w-full pr-4 pl-8 text-xs whitespace-pre-wrap text-muted-foreground">
          {t('Chat.Tool.toolsSetupDescription')}
        </p>
        <div className="py-1">
          <DropdownMenuSeparator />
        </div>
        <ToolModeSelector />
        <div className="py-1">
          <DropdownMenuSeparator />
        </div>
        <div className="py-2">
          <McpServerSelector />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ToolModeSelector() {
  const t = useTranslations()
  const [toolChoice, appStoreMutate] = appStore(
    useShallow(state => [state.toolChoice, state.mutate])
  )

  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
          <Settings2Icon className="size-3.5" />
          {t('Chat.Tool.selectToolMode')}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="relative w-80">
            <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground">
              {t('Chat.Tool.selectToolMode')}
              <DropdownMenuShortcut>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {getShortcutKeyList(Shortcuts.toolMode).join('')}
                </span>
              </DropdownMenuShortcut>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={e => {
                  e.preventDefault()
                  appStoreMutate({ toolChoice: 'auto' })
                }}
              >
                <div className="flex w-full flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Infinity />
                    <span className="font-bold">Auto</span>
                    {toolChoice == 'auto' && <Check className="ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('Chat.Tool.autoToolModeDescription')}
                  </p>
                </div>
              </DropdownMenuItem>
              <div className="px-2 py-1">{/* <DropdownMenuSeparator /> */}</div>
              <DropdownMenuItem
                onClick={e => {
                  e.preventDefault()
                  appStoreMutate({ toolChoice: 'manual' })
                }}
              >
                <div className="flex w-full flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Crosshair className="size-4" />
                    <span className="font-bold">Manual</span>
                    {toolChoice == 'manual' && <Check className="ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('Chat.Tool.manualToolModeDescription')}
                  </p>
                </div>
              </DropdownMenuItem>
              <div className="px-2 py-1">{/* <DropdownMenuSeparator /> */}</div>
              <DropdownMenuItem
                onClick={e => {
                  e.preventDefault()
                  appStoreMutate({ toolChoice: 'none' })
                }}
              >
                <div className="flex w-full flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Ban className="size-4" />
                    <span className="font-bold">None</span>
                    <span className="ml-4 text-xs text-muted-foreground">
                      @mention only
                    </span>
                    {toolChoice == 'none' && <Check className="ml-auto" />}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t('Chat.Tool.noneToolModeDescription')}
                  </p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  )
}

function McpServerSelector() {
  const [appStoreMutate, allowedMcpServers, mcpServerList] = appStore(
    useShallow(state => [
      state.mutate,
      state.allowedMcpServers,
      state.mcpServerList
    ])
  )

  const selectedMcpServerList = useMemo(() => {
    if (mcpServerList.length === 0) return []
    return [...mcpServerList]
      .sort(
        (a, b) =>
          (a.status === 'connected' ? -1 : 1) -
          (b.status === 'connected' ? -1 : 1)
      )
      .map(server => {
        const allowedTools: string[] =
          allowedMcpServers?.[server.id]?.tools ??
          server.toolInfo.map(tool => tool.name)
        return {
          id: server.id,
          serverName: server.name,
          checked: allowedTools.length > 0,
          tools: server.toolInfo.map(tool => ({
            name: tool.name,
            checked: allowedTools.includes(tool.name),
            description: tool.description
          })),
          error: server.error,
          status: server.status
        }
      })
  }, [mcpServerList, allowedMcpServers])

  const setMcpServerTool = useCallback(
    (serverId: string, toolNames: string[]) => {
      appStoreMutate(prev => {
        return {
          allowedMcpServers: {
            ...prev.allowedMcpServers,
            [serverId]: {
              ...(prev.allowedMcpServers?.[serverId] ?? {}),
              tools: toolNames
            }
          }
        }
      })
    },
    []
  )
  return (
    <DropdownMenuGroup>
      {!selectedMcpServerList.length ? (
        <div className="flex h-full w-full flex-col items-center justify-center py-6 text-sm text-muted-foreground">
          <div>No MCP servers detected.</div>
          <Link href="/mcp">
            <Button
              variant={'ghost'}
              className="mt-2 flex items-center gap-1 text-primary"
            >
              Add a server <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
      ) : (
        selectedMcpServerList.map(server => (
          <DropdownMenuSub key={server.id}>
            <DropdownMenuSubTrigger
              className="flex cursor-pointer items-center gap-2 font-semibold"
              icon={
                <div className="ml-auto flex items-center gap-2">
                  {server.tools.filter(t => t.checked).length > 0 ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border/40 bg-blue-500/5 text-[8px] font-normal text-blue-500">
                      {server.tools.filter(t => t.checked).length}
                    </span>
                  ) : null}

                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              }
              onClick={e => {
                e.preventDefault()
                setMcpServerTool(
                  server.id,
                  server.checked ? [] : server.tools.map(t => t.name)
                )
              }}
            >
              <div className="flex items-center justify-center rounded border bg-input/40 p-1">
                <MCPIcon className="size-2.5 fill-foreground" />
              </div>

              <span className={cn('truncate', !server.checked && 'opacity-30')}>
                {server.serverName}
              </span>
              {Boolean(server.error) ? (
                <span
                  className={cn('ml-1 rounded p-1 text-xs text-destructive')}
                >
                  error
                </span>
              ) : null}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="relative w-80">
                <McpServerToolSelector
                  tools={server.tools}
                  checked={server.checked}
                  onClickAllChecked={checked => {
                    setMcpServerTool(
                      server.id,
                      checked ? server.tools.map(t => t.name) : []
                    )
                  }}
                  onToolClick={(toolName, checked) => {
                    const currentTools = server.tools
                      .filter(v => v.checked)
                      .map(v => v.name)

                    setMcpServerTool(
                      server.id,
                      checked
                        ? currentTools.concat(toolName)
                        : currentTools.filter(v => v !== toolName)
                    )
                  }}
                />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        ))
      )}
    </DropdownMenuGroup>
  )
}

interface McpServerToolSelectorProps {
  tools: {
    name: string
    checked: boolean
    description: string
  }[]
  onClickAllChecked: (checked: boolean) => void
  checked: boolean
  onToolClick: (toolName: string, checked: boolean) => void
}
function McpServerToolSelector({
  tools,
  onClickAllChecked,
  checked,
  onToolClick
}: McpServerToolSelectorProps) {
  const t = useTranslations()
  const [search, setSearch] = useState('')
  const filteredTools = useMemo(() => {
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [tools, search])
  return (
    <div>
      <DropdownMenuLabel
        className="flex items-center gap-2 text-muted-foreground"
        onClick={e => {
          e.preventDefault()
          onClickAllChecked(!checked)
        }}
      >
        <input
          autoFocus
          placeholder={t('Common.search')}
          value={search}
          onKeyDown={e => {
            e.stopPropagation()
          }}
          onChange={e => setSearch(e.target.value)}
          onClick={e => {
            e.stopPropagation()
          }}
          className="flex w-full text-xs outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex-1" />
        <Switch checked={checked} />
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <div className="max-h-96 overflow-y-auto">
        {filteredTools.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center py-6 text-sm text-muted-foreground">
            {t('Common.noResults')}
          </div>
        ) : (
          filteredTools.map(tool => (
            <DropdownMenuItem
              key={tool.name}
              className="mb-1 flex cursor-pointer items-center gap-2"
              onClick={e => {
                e.preventDefault()
                onToolClick(tool.name, !tool.checked)
              }}
            >
              <div className="mx-1 min-w-0 flex-1">
                <p className="mb-1 truncate text-xs font-medium">{tool.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {tool.description}
                </p>
              </div>
              <Checkbox checked={tool.checked} className="ml-auto" />
            </DropdownMenuItem>
          ))
        )}
      </div>
    </div>
  )
}
