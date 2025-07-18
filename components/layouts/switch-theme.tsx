'use client'

import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function SwitchTheme({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // 确保组件已挂载，避免 hydration 不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  // 在挂载前不渲染主题相关内容
  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className={className}>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    )
  }

  // 判断是否支持 startViewTransition API
  const enableTransitions = () =>
    'startViewTransition' in document &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches

  // 切换动画
  async function toggleDark(e: React.MouseEvent<HTMLButtonElement>) {
    const { clientX: x, clientY: y } = e
    const isDark = theme === 'dark'

    if (!enableTransitions()) {
      setTheme(theme === 'light' ? 'dark' : 'light')
      return
    }

    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px at ${x}px ${y}px)`
    ]

    await document.startViewTransition(async () => {
      setTheme(theme === 'light' ? 'dark' : 'light')
    }).ready

    document.documentElement.animate(
      { clipPath: !isDark ? clipPath.reverse() : clipPath },
      {
        duration: 300,
        easing: 'ease-in',
        pseudoElement: `::view-transition-${!isDark ? 'old' : 'new'}(root)`
      }
    )
  }

  return (
    <Button
      onClick={toggleDark}
      variant="outline"
      size="icon"
      className={className}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
    </Button>
  )
}
