'use client'

import {
  getShortcutKeyList,
  isShortcutEvent,
  Shortcuts
} from '@/lib/keyboard-shortcuts'

import { appStore } from '@/app/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'

export function KeyboardShortcutsPopup({}) {
  const [openShortcutsPopup, appStoreMutate] = appStore(
    useShallow(state => [state.openShortcutsPopup, state.mutate])
  )
  const t = useTranslations()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isShortcutEvent(e, Shortcuts.openShortcutsPopup)) {
        e.preventDefault()
        e.stopPropagation()
        appStoreMutate(prev => ({
          openShortcutsPopup: !prev.openShortcutsPopup
        }))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Dialog
      open={openShortcutsPopup}
      onOpenChange={() =>
        appStoreMutate({ openShortcutsPopup: !openShortcutsPopup })
      }
    >
      <DialogContent className="md:max-w-3xl">
        <DialogTitle>{t('KeyboardShortcuts.title')}</DialogTitle>
        <DialogDescription />
        <div className="grid grid-cols-2 gap-5">
          {Object.entries(Shortcuts).map(([key, shortcut]) => (
            <div
              key={key}
              className="flex w-full items-center gap-2 px-2 text-sm"
            >
              <p>{t(`KeyboardShortcuts.${shortcut.description}`)}</p>
              <div className="flex-1" />
              {getShortcutKeyList(shortcut).map(key => {
                return (
                  <div
                    key={key}
                    className="flex min-h-8 min-w-8 items-center justify-center rounded-md border bg-muted p-1.5 text-xs"
                  >
                    <span>{key}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
