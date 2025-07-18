'use client'

import { createDebounce } from '@/lib/utils'
import { Loader } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useMemo, useRef, useState } from 'react'

let mermaidModule: typeof import('mermaid').default | null = null

const loadMermaid = async () => {
  if (!mermaidModule) {
    mermaidModule = (await import('mermaid')).default
  }
  return mermaidModule
}

interface MermaidDiagramProps {
  chart?: string
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const { theme } = useTheme()
  const [state, setState] = useState<{
    svg: string
    error: string | null
    loading: boolean
  }>({
    svg: '',
    error: null,
    loading: true
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const previousChartRef = useRef<string>(chart)
  const debounce = useMemo(() => createDebounce(), [])

  useEffect(() => {
    // Reset states if chart has changed
    if (previousChartRef.current !== chart) {
      setState(prev => ({ ...prev, loading: true, error: null }))
      previousChartRef.current = chart
    }

    // Debounce rendering to avoid flickering during streaming
    debounce(async () => {
      if (!chart?.trim()) {
        setState({ svg: '', error: null, loading: false })
        return
      }

      try {
        const mermaid = await loadMermaid()

        // Initialize mermaid with theme
        mermaid.initialize({
          startOnLoad: false,
          theme: theme == 'dark' ? 'dark' : 'default',
          securityLevel: 'loose'
        })

        // // First try to parse to catch syntax errors early
        await mermaid.parse(chart)

        // Render the diagram
        const id = `mermaid-${Date.now()}`
        const { svg } = await mermaid.render(id, chart)

        setState({ svg, error: null, loading: false })
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setState({
          svg: '',
          error:
            err instanceof Error ? err.message : 'Failed to render diagram',
          loading: false
        })
      }
    }, 500)

    return () => {
      debounce.clear()
    }
  }, [chart, theme, debounce])

  if (state.loading) {
    return (
      <div className="overflow-auto px-6">
        <div className="flex h-20 w-full items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            Rendering diagram <Loader className="size-4 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="overflow-auto px-6 pb-6">
        <div className="p-4 text-destructive">
          <p>Error rendering Mermaid diagram:</p>
          <pre className="mt-2 overflow-auto rounded bg-destructive/10 p-2 text-xs dark:bg-destructive/20">
            {state.error}
          </pre>
          <pre className="mt-2 overflow-auto rounded bg-accent/10 p-2 text-xs dark:bg-accent/20">
            {chart}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-auto px-6 pb-6">
      <div
        ref={containerRef}
        className="flex justify-center overflow-auto transition-opacity duration-200"
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    </div>
  )
}
