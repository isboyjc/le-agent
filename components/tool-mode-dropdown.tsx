'use client'

import { appStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import {
  getShortcutKeyList,
  isShortcutEvent,
  Shortcuts
} from '@/lib/keyboard-shortcuts'
import {
  Ban,
  Check,
  CheckIcon,
  Crosshair,
  Infinity,
  Settings2
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { capitalizeFirstLetter, createDebounce } from '@/lib/utils'
import { useShallow } from 'zustand/shallow'

const debounce = createDebounce()

export const ToolModeDropdown = ({ disabled }: { disabled?: boolean }) => {
  const t = useTranslations()
  const [toolChoice, appStoreMutate] = appStore(
    useShallow(state => [state.toolChoice, state.mutate])
  )
  const [open, setOpen] = useState(false)

  const [toolChoiceChangeInfo, setToolChoiceChangeInfo] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutEvent(e, Shortcuts.toolMode)) {
        e.preventDefault()
        e.stopPropagation()
        appStoreMutate(({ toolChoice }) => {
          return {
            toolChoice:
              toolChoice == 'auto'
                ? 'manual'
                : toolChoice == 'manual'
                  ? 'none'
                  : 'auto'
          }
        })
        setToolChoiceChangeInfo(true)
        debounce(() => {
          setToolChoiceChangeInfo(false)
        }, 1000)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <div className="relative">
          <Tooltip open={toolChoiceChangeInfo}>
            <TooltipTrigger asChild>
              <span className="absolute inset-0 -z-10" />
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2" side="bottom">
              {capitalizeFirstLetter(toolChoice)}
              <CheckIcon className="size-2.5" />
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={'ghost'}
                size={'sm'}
                className="rounded-full p-2! hover:bg-input! data-[state=open]:bg-input!"
                onClick={() => setOpen(true)}
              >
                <Settings2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="flex items-center gap-2" side="bottom">
              {t('Chat.Tool.selectToolMode')}
              <Badge className="text-xs" variant={'secondary'}>
                {capitalizeFirstLetter(toolChoice)}
                <span className="ml-2 text-muted-foreground">
                  {getShortcutKeyList(Shortcuts.toolMode).join('')}
                </span>
              </Badge>
            </TooltipContent>
          </Tooltip>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
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
            onClick={() => appStoreMutate({ toolChoice: 'auto' })}
          >
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-center gap-2">
                <Infinity className="size-4" />
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
            onClick={() => appStoreMutate({ toolChoice: 'manual' })}
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
            onClick={() => appStoreMutate({ toolChoice: 'none' })}
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
