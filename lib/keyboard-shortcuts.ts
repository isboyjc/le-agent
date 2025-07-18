'use client'

export type Shortcut = {
  description?: string
  shortcut: {
    key?: string
    shift?: boolean
    command?: boolean
    backspace?: boolean
  }
}

/**
 * 切换临时聊天
 */
// const toggleTemporaryChatShortcut: Shortcut = {
//   description: 'toggleTemporaryChat',
//   shortcut: {
//     key: 'K',
//     command: true
//   }
// }

/**
 * 切换侧边栏
 */
// const toggleSidebarShortcut: Shortcut = {
//   description: 'toggleSidebar',
//   shortcut: {
//     key: 'S',
//     command: true,
//     shift: true
//   }
// }

/**
 * 打开快捷键弹窗
 */
const openShortcutsPopupShortcut: Shortcut = {
  description: 'openShortcutsPopup',
  shortcut: {
    key: '/',
    command: true
  }
}

/**
 * 切换工具模式
 */
const toolModeShortcut: Shortcut = {
  description: 'toolMode',
  shortcut: {
    key: 'P',
    command: true
  }
}

export const Shortcuts = {
  // toggleSidebar: toggleSidebarShortcut,
  // toggleTemporaryChat: toggleTemporaryChatShortcut,
  openShortcutsPopup: openShortcutsPopupShortcut,
  toolMode: toolModeShortcut
}

export const isShortcutEvent = (
  event: KeyboardEvent,
  { shortcut }: Shortcut
) => {
  if (shortcut.command && !event.metaKey && !event.ctrlKey) return false

  if (shortcut.shift && !event.shiftKey) return false

  if (shortcut.key && shortcut.key?.toLowerCase() !== event.key?.toLowerCase())
    return false

  if (shortcut.backspace && event.key?.toLowerCase() !== 'backspace')
    return false

  return true
}
export const getShortcutKeyList = ({ shortcut }: Shortcut): string[] => {
  const keys: string[] = []
  if (shortcut.command) {
    keys.push('⌘')
  }
  if (shortcut.shift) {
    keys.push('⇧')
  }
  if (shortcut.key) {
    keys.push(shortcut.key)
  }
  if (shortcut.backspace) {
    keys.push('⌫')
  }
  return keys
}
