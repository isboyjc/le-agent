'use client'

import { Button } from '@/components/ui/button'
import JsonView from '@/components/ui/json-view'
import { useCopy } from '@/hooks/use-copy'
import { cn } from '@/lib/utils'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { CheckIcon, Clipboard } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import type { JSX } from 'react'
import { Fragment, useLayoutEffect, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'
import {
  bundledLanguages,
  codeToHast,
  type BundledLanguage
} from 'shiki/bundle/web'
import { safe } from 'ts-safe'

// Dynamically import MermaidDiagram component
const MermaidDiagram = dynamic(
  () => import('./mermaid-diagram').then(mod => mod.MermaidDiagram),
  {
    loading: () => (
      <div className="relative my-4 flex flex-col overflow-hidden rounded-2xl border bg-accent/30 text-sm">
        <div className="z-20 flex w-full items-center px-4 py-2">
          <span className="text-sm text-muted-foreground">mermaid</span>
        </div>
        <div className="relative overflow-x-auto px-6 pb-6">
          <div className="flex h-20 w-full items-center justify-center">
            <span className="text-muted-foreground">
              Loading Mermaid renderer...
            </span>
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
)
const PureLeagent = dynamic(
  () => import('./leagent-diagram').then(mod => mod.PureLeagent),
  {
    ssr: false
  }
)

// Dynamically import LeagentDiagram component
const LeagentDiagram = dynamic(
  () => import('./leagent-diagram').then(mod => mod.LeagentDiagram),
  {
    loading: () => (
      <div className="relative my-4 flex flex-col overflow-hidden rounded-2xl border bg-accent/30 text-sm">
        <div className="z-20 flex w-full items-center px-4 py-2">
          <span className="text-sm text-muted-foreground">leagent</span>
        </div>
        <div className="relative overflow-x-auto px-6 pb-6">
          <div className="flex h-20 w-full items-center justify-center">
            <span className="text-muted-foreground">
              Loading Leagent renderer...
            </span>
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
)

const PurePre = ({
  children,
  className,
  code,
  lang
}: {
  children: any
  className?: string
  code: string
  lang: string
}) => {
  const { copied, copy } = useCopy()

  return (
    <pre className={cn('relative', className)}>
      <div className="z-20 flex w-full items-center px-4 py-2">
        <span className="text-sm text-muted-foreground">{lang}</span>
        <Button
          size="icon"
          variant={copied ? 'secondary' : 'ghost'}
          className="z-10 ml-auto size-2! rounded-sm p-3!"
          onClick={() => {
            copy(code)
          }}
        >
          {copied ? <CheckIcon /> : <Clipboard className="size-3!" />}
        </Button>
      </div>
      <div className="relative overflow-x-auto px-6 pb-6">{children}</div>
    </pre>
  )
}

export async function Highlight(
  code: string,
  lang: BundledLanguage | (string & {}),
  theme: string
) {
  const parsed: BundledLanguage = (
    bundledLanguages[lang as BundledLanguage] ? lang : 'md'
  ) as BundledLanguage

  if (lang === 'json') {
    return (
      <PurePre code={code} lang={lang}>
        <JsonView data={code} initialExpandDepth={3} />
      </PurePre>
    )
  }

  if (lang === 'mermaid') {
    return (
      <PurePre code={code} lang={lang}>
        <MermaidDiagram chart={code} />
      </PurePre>
    )
  }

  if (lang === 'leagent') {
    return (
      <PureLeagent>
        <LeagentDiagram content={code} />
      </PureLeagent>
    )
  }

  const out = await codeToHast(code, {
    lang: parsed,
    theme
  })

  return toJsxRuntime(out, {
    Fragment,
    jsx,
    jsxs,
    components: {
      pre: props => <PurePre {...props} code={code} lang={lang} />
    }
  }) as JSX.Element
}

export function PreBlock({ children }: { children: any }) {
  const code = children.props.children
  const { theme } = useTheme()
  const language = children.props.className?.split('-')?.[1] || 'bash'
  const [loading, setLoading] = useState(true)
  const [component, setComponent] = useState<JSX.Element | null>(
    <PurePre className="animate-pulse" code={code} lang={language}>
      {children}
    </PurePre>
  )

  useLayoutEffect(() => {
    safe()
      .map(() =>
        Highlight(
          code,
          language,
          theme == 'dark' ? 'dark-plus' : 'github-light'
        )
      )
      .ifOk(setComponent)
      .watch(() => setLoading(false))
  }, [theme, language, code])

  // For other code blocks, render as before
  return (
    <div
      className={cn(
        loading && 'animate-pulse',
        'relative my-4 flex flex-col overflow-hidden rounded-2xl border bg-accent/30 text-sm'
      )}
    >
      {component}
    </div>
  )
}
