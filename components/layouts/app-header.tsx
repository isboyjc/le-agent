'use client'

import { appStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { getShortcutKeyList, Shortcuts } from '@/lib/keyboard-shortcuts'
import { Command } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useShallow } from 'zustand/react/shallow'

export function AppHeader() {
  const t = useTranslations()
  const { toggleSidebar } = useSidebar()
  const [appStoreMutate] = appStore(useShallow(state => [state.mutate]))
  return (
    <header className="sticky top-0 z-50 flex items-center px-3 py-2">
      {/* <Tooltip>
        <TooltipTrigger asChild>
          <Toggle aria-label="Toggle italic" onClick={toggleSidebar}>
            <PanelLeft />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent align="start" side="bottom">
          <div className="flex items-center gap-2">
            {t('KeyboardShortcuts.toggleSidebar')}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getShortcutKeyList(Shortcuts.toggleSidebar).map(key => (
                <span
                  key={key}
                  className="flex h-5 w-5 items-center justify-center rounded bg-muted"
                >
                  {key}
                </span>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip> */}

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={'icon'}
              variant={'secondary'}
              className="bg-secondary/40"
              onClick={() => {
                appStoreMutate(prev => ({
                  openShortcutsPopup: !prev.openShortcutsPopup
                }))
              }}
            >
              <Command className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent align="end" side="bottom">
            <div className="flex items-center gap-2 text-xs">
              {t('KeyboardShortcuts.openShortcutsPopup')}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getShortcutKeyList(Shortcuts.openShortcutsPopup).map(key => (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded bg-muted"
                    key={key}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
        {/* <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={'icon'}
              variant={'secondary'}
              className="bg-secondary/40"
              onClick={() => {}}
            >
              <MessageCircleDashed className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent align="end" side="bottom">
            <div className="flex items-center gap-2 text-xs">
              {t('KeyboardShortcuts.toggleTemporaryChat')}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {getShortcutKeyList(Shortcuts.toggleTemporaryChat).map(key => (
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded bg-muted"
                    key={key}
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip> */}
      </div>
    </header>
  )
}
