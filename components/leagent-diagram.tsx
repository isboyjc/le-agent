'use client'

import { appStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis'
import { cn, createDebounce } from '@/lib/utils'
import type { BilingualContent } from '@/types/le'
import { BookOpen, Loader, Volume2, VolumeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface LeagentDiagramProps {
  content?: string
}

export function LeagentDiagram({ content }: LeagentDiagramProps) {
  const { theme } = useTheme()
  const { speak, stop, isSupported: isSpeechSupported } = useSpeechSynthesis()
  const autoSpeech = appStore(state => state.autoSpeech)
  const mutate = appStore(state => state.mutate)
  const [state, setState] = useState<{
    data: BilingualContent | null
    error: string | null
    loading: boolean
  }>({
    data: null,
    error: null,
    loading: true
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const previousContentRef = useRef<string>(content)
  const debounce = useMemo(() => createDebounce(), [])
  const currentHoveredWordRef = useRef<string | null>(null)
  const isWordBeingReadRef = useRef<boolean>(false)
  const hasAutoOpenedLearningRef = useRef<boolean>(false)
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
  const [clickedWordId, setClickedWordId] = useState<string | null>(null)

  // 语音朗读函数
  const speakWord = useCallback(
    async (word: string, isManualClick = false, customRate?: number) => {
      if (!isSpeechSupported || (!autoSpeech && !isManualClick) || !state.data)
        return

      try {
        // 如果有正在朗读的内容，先中断
        if (isWordBeingReadRef.current) {
          stop()
        }

        // 标记开始朗读
        isWordBeingReadRef.current = true

        // 更全面的语言映射
        const languageMapping: Record<string, string> = {
          zh: 'zh-CN',
          'zh-cn': 'zh-CN',
          'zh-tw': 'zh-TW',
          ja: 'ja-JP',
          en: 'en-US',
          'en-us': 'en-US',
          'en-gb': 'en-GB',
          fr: 'fr-FR',
          de: 'de-DE',
          es: 'es-ES',
          it: 'it-IT',
          pt: 'pt-BR',
          ru: 'ru-RU',
          ko: 'ko-KR',
          ar: 'ar-SA',
          hi: 'hi-IN',
          th: 'th-TH',
          vi: 'vi-VN',
          tr: 'tr-TR',
          pl: 'pl-PL',
          nl: 'nl-NL',
          sv: 'sv-SE',
          no: 'no-NO',
          da: 'da-DK',
          fi: 'fi-FI',
          cs: 'cs-CZ',
          hu: 'hu-HU',
          el: 'el-GR',
          he: 'he-IL',
          ms: 'ms-MY',
          id: 'id-ID',
          tl: 'tl-PH',
          uk: 'uk-UA',
          bg: 'bg-BG',
          hr: 'hr-HR',
          sk: 'sk-SK',
          sl: 'sl-SI',
          et: 'et-EE',
          lv: 'lv-LV',
          lt: 'lt-LT',
          ro: 'ro-RO',
          mt: 'mt-MT',
          is: 'is-IS',
          ga: 'ga-IE',
          cy: 'cy-GB',
          eu: 'eu-ES',
          ca: 'ca-ES',
          gl: 'gl-ES',
          bn: 'bn-BD',
          ur: 'ur-PK',
          fa: 'fa-IR',
          ta: 'ta-IN',
          te: 'te-IN',
          ml: 'ml-IN',
          kn: 'kn-IN',
          gu: 'gu-IN',
          mr: 'mr-IN',
          pa: 'pa-IN',
          or: 'or-IN',
          as: 'as-IN',
          ne: 'ne-NP',
          si: 'si-LK',
          my: 'my-MM',
          km: 'km-KH',
          lo: 'lo-LA',
          ka: 'ka-GE',
          am: 'am-ET',
          sw: 'sw-TZ',
          zu: 'zu-ZA',
          af: 'af-ZA',
          sq: 'sq-AL',
          az: 'az-AZ',
          be: 'be-BY',
          bs: 'bs-BA',
          eo: 'eo',
          fo: 'fo-FO',
          hy: 'hy-AM',
          kk: 'kk-KZ',
          ky: 'ky-KG',
          lb: 'lb-LU',
          mk: 'mk-MK',
          mn: 'mn-MN',
          sr: 'sr-RS',
          tg: 'tg-TJ',
          tk: 'tk-TM',
          uz: 'uz-UZ'
        }

        const targetLang = state.data.target_language.toLowerCase()
        const speechLang = languageMapping[targetLang] || targetLang || 'en-US'

        await speak(word, {
          lang: speechLang,
          rate: customRate || 0.8, // 使用自定义速度或默认速度
          volume: 0.7
        })
      } catch (error) {
        console.error('Speech synthesis error:', error)
      } finally {
        // 朗读完成后标记为未朗读状态
        isWordBeingReadRef.current = false
      }
    },
    [isSpeechSupported, autoSpeech, state.data, speak, stop]
  )

  // 处理悬浮（只改变颜色）
  const handleWordHover = useCallback(
    (word: string) => {
      // 只有当前没有点击任何词组时，才设置悬浮状态
      if (!clickedWordId) {
        setHoveredWord(word)
        currentHoveredWordRef.current = word
      }
    },
    [clickedWordId]
  )

  // 处理离开悬浮
  const handleWordLeave = useCallback(() => {
    // 只有当前没有点击任何词组时，才清除悬浮状态
    if (!clickedWordId) {
      setHoveredWord(null)
      currentHoveredWordRef.current = null
    }
  }, [clickedWordId])

  // 处理点击词组
  const handleWordClick = useCallback(
    (word: string, wordId: string) => {
      // 只有在需要时才更新状态，避免不必要的重新渲染
      if (clickedWordId !== wordId) {
        setClickedWordId(wordId)
        setHoveredWord(null)
      }

      // 使用 setTimeout 避免朗读操作导致的闪烁
      if (autoSpeech && isSpeechSupported && state.data) {
        setTimeout(() => {
          speakWord(word)
        }, 0)
      }
    },
    [clickedWordId, autoSpeech, isSpeechSupported, state.data, speakWord]
  )

  // 处理手动点击朗读
  const handleManualSpeak = useCallback(
    (word: string, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      // 使用 setTimeout 避免同步状态更新导致的闪烁
      setTimeout(() => {
        speakWord(word, true, 0.1) // 使用极慢的速度 0.1 便于学习
      }, 0)
    },
    [speakWord]
  )

  // 重置所有状态
  const resetAllStates = useCallback(() => {
    setClickedWordId(null)
    setHoveredWord(null)
    currentHoveredWordRef.current = null
    isWordBeingReadRef.current = false
  }, [])

  // 自动打开学习模式
  const autoOpenLearningMode = useCallback(() => {
    if (state.data && !hasAutoOpenedLearningRef.current) {
      hasAutoOpenedLearningRef.current = true
      mutate({
        openLeagentLearningMode: true,
        leagentLearningData: state.data
      })
    }
  }, [state.data, mutate])

  useEffect(() => {
    // Reset states if content has changed
    if (previousContentRef.current !== content) {
      setState(prev => ({ ...prev, loading: true, error: null }))
      previousContentRef.current = content
      // 重置所有状态
      resetAllStates()
      // 重置自动打开学习模式的标记
      hasAutoOpenedLearningRef.current = false
    }

    // Debounce parsing to avoid flickering during streaming
    debounce(async () => {
      if (!content?.trim()) {
        setState({ data: null, error: null, loading: false })
        return
      }

      try {
        // Parse JSON content
        const parsedData = JSON.parse(content) as BilingualContent

        // Validate data structure
        if (!parsedData || typeof parsedData !== 'object') {
          throw new Error('Invalid data format: expected object')
        }

        if (!parsedData.article || typeof parsedData.article !== 'object') {
          throw new Error('Invalid data format: missing article')
        }

        if (
          !parsedData.article.content ||
          typeof parsedData.article.content !== 'string'
        ) {
          throw new Error('Invalid data format: missing article.content')
        }

        if (!Array.isArray(parsedData.article.sentence_groups)) {
          throw new Error(
            'Invalid data format: sentence_groups should be an array'
          )
        }

        setState({ data: parsedData, error: null, loading: false })
      } catch (err) {
        console.error('Leagent parsing error:', err)
        setState({
          data: null,
          error:
            err instanceof Error
              ? err.message
              : 'Failed to parse leagent content',
          loading: false
        })
      }
    }, 1000)

    return () => {
      debounce.clear()
    }
  }, [content, debounce])

  // 当自动朗读开关状态改变时，重置悬浮状态
  useEffect(() => {
    if (autoSpeech) {
      resetAllStates()
    }
  }, [autoSpeech, resetAllStates])

  // 监听内容解析完成，自动打开学习模式
  useEffect(() => {
    if (!state.loading && !state.error && state.data) {
      // 延迟一下确保UI完全渲染完成
      const timer = setTimeout(() => {
        autoOpenLearningMode()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [state.loading, state.error, state.data, autoOpenLearningMode])

  const renderContent = () => {
    if (!state.data) return null

    const { article } = state.data
    const { content: originalContent, sentence_groups } = article

    // Create a map of all words and their translations
    const wordMap = new Map<string, string[]>()
    sentence_groups.forEach(group => {
      group.words.forEach(wordPair => {
        wordMap.set(wordPair.word, wordPair.translations)
      })
    })

    // Find all word matches in the original content
    const matches: Array<{
      start: number
      end: number
      word: string
      translations: string[]
      id: string
    }> = []

    // Sort words by length (longest first) to handle overlapping matches better
    const sortedWords = Array.from(wordMap.keys()).sort(
      (a, b) => b.length - a.length
    )

    let matchIdCounter = 0
    sortedWords.forEach(word => {
      const translations = wordMap.get(word)
      if (!translations) return

      let startIndex = 0
      while (true) {
        const index = originalContent.indexOf(word, startIndex)
        if (index === -1) break

        // Check if this position is already covered by a longer match
        const isOverlapping = matches.some(
          match => index >= match.start && index < match.end
        )

        if (!isOverlapping) {
          matches.push({
            start: index,
            end: index + word.length,
            word,
            translations,
            id: `word-${matchIdCounter++}`
          })
        }

        startIndex = index + 1
      }
    })

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start)

    // Render content with highlighted words
    const renderParts = []
    let lastIndex = 0

    matches.forEach((match, index) => {
      // Add text before the match
      if (match.start > lastIndex) {
        renderParts.push(
          <span key={`text-${index}`}>
            {originalContent.slice(lastIndex, match.start)}
          </span>
        )
      }

      // Add the highlighted word
      const isClicked = clickedWordId === match.id
      const isHovered = hoveredWord === match.word && !clickedWordId

      renderParts.push(
        <Tooltip key={`match-${index}`} open={isClicked}>
          <TooltipTrigger asChild>
            <span
              data-word={match.word}
              className={cn(
                'cursor-pointer rounded px-0.5 underline decoration-dotted decoration-1 underline-offset-6 transition-colors',
                isClicked
                  ? 'bg-green-50 text-green-600 decoration-green-400/60 dark:bg-green-950/20 dark:text-green-400 dark:decoration-green-500/40'
                  : isHovered
                    ? 'bg-gray-100 text-gray-700 decoration-gray-400/50 dark:bg-gray-800/50 dark:text-gray-300 dark:decoration-gray-500/40'
                    : 'decoration-gray-300/40 hover:bg-gray-100 hover:decoration-gray-400/60 dark:decoration-gray-600/30 dark:hover:bg-gray-800/50 dark:hover:decoration-gray-500/50'
              )}
              onMouseEnter={() => handleWordHover(match.word)}
              onMouseLeave={handleWordLeave}
              onClick={e => {
                e.stopPropagation()
                handleWordClick(match.word, match.id)
              }}
            >
              {match.word}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span>{match.word}</span>
                {isSpeechSupported && (
                  <Volume2
                    className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-foreground"
                    onClick={e => handleManualSpeak(match.word, e)}
                  />
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {match.translations.join(', ')}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )

      lastIndex = match.end
    })

    // Add remaining text after the last match
    if (lastIndex < originalContent.length) {
      renderParts.push(
        <span key="text-end">{originalContent.slice(lastIndex)}</span>
      )
    }

    return (
      <TooltipProvider>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="leading-relaxed whitespace-pre-wrap">
            {renderParts}
          </div>
        </div>
      </TooltipProvider>
    )
  }

  const t = useTranslations()
  const DiagramContent = () => (
    <div
      className="overflow-auto px-6 pb-6"
      onClick={useCallback(
        (e: React.MouseEvent) => {
          // 简化的外部点击检测：只有点击纯文本区域时才关闭
          const target = e.target as HTMLElement
          const isWordElement = target.hasAttribute('data-word')
          const isTooltipOrButton =
            target.closest('[role="tooltip"]') ||
            target.closest('button') ||
            target.tagName === 'svg' ||
            target.tagName === 'SVG'

          // 只有点击空白区域时才关闭 Tooltip 并重置状态
          if (
            !isWordElement &&
            !isTooltipOrButton &&
            target === e.currentTarget
          ) {
            resetAllStates()
          }
        },
        [resetAllStates]
      )}
    >
      <div className="mt-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {state.data?.target_language.toUpperCase()} →{' '}
            {state.data?.user_language.toUpperCase()}
          </span>
          {isSpeechSupported && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={autoSpeech ? 'default' : 'outline'}
                  onClick={() => mutate({ autoSpeech: !autoSpeech })}
                  className="h-6 text-xs"
                >
                  {autoSpeech ? (
                    <Volume2 className="mr-1 h-3 w-3" />
                  ) : (
                    <VolumeOff className="mr-1 h-3 w-3" />
                  )}
                  {/* {autoSpeechEnabled ? t('KeyboardShortcuts.autoSpeech') : t('KeyboardShortcuts.closeSpeech')} */}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {autoSpeech
                    ? t('KeyboardShortcuts.closeSpeech')
                    : t('KeyboardShortcuts.autoSpeech')}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => {
            if (state.data) {
              mutate({
                openLeagentLearningMode: true,
                leagentLearningData: state.data
              })
            }
          }}
        >
          <BookOpen className="size-4" />
        </Button>
      </div>

      <div ref={containerRef} className="transition-opacity duration-200">
        {renderContent()}
      </div>
    </div>
  )

  if (state.loading) {
    return (
      <div className="overflow-auto px-6">
        <div className="flex h-20 w-full items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            Processing leagent content{' '}
            <Loader className="size-4 animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="overflow-auto px-6 pb-6">
        <div className="p-4 text-destructive">
          <p>Error parsing Leagent content:</p>
          <pre className="mt-2 overflow-auto rounded bg-destructive/10 p-2 text-xs dark:bg-destructive/20">
            {state.error}
          </pre>
          <pre className="mt-2 overflow-auto rounded bg-accent/10 p-2 text-xs dark:bg-accent/20">
            {content}
          </pre>
        </div>
      </div>
    )
  }

  return <DiagramContent />
}

export const PureLeagent = ({
  children,
  className
}: {
  children: any
  className?: string
}) => {
  return <div className={cn('relative', className)}>{children}</div>
}
