'use client'
import { cn } from '@/lib/utils'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { useTheme } from 'next-themes'
import type { JSX, ReactNode } from 'react'
import { Fragment, useLayoutEffect, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import { codeToHast } from 'shiki/bundle/web'
import { safe } from 'ts-safe'

export function CodeBlock({
  code,
  lang,
  fallback,
  className,
  showLineNumbers = true
}: {
  code?: string
  lang: string
  fallback?: ReactNode
  className?: string
  showLineNumbers?: boolean
}) {
  const { theme } = useTheme()

  const [component, setComponent] = useState<JSX.Element | null>(null)

  useLayoutEffect(() => {
    safe()
      .map(async () => {
        const out = await codeToHast(code || '', {
          lang: lang,
          theme: theme == 'dark' ? 'dark-plus' : 'github-light'
        })
        return toJsxRuntime(out, {
          Fragment,
          jsx,
          jsxs,
          components: {
            pre: props => (
              <pre
                {...props}
                lang={lang}
                style={undefined}
                className={cn(props.className, className)}
              >
                <div className={cn(showLineNumbers && 'relative pl-12')}>
                  {showLineNumbers && (
                    <div className="absolute top-0 left-0 flex w-6 flex-col text-right select-none">
                      {code?.split('\n').map((_, index) => (
                        <span key={index}>{index + 1}</span>
                      ))}
                    </div>
                  )}
                  {props.children}
                </div>
              </pre>
            )
          }
        }) as JSX.Element
      })
      .ifOk(setComponent)
  }, [theme, lang, code])

  if (!code) return fallback

  return component ?? fallback
}
