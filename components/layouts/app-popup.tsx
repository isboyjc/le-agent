'use client'

import dynamic from 'next/dynamic'

const KeyboardShortcutsPopup = dynamic(
  () =>
    import('@/components/keyboard-shortcuts-popup').then(
      mod => mod.KeyboardShortcutsPopup
    ),
  {
    ssr: false
  }
)

const LeagentLearningPopup = dynamic(
  () =>
    import('@/components/leagent-learning-popup').then(
      mod => mod.LeagentLearningPopup
    ),
  {
    ssr: false
  }
)

export function AppPopup() {
  return (
    <>
      <KeyboardShortcutsPopup />
      <LeagentLearningPopup />
    </>
  )
}
