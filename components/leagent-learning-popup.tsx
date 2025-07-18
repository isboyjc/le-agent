'use client'

import { appStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useSpeechSynthesis } from '@/hooks/use-speech-synthesis'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Loader2,
  Mic,
  RotateCcw,
  Volume2,
  VolumeOff,
  X,
  XCircle
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

// 词汇跟读状态
type WordReadingState =
  | 'idle'
  | 'listening'
  | 'partial-success'
  | 'success'
  | 'error'

// 句子跟读状态
type SentenceReadingState =
  | 'idle'
  | 'listening'
  | 'warning' // 检测不到说话时的警告状态
  | 'success'
  | 'error'

export function LeagentLearningPopup() {
  const t = useTranslations()
  const { speak, stop, isSupported: isSpeechSupported } = useSpeechSynthesis()
  const {
    startListening,
    stopListening,
    isListening,
    finalTranscript,
    interimTranscript,
    resetTranscript,
    isSupported: isRecognitionSupported
  } = useSpeechRecognition()

  const [openLeagentLearningMode, leagentLearningData, autoSpeech, mutate] =
    appStore(
      useShallow(state => [
        state.openLeagentLearningMode,
        state.leagentLearningData,
        state.autoSpeech,
        state.mutate
      ])
    )

  const [hoveredWordId, setHoveredWordId] = useState<string | null>(null)
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [correctWords, setCorrectWords] = useState<Set<string>>(new Set()) // 发音正确的词汇（2次成功）
  const [wordSuccessCount, setWordSuccessCount] = useState<Map<string, number>>(
    new Map()
  ) // 词汇成功次数记录
  const [listeningForWord, setListeningForWord] = useState<string | null>(null) // 当前正在监听的词汇
  const [wordReadingStates, setWordReadingStates] = useState<
    Map<string, WordReadingState>
  >(new Map()) // 词汇跟读状态
  const [sentenceReadingStates, setSentenceReadingStates] = useState<
    Map<string, SentenceReadingState>
  >(new Map()) // 句子跟读状态
  const [correctSentences, setCorrectSentences] = useState<Set<string>>(
    new Set()
  ) // 发音正确的句子
  const [listeningForSentence, setListeningForSentence] = useState<
    string | null
  >(null) // 当前正在监听的句子
  const [isRecognitionModalOpen, setIsRecognitionModalOpen] = useState(false) // 语音识别模态层状态
  const [currentRecognitionWord, setCurrentRecognitionWord] =
    useState<string>('') // 当前录音的词汇
  const [currentRecognitionSentence, setCurrentRecognitionSentence] =
    useState<string>('') // 当前录音的句子
  const [accumulatedTranscript, setAccumulatedTranscript] = useState<string>('') // 累积的识别文本（用于句子）
  const currentHoveredWordRef = useRef<string | null>(null)
  const isWordBeingReadRef = useRef<boolean>(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stateResetTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sentenceRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null) // 句子录音超时
  const sentenceWarningTimeoutRef = useRef<NodeJS.Timeout | null>(null) // 句子警告超时
  const sentenceSilenceTimeoutRef = useRef<NodeJS.Timeout | null>(null) // 句子空窗期超时
  const sentenceListRef = useRef<HTMLDivElement>(null)
  const wordListRef = useRef<HTMLDivElement>(null)

  // 计算字符串相似度（编辑距离）
  const calculateSimilarity = useCallback(
    (str1: string, str2: string): number => {
      if (str1 === str2) return 1
      if (str1.length === 0 || str2.length === 0) return 0

      const maxLength = Math.max(str1.length, str2.length)
      const distance = levenshteinDistance(str1, str2)
      return (maxLength - distance) / maxLength
    },
    []
  )

  // 计算编辑距离
  const levenshteinDistance = useCallback(
    (str1: string, str2: string): number => {
      const matrix = Array(str2.length + 1)
        .fill(null)
        .map(() => Array(str1.length + 1).fill(null))

      for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
      for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

      for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
          const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
          matrix[j][i] = Math.min(
            matrix[j][i - 1] + 1, // insertion
            matrix[j - 1][i] + 1, // deletion
            matrix[j - 1][i - 1] + indicator // substitution
          )
        }
      }

      return matrix[str2.length][str1.length]
    },
    []
  )

  // 播放音频文件
  const playAudioFile = useCallback((filename: string) => {
    try {
      const audio = new Audio(`/audio/${filename}`)
      audio.volume = 0.7
      audio.play().catch(error => {
        console.error('Failed to play audio:', error)
      })
    } catch (error) {
      console.error('Failed to create audio:', error)
    }
  }, [])

  // 音频反馈
  const playSuccessSound = useCallback(() => {
    // 创建成功音频 - 简单的双音调
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.3
    )

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  }, [])

  const playErrorSound = useCallback(() => {
    // 创建错误音频 - 低沉的单音调
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
    oscillator.type = 'sawtooth'

    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    )

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  }, [])

  // 关闭学习模式
  const closeLearningMode = useCallback(() => {
    // 清理timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    if (stateResetTimeoutRef.current) {
      clearTimeout(stateResetTimeoutRef.current)
      stateResetTimeoutRef.current = null
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (sentenceRecordingTimeoutRef.current) {
      clearTimeout(sentenceRecordingTimeoutRef.current)
      sentenceRecordingTimeoutRef.current = null
    }
    if (sentenceWarningTimeoutRef.current) {
      clearTimeout(sentenceWarningTimeoutRef.current)
      sentenceWarningTimeoutRef.current = null
    }
    if (sentenceSilenceTimeoutRef.current) {
      clearTimeout(sentenceSilenceTimeoutRef.current)
      sentenceSilenceTimeoutRef.current = null
    }

    // 停止语音识别
    if (isListening) {
      stopListening()
    }

    mutate({
      openLeagentLearningMode: false,
      leagentLearningData: null
    })
    setHoveredWordId(null)
    setCurrentSentenceIndex(0)
    setCorrectWords(new Set())
    setWordSuccessCount(new Map())
    setListeningForWord(null)
    setWordReadingStates(new Map())
    setSentenceReadingStates(new Map())
    setCorrectSentences(new Set())
    setListeningForSentence(null)
    setIsRecognitionModalOpen(false)
    setCurrentRecognitionWord('')
    setCurrentRecognitionSentence('')
    setAccumulatedTranscript('')
    currentHoveredWordRef.current = null
    isWordBeingReadRef.current = false
  }, [mutate, isListening, stopListening])

  // 语音朗读函数
  const speakWord = useCallback(
    async (word: string, isManualClick = false, customRate?: number) => {
      if (
        !isSpeechSupported ||
        (!autoSpeech && !isManualClick) ||
        !leagentLearningData
      )
        return

      try {
        // 如果有正在朗读的内容，先中断
        if (isWordBeingReadRef.current) {
          stop()
        }

        // 标记开始朗读
        isWordBeingReadRef.current = true

        // 语言映射
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

        const targetLang = leagentLearningData.target_language.toLowerCase()
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
    [isSpeechSupported, autoSpeech, leagentLearningData, speak, stop]
  )

  // 处理悬浮（改变颜色、显示tooltip并自动播放）
  const handleWordHover = useCallback(
    (word: string, wordId: string) => {
      // 清除之前的延迟关闭定时器
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
        closeTimeoutRef.current = null
      }

      setHoveredWordId(wordId)
      currentHoveredWordRef.current = word

      // 悬浮时自动播放语音
      if (autoSpeech && isSpeechSupported && leagentLearningData) {
        setTimeout(() => {
          speakWord(word)
        }, 0)
      }
    },
    [autoSpeech, isSpeechSupported, leagentLearningData, speakWord]
  )

  // 处理离开悬浮（延迟关闭）
  const handleWordLeave = useCallback(() => {
    // 清除之前的延迟关闭定时器
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }

    // 延迟关闭tooltip，给用户时间移入tooltip
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredWordId(null)
      currentHoveredWordRef.current = null
    }, 200) // 200ms延迟
  }, [])

  // 处理点击词组（正常速度播放语音）
  const handleWordClick = useCallback(
    (word: string) => {
      // 点击时播放语音，使用正常速度
      if (isSpeechSupported && leagentLearningData) {
        setTimeout(() => {
          speakWord(word, true) // 使用正常速度播放
        }, 0)
      }
    },
    [isSpeechSupported, leagentLearningData, speakWord]
  )

  // 处理鼠标进入tooltip
  const handleTooltipEnter = useCallback(() => {
    // 取消延迟关闭
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  // 处理鼠标离开tooltip
  const handleTooltipLeave = useCallback(() => {
    // 立即关闭tooltip
    setHoveredWordId(null)
    currentHoveredWordRef.current = null
  }, [])

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

  // 处理点击句子（正常速度播放语音）
  const handleSentenceClick = useCallback(
    (sentence: string) => {
      // 点击句子时播放语音，使用正常速度
      if (isSpeechSupported && leagentLearningData) {
        setTimeout(() => {
          speakWord(sentence, true) // 使用正常速度播放
        }, 0)
      }
    },
    [isSpeechSupported, leagentLearningData, speakWord]
  )

  // 播放句子（慢速播放）
  const handlePlaySentence = useCallback(
    (sentence: string, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setTimeout(() => {
        speakWord(sentence, true, 0.1) // 使用极慢的速度 0.1 便于学习
      }, 0)
    },
    [speakWord]
  )

  // 处理跟读功能
  const handleStartReading = useCallback(
    (word: string, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (!isRecognitionSupported) {
        console.warn('语音识别不支持')
        return
      }

      // 如果正在监听，且监听的是同一个词汇，则停止并返回
      if (isListening && listeningForWord === word) {
        stopListening()

        // 清除超时定时器
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current)
          recordingTimeoutRef.current = null
        }
        if (stateResetTimeoutRef.current) {
          clearTimeout(stateResetTimeoutRef.current)
          stateResetTimeoutRef.current = null
        }

        // 重置状态
        setListeningForWord(null)
        setWordReadingStates(prev => new Map(prev).set(word, 'idle'))
        resetTranscript()
        setIsRecognitionModalOpen(false)
        setCurrentRecognitionWord('')

        return // 停止并退出函数
      }

      // 如果正在监听其他词汇，先停止
      if (isListening) {
        stopListening()
      }

      // 清除之前的超时定时器（如果有的话）
      if (stateResetTimeoutRef.current) {
        clearTimeout(stateResetTimeoutRef.current)
        stateResetTimeoutRef.current = null
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }

      // 设置当前词汇为监听状态
      setWordReadingStates(prev => new Map(prev).set(word, 'listening'))

      // 重置识别结果
      resetTranscript()

      // 开始监听当前词汇
      setListeningForWord(word)

      // 打开语音识别模态层
      setCurrentRecognitionWord(word)
      setIsRecognitionModalOpen(true)

      // 获取目标语言
      const targetLang =
        leagentLearningData?.target_language?.toLowerCase() || 'en'
      const langMap: Record<string, string> = {
        zh: 'zh-CN',
        en: 'en-US',
        ja: 'ja-JP',
        fr: 'fr-FR',
        de: 'de-DE',
        es: 'es-ES',
        it: 'it-IT',
        ko: 'ko-KR'
      }
      const recognitionLang = langMap[targetLang] || 'en-US'

      // 启动语音识别
      startListening({
        continuous: false,
        interimResults: true, // 改为true，这样可以获取临时结果
        lang: recognitionLang,
        maxAlternatives: 1
      })

      // 设置2秒超时检测 - 给 finalTranscript 更多时间生成
      recordingTimeoutRef.current = setTimeout(() => {
        // 检查当前状态，只有在监听状态时才处理超时
        setWordReadingStates(prev => {
          const currentState = prev.get(word)
          if (currentState === 'listening') {
            // 停止识别
            stopListening()

            // 检查是否有任何识别结果（优先 finalTranscript，备用 interimTranscript）
            const transcript = finalTranscript || interimTranscript

            if (transcript) {
              // 有识别结果，进行匹配处理
              setTimeout(() => {
                // 触发匹配逻辑（通过设置状态）
                if (finalTranscript || interimTranscript) {
                  // 手动触发匹配逻辑
                  const cleanRecognized = transcript
                    .trim()
                    .toLowerCase()
                    .replace(/[.,!?;:'"()（）【】「」《》，。！？；：'"]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()

                  const cleanTarget = word
                    .toLowerCase()
                    .replace(/[.,!?;:'"()（）【】「」《》，。！？；：'"]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()

                  // 使用相同的匹配逻辑
                  const exactMatch = cleanRecognized === cleanTarget
                  const containsMatch = cleanRecognized.includes(cleanTarget)
                  const noSpaceRecognized = cleanRecognized.replace(/\s/g, '')
                  const noSpaceTarget = cleanTarget.replace(/\s/g, '')
                  const noSpaceExactMatch = noSpaceRecognized === noSpaceTarget
                  const similarity = calculateSimilarity(
                    cleanRecognized,
                    cleanTarget
                  )
                  const similarityMatch = similarity >= 0.9

                  const recognizedWords = cleanRecognized
                    .split(/\s+/)
                    .filter((w: string) => w.length > 0)
                  const targetWords = cleanTarget
                    .split(/\s+/)
                    .filter((w: string) => w.length > 0)
                  const wordExactMatch =
                    targetWords.length > 0 &&
                    targetWords.every((targetWord: string) =>
                      recognizedWords.some(
                        (recWord: string) =>
                          recWord === targetWord ||
                          calculateSimilarity(recWord, targetWord) >= 0.9
                      )
                    )

                  const getCharacters = (str: string) =>
                    str.replace(/\s/g, '').split('')
                  const recognizedChars = new Set(
                    getCharacters(cleanRecognized)
                  )
                  const targetChars = new Set(getCharacters(cleanTarget))
                  const commonChars = new Set(
                    [...recognizedChars].filter(c => targetChars.has(c))
                  )
                  const charMatchRatio =
                    commonChars.size / Math.max(targetChars.size, 1)
                  const hasBasicCharMatch = charMatchRatio >= 0.7

                  const isCorrect =
                    exactMatch ||
                    (containsMatch && hasBasicCharMatch) ||
                    noSpaceExactMatch ||
                    (similarityMatch && hasBasicCharMatch) ||
                    (wordExactMatch && hasBasicCharMatch)

                  console.log(
                    `🎯 [${isCorrect ? '✅' : '❌'}] "${transcript}" → "${word}" (超时处理)`
                  )

                  if (isCorrect) {
                    const currentCount = wordSuccessCount.get(word) || 0
                    const newCount = currentCount + 1

                    setWordSuccessCount(prev =>
                      new Map(prev).set(word, newCount)
                    )

                    if (newCount === 1) {
                      setWordReadingStates(prev =>
                        new Map(prev).set(word, 'partial-success')
                      )
                      playSuccessSound()
                    } else if (newCount >= 2) {
                      setCorrectWords(prev => new Set([...prev, word]))
                      setWordReadingStates(prev =>
                        new Map(prev).set(word, 'success')
                      )
                      playAudioFile('amazing.mp3')
                    }
                  } else {
                    playErrorSound()
                    setWordReadingStates(prev =>
                      new Map(prev).set(word, 'error')
                    )
                    setTimeout(() => {
                      setWordReadingStates(prev =>
                        new Map(prev).set(word, 'idle')
                      )
                    }, 1000)
                  }
                } else {
                  // 没有任何识别结果
                  playErrorSound()
                  setWordReadingStates(prev => new Map(prev).set(word, 'error'))
                  setWordSuccessCount(prev => new Map(prev).set(word, 0))

                  setTimeout(() => {
                    setWordReadingStates(prev =>
                      new Map(prev).set(word, 'idle')
                    )
                  }, 1000)
                }

                // 重置状态
                setListeningForWord(null)
                resetTranscript()

                // 关闭语音识别模态层
                setTimeout(() => {
                  setIsRecognitionModalOpen(false)
                  setCurrentRecognitionWord('')
                }, 1000)
              }, 100)
            } else {
              // 没有任何识别结果，显示错误
              playErrorSound()
              setWordSuccessCount(prev => new Map(prev).set(word, 0))

              setTimeout(() => {
                setWordReadingStates(prev => new Map(prev).set(word, 'idle'))
              }, 1000)

              // 重置状态
              setListeningForWord(null)
              resetTranscript()

              // 关闭语音识别模态层
              setTimeout(() => {
                setIsRecognitionModalOpen(false)
                setCurrentRecognitionWord('')
              }, 1000)

              return new Map(prev).set(word, 'error')
            }
          }
          return prev
        })
      }, 2000)
    },
    [
      isRecognitionSupported,
      isListening,
      stopListening,
      resetTranscript,
      startListening,
      leagentLearningData,
      playErrorSound,
      setWordReadingStates,
      setListeningForWord,
      setWordSuccessCount
    ]
  )

  // 处理句子跟读功能
  const handleStartSentenceReading = useCallback(
    (sentence: string, event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()

      if (!isRecognitionSupported) {
        console.warn('语音识别不支持')
        return
      }

      // 如果正在监听，且监听的是同一个句子，则停止并判断结果
      if (isListening && listeningForSentence === sentence) {
        stopListening()

        // 清除所有超时定时器
        if (sentenceRecordingTimeoutRef.current) {
          clearTimeout(sentenceRecordingTimeoutRef.current)
          sentenceRecordingTimeoutRef.current = null
        }
        if (sentenceWarningTimeoutRef.current) {
          clearTimeout(sentenceWarningTimeoutRef.current)
          sentenceWarningTimeoutRef.current = null
        }
        if (sentenceSilenceTimeoutRef.current) {
          clearTimeout(sentenceSilenceTimeoutRef.current)
          sentenceSilenceTimeoutRef.current = null
        }

        // 获取当前累积的文本并判断结果
        setAccumulatedTranscript(currentAccumulated => {
          const finalText = currentAccumulated.trim()
          processSentenceRecognitionResult(sentence, finalText)
          return ''
        })

        return // 停止并退出函数
      }

      // 如果正在监听其他词汇或句子，先停止
      if (isListening) {
        stopListening()
      }

      // 清除之前的超时定时器
      if (stateResetTimeoutRef.current) {
        clearTimeout(stateResetTimeoutRef.current)
        stateResetTimeoutRef.current = null
      }
      if (sentenceRecordingTimeoutRef.current) {
        clearTimeout(sentenceRecordingTimeoutRef.current)
        sentenceRecordingTimeoutRef.current = null
      }
      if (sentenceWarningTimeoutRef.current) {
        clearTimeout(sentenceWarningTimeoutRef.current)
        sentenceWarningTimeoutRef.current = null
      }

      // 设置当前句子为监听状态
      setSentenceReadingStates(prev => new Map(prev).set(sentence, 'listening'))

      // 重置识别结果和累积文本
      resetTranscript()
      setAccumulatedTranscript('')

      // 开始监听当前句子
      setListeningForSentence(sentence)

      // 打开语音识别模态层（显示句子）
      setCurrentRecognitionSentence(sentence)
      setCurrentRecognitionWord('') // 清空词汇显示
      setIsRecognitionModalOpen(true)

      // 获取目标语言
      const targetLang =
        leagentLearningData?.target_language?.toLowerCase() || 'en'
      const langMap: Record<string, string> = {
        zh: 'zh-CN',
        en: 'en-US',
        ja: 'ja-JP',
        fr: 'fr-FR',
        de: 'de-DE',
        es: 'es-ES',
        it: 'it-IT',
        ko: 'ko-KR'
      }
      const recognitionLang = langMap[targetLang] || 'en-US'

      // 启动语音识别
      startListening({
        continuous: true, // 句子使用连续识别
        interimResults: true,
        lang: recognitionLang,
        maxAlternatives: 1
      })

      // 设置1秒后检测是否有说话，如果没有则进入警告状态
      sentenceWarningTimeoutRef.current = setTimeout(() => {
        // 检查是否有任何识别结果
        if (!finalTranscript && !interimTranscript) {
          setSentenceReadingStates(prev =>
            new Map(prev).set(sentence, 'warning')
          )
        }
      }, 1000)

      // 设置10秒总超时作为最后的安全网络（防止无限录音）
      sentenceRecordingTimeoutRef.current = setTimeout(() => {
        // 检查当前状态，停止识别并判断结果
        setSentenceReadingStates(prev => {
          const currentState = prev.get(sentence)
          if (currentState === 'listening' || currentState === 'warning') {
            // 停止识别
            stopListening()

            // 清理空窗期定时器
            if (sentenceSilenceTimeoutRef.current) {
              clearTimeout(sentenceSilenceTimeoutRef.current)
              sentenceSilenceTimeoutRef.current = null
            }

            // 获取最终累积的文本并判断结果
            setAccumulatedTranscript(currentAccumulated => {
              const finalText = currentAccumulated.trim()
              processSentenceRecognitionResult(sentence, finalText)
              return ''
            })

            return new Map(prev)
          }
          return prev
        })
      }, 10000)
    },
    [
      isRecognitionSupported,
      isListening,
      stopListening,
      resetTranscript,
      startListening,
      leagentLearningData,
      finalTranscript,
      interimTranscript,
      playErrorSound,
      playAudioFile,
      setCorrectSentences,
      setSentenceReadingStates,
      setListeningForSentence,
      setAccumulatedTranscript,
      setIsRecognitionModalOpen,
      setCurrentRecognitionSentence
    ]
  )

  // 检查句子匹配度
  const checkSentenceMatch = useCallback(
    (recognized: string, target: string): boolean => {
      // 更严格的清理：去掉所有空格、标点符号、特殊字符
      const cleanRecognized = recognized
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, '') // 只保留字母、数字、中文、平假名、片假名
        .replace(/\s/g, '') // 去掉所有空格

      const cleanTarget = target
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, '') // 只保留字母、数字、中文、平假名、片假名
        .replace(/\s/g, '') // 去掉所有空格

      console.log(`🎯 句子匹配检查: "${cleanRecognized}" vs "${cleanTarget}"`)

      // 精确匹配（去掉所有空格和符号后）
      if (cleanRecognized === cleanTarget) {
        console.log('✅ 精确匹配成功')
        return true
      }

      // 相似度匹配（句子使用更高的阈值）
      const similarity = calculateSimilarity(cleanRecognized, cleanTarget)
      console.log(`📊 相似度: ${(similarity * 100).toFixed(1)}%`)

      if (similarity >= 0.85) {
        console.log('✅ 相似度匹配成功')
        return true
      }

      // 包含匹配检查（适用于部分识别的情况）
      if (cleanRecognized.length >= cleanTarget.length * 0.8) {
        // 检查识别文本是否包含目标文本的大部分内容
        const targetChars = cleanTarget.split('')
        const recognizedChars = cleanRecognized.split('')

        let matchCount = 0
        let targetIndex = 0

        for (const recChar of recognizedChars) {
          if (
            targetIndex < targetChars.length &&
            recChar === targetChars[targetIndex]
          ) {
            matchCount++
            targetIndex++
          }
        }

        const sequenceMatchRatio = matchCount / targetChars.length
        console.log(`🔄 顺序匹配度: ${(sequenceMatchRatio * 100).toFixed(1)}%`)

        if (sequenceMatchRatio >= 0.8) {
          console.log('✅ 顺序匹配成功')
          return true
        }
      }

      console.log('❌ 匹配失败')
      return false
    },
    [calculateSimilarity]
  )

  // 处理句子识别结果判断
  const processSentenceRecognitionResult = useCallback(
    (sentence: string, finalText: string) => {
      if (finalText) {
        // 有识别文本，检查匹配
        const isCorrect = checkSentenceMatch(finalText, sentence)

        if (isCorrect) {
          setCorrectSentences(prev => new Set([...prev, sentence]))
          playAudioFile('amazing.mp3')

          // 成功状态保持显示
          setTimeout(() => {
            setSentenceReadingStates(prev =>
              new Map(prev).set(sentence, 'success')
            )
          }, 100)
        } else {
          playErrorSound()

          // 1秒后重置错误状态
          setTimeout(() => {
            setSentenceReadingStates(prev =>
              new Map(prev).set(sentence, 'error')
            )

            setTimeout(() => {
              setSentenceReadingStates(prev =>
                new Map(prev).set(sentence, 'idle')
              )
            }, 1000)
          }, 100)
        }
      } else {
        // 没有识别到任何文本
        playErrorSound()

        setTimeout(() => {
          setSentenceReadingStates(prev => new Map(prev).set(sentence, 'error'))

          setTimeout(() => {
            setSentenceReadingStates(prev =>
              new Map(prev).set(sentence, 'idle')
            )
          }, 1000)
        }, 100)
      }

      // 重置状态
      setListeningForSentence(null)
      resetTranscript()
      setAccumulatedTranscript('')

      // 关闭语音识别模态层
      setTimeout(() => {
        setIsRecognitionModalOpen(false)
        setCurrentRecognitionSentence('')
      }, 1500)
    },
    [
      checkSentenceMatch,
      setCorrectSentences,
      playAudioFile,
      playErrorSound,
      setSentenceReadingStates,
      setListeningForSentence,
      resetTranscript,
      setAccumulatedTranscript,
      setIsRecognitionModalOpen,
      setCurrentRecognitionSentence
    ]
  )

  // 监听语音识别结果
  useEffect(() => {
    // 处理句子录音识别（追加模式）
    if (listeningForSentence) {
      // 累积所有的识别文本
      if (finalTranscript) {
        setAccumulatedTranscript(prev => {
          const newText = prev + (prev ? ' ' : '') + finalTranscript
          return newText
        })
        resetTranscript() // 重置以便继续累积
      }

      // 清除警告状态（用户开始说话了）
      if (finalTranscript || interimTranscript) {
        setSentenceReadingStates(prev => {
          const currentState = prev.get(listeningForSentence)
          if (currentState === 'warning') {
            return new Map(prev).set(listeningForSentence, 'listening')
          }
          return prev
        })

        // 重置2秒空窗期检测（用户有新的说话）
        if (sentenceSilenceTimeoutRef.current) {
          clearTimeout(sentenceSilenceTimeoutRef.current)
        }

        // 设置1秒空窗期检测：如果2秒内没有新的识别结果，就停止并判断
        sentenceSilenceTimeoutRef.current = setTimeout(() => {
          // 停止识别并处理结果
          stopListening()

          // 获取当前累积的文本并判断结果
          setAccumulatedTranscript(currentAccumulated => {
            const finalText = currentAccumulated.trim()
            processSentenceRecognitionResult(listeningForSentence, finalText)
            return ''
          })
        }, 1000)
      }

      return // 句子模式下不处理词汇逻辑
    }

    // 处理词汇录音识别 - 只有当有 finalTranscript 时才进行匹配
    // 这样确保使用的是最稳定的识别结果
    if (finalTranscript && listeningForWord) {
      // 清除录音超时定时器
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }

      // 停止语音识别
      stopListening()

      // 改进的多语言语音识别匹配算法
      const cleanRecognized = finalTranscript
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:'"()（）【】「」《》，。！？；：'"]/g, '') // 移除常见标点符号（支持多语言）
        .replace(/\s+/g, ' ') // 规范化空格
        .trim()

      const cleanTarget = listeningForWord
        .toLowerCase()
        .replace(/[.,!?;:'"()（）【】「」《》，。！？；：'"]/g, '') // 移除常见标点符号（支持多语言）
        .replace(/\s+/g, ' ') // 规范化空格
        .trim()

      // 更严格的匹配检测
      const exactMatch = cleanRecognized === cleanTarget

      // 包含匹配：识别文本必须包含目标词汇
      const containsMatch = cleanRecognized.includes(cleanTarget)

      // 去除空格后的精确匹配
      const noSpaceRecognized = cleanRecognized.replace(/\s/g, '')
      const noSpaceTarget = cleanTarget.replace(/\s/g, '')
      const noSpaceExactMatch = noSpaceRecognized === noSpaceTarget

      // 相似度匹配（提高阈值到0.9）
      const similarity = calculateSimilarity(cleanRecognized, cleanTarget)
      const similarityMatch = similarity >= 0.9

      // 分词精确匹配：每个目标词汇都必须在识别结果中找到对应
      const recognizedWords = cleanRecognized
        .split(/\s+/)
        .filter((w: string) => w.length > 0)
      const targetWords = cleanTarget
        .split(/\s+/)
        .filter((w: string) => w.length > 0)
      const wordExactMatch =
        targetWords.length > 0 &&
        targetWords.every((targetWord: string) =>
          recognizedWords.some(
            (recWord: string) =>
              recWord === targetWord ||
              calculateSimilarity(recWord, targetWord) >= 0.9
          )
        )

      // 基本字符匹配检查：确保有足够的字符重叠
      const getCharacters = (str: string) => str.replace(/\s/g, '').split('')
      const recognizedChars = new Set(getCharacters(cleanRecognized))
      const targetChars = new Set(getCharacters(cleanTarget))
      const commonChars = new Set(
        [...recognizedChars].filter(c => targetChars.has(c))
      )
      const charMatchRatio = commonChars.size / Math.max(targetChars.size, 1)
      const hasBasicCharMatch = charMatchRatio >= 0.7 // 至少70%的字符匹配

      const isCorrect =
        exactMatch ||
        (containsMatch && hasBasicCharMatch) ||
        noSpaceExactMatch ||
        (similarityMatch && hasBasicCharMatch) ||
        (wordExactMatch && hasBasicCharMatch)

      // 简洁的匹配结果日志
      console.log(
        `🎯 [${isCorrect ? '✅' : '❌'}] "${finalTranscript}" → "${listeningForWord}"`
      )

      if (isCorrect) {
        // 发音正确，更新成功次数
        const currentCount = wordSuccessCount.get(listeningForWord) || 0
        const newCount = currentCount + 1

        setWordSuccessCount(prev =>
          new Map(prev).set(listeningForWord, newCount)
        )

        if (newCount === 1) {
          // 第一次成功 - 部分成功状态
          setWordReadingStates(prev =>
            new Map(prev).set(listeningForWord, 'partial-success')
          )
          playSuccessSound() // 使用合成音效
        } else if (newCount >= 2) {
          // 第二次成功 - 完全成功状态
          setCorrectWords(prev => new Set([...prev, listeningForWord]))
          setWordReadingStates(prev =>
            new Map(prev).set(listeningForWord, 'success')
          )
          playAudioFile('amazing.mp3') // 使用amazing音效
        }

        // 成功状态不自动重置，保持显示状态
      } else {
        // 发音错误
        const currentCount = wordSuccessCount.get(listeningForWord) || 0

        if (currentCount > 0) {
          // 之前有成功，现在失败了，重置状态
          setWordSuccessCount(prev => new Map(prev).set(listeningForWord, 0))
        }

        setWordReadingStates(prev =>
          new Map(prev).set(listeningForWord, 'error')
        )
        playErrorSound() // 使用合成错误音效

        // 1秒后重置错误状态
        if (stateResetTimeoutRef.current) {
          clearTimeout(stateResetTimeoutRef.current)
        }
        stateResetTimeoutRef.current = setTimeout(() => {
          setWordReadingStates(prev => {
            const newMap = new Map(prev)
            newMap.set(listeningForWord, 'idle')
            return newMap
          })
        }, 1000)
      }

      // 重置状态
      setListeningForWord(null)
      resetTranscript()

      // 关闭语音识别模态层
      setTimeout(() => {
        setIsRecognitionModalOpen(false)
        setCurrentRecognitionWord('')
      }, 1000) // 延迟1秒关闭，让用户看到结果
    }
  }, [
    finalTranscript,
    interimTranscript,
    listeningForWord,
    listeningForSentence,
    stopListening,
    resetTranscript,
    playSuccessSound,
    playErrorSound,
    wordSuccessCount,
    playAudioFile,
    setWordSuccessCount,
    setWordReadingStates,
    setCorrectWords,
    setSentenceReadingStates,
    calculateSimilarity,
    setListeningForWord,
    setAccumulatedTranscript,
    setIsRecognitionModalOpen,
    setCurrentRecognitionSentence,
    setCurrentRecognitionWord,
    processSentenceRecognitionResult
  ])

  // 重置所有状态
  const resetAllStates = useCallback(() => {
    // 清理timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    if (stateResetTimeoutRef.current) {
      clearTimeout(stateResetTimeoutRef.current)
      stateResetTimeoutRef.current = null
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current)
      recordingTimeoutRef.current = null
    }
    if (sentenceRecordingTimeoutRef.current) {
      clearTimeout(sentenceRecordingTimeoutRef.current)
      sentenceRecordingTimeoutRef.current = null
    }
    if (sentenceWarningTimeoutRef.current) {
      clearTimeout(sentenceWarningTimeoutRef.current)
      sentenceWarningTimeoutRef.current = null
    }
    if (sentenceSilenceTimeoutRef.current) {
      clearTimeout(sentenceSilenceTimeoutRef.current)
      sentenceSilenceTimeoutRef.current = null
    }

    // 停止语音识别
    if (isListening) {
      stopListening()
    }

    setHoveredWordId(null)
    setListeningForWord(null)
    setListeningForSentence(null)
    setAccumulatedTranscript('')
    currentHoveredWordRef.current = null
    isWordBeingReadRef.current = false
  }, [isListening, stopListening])

  // 滚动到指定句子
  const scrollToSentence = useCallback((index: number) => {
    setCurrentSentenceIndex(index)
  }, [])

  // 渲染跟读图标
  const renderReadingIcon = useCallback(
    (word: string) => {
      const state = wordReadingStates.get(word) || 'idle'

      switch (state) {
        case 'listening':
          return <Loader2 className="h-5 w-5 animate-spin" />
        case 'partial-success':
          return (
            <RotateCcw className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          )
        case 'success':
          return (
            <RotateCcw className="h-5 w-5 text-green-500 hover:text-green-600" />
          )
        case 'error':
          return <XCircle className="h-5 w-5 text-red-500" />
        default:
          return (
            <Mic className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          )
      }
    },
    [wordReadingStates]
  )

  // 渲染句子跟读图标
  const renderSentenceReadingIcon = useCallback(
    (sentence: string) => {
      const state = sentenceReadingStates.get(sentence) || 'idle'

      switch (state) {
        case 'listening':
          return <Loader2 className="h-5 w-5 animate-spin" />
        case 'warning':
          return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
        case 'success':
          return <Mic className="h-5 w-5 text-green-500 hover:text-green-600" />
        case 'error':
          return <XCircle className="h-5 w-5 text-red-500" />
        default:
          return (
            <Mic className="h-5 w-5 text-muted-foreground hover:text-foreground" />
          )
      }
    },
    [sentenceReadingStates]
  )

  // 渲染词组列表（左侧）
  const renderWordsList = () => {
    if (!leagentLearningData?.article.sentence_groups) return null

    const currentSentence =
      leagentLearningData.article.sentence_groups[currentSentenceIndex]
    if (!currentSentence) return null

    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('LearnMode.words')} ({currentSentenceIndex + 1}/
            {leagentLearningData.article.sentence_groups.length})
          </h3>
        </div>
        <div ref={wordListRef} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {currentSentence.words.map((wordPair, index) => {
              const isCorrect = correctWords.has(wordPair.word)
              const readingState =
                wordReadingStates.get(wordPair.word) || 'idle'
              const successCount = wordSuccessCount.get(wordPair.word) || 0

              // 确定卡片样式
              const getCardStyle = () => {
                if (
                  readingState === 'success' ||
                  isCorrect ||
                  successCount >= 2
                ) {
                  // 完全成功状态 - 绿色边框和背景
                  return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                } else {
                  // 默认状态
                  return 'bg-card hover:bg-accent/50'
                }
              }

              // 确定文字样式
              const getTextStyle = () => {
                if (readingState === 'success' || isCorrect) {
                  return 'text-green-700 decoration-green-400/60 hover:bg-green-100 dark:text-green-400 dark:decoration-green-500/40'
                } else {
                  return 'decoration-gray-300/40 hover:bg-gray-100 hover:decoration-gray-400/60 dark:decoration-gray-600/30 dark:hover:bg-gray-800/50 dark:hover:decoration-gray-500/50'
                }
              }

              // 确定翻译文字样式
              const getTranslationStyle = () => {
                if (
                  readingState === 'success' ||
                  isCorrect ||
                  successCount >= 1
                ) {
                  return 'text-green-600 dark:text-green-400'
                } else {
                  return 'text-muted-foreground'
                }
              }

              return (
                <div
                  key={index}
                  className={cn(
                    'group relative flex items-center justify-between overflow-hidden rounded-lg border p-3 transition-all duration-300',
                    getCardStyle()
                  )}
                >
                  {/* 进度条背景 */}
                  <div
                    className="absolute inset-0 bg-green-100 transition-all duration-300 ease-out dark:bg-green-950/30"
                    style={{
                      width:
                        successCount === 0
                          ? '0%'
                          : successCount === 1
                            ? '50%'
                            : '100%'
                    }}
                  />
                  <div className="relative mr-3 min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={cn(
                          'cursor-pointer rounded px-1 font-medium underline decoration-dotted decoration-1 underline-offset-6 transition-colors',
                          getTextStyle()
                        )}
                        onClick={() => handleWordClick(wordPair.word)}
                      >
                        {wordPair.word}
                      </span>
                      <div className="flex items-center gap-1">
                        {isSpeechSupported && (
                          <Volume2
                            className="h-3 w-3 cursor-pointer text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                            onClick={(e: React.MouseEvent) =>
                              handleManualSpeak(wordPair.word, e)
                            }
                          />
                        )}
                      </div>
                    </div>
                    <div className={cn('text-xs', getTranslationStyle())}>
                      {wordPair.translations.join(', ')}
                      {(isCorrect || readingState === 'success') && ' ✓✓'}
                      {(readingState === 'partial-success' ||
                        (successCount === 1 && readingState !== 'success')) &&
                        ' ✓'}
                    </div>
                  </div>

                  {/* 跟读图标 - 放在右侧 */}
                  {isRecognitionSupported && (
                    <div className="relative flex-shrink-0">
                      <button
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                          readingState === 'listening'
                            ? 'bg-blue-100 dark:bg-blue-900/20'
                            : readingState === 'success' || isCorrect
                              ? 'bg-green-100 dark:bg-green-900/20'
                              : readingState === 'error'
                                ? 'bg-red-100 dark:bg-red-900/20'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        )}
                        onClick={(e: React.MouseEvent) =>
                          handleStartReading(wordPair.word, e)
                        }
                      >
                        {renderReadingIcon(wordPair.word)}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // 渲染句组列表（中间）
  const renderSentencesList = () => {
    if (!leagentLearningData?.article.sentence_groups) return null

    return (
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('LearnMode.sentences')}
          </h3>
        </div>
        <div ref={sentenceListRef} className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {leagentLearningData.article.sentence_groups.map((group, index) => {
              const isActive = index === currentSentenceIndex
              const isCorrect = correctSentences.has(group.sentence)
              const readingState =
                sentenceReadingStates.get(group.sentence) || 'idle'

              // 确定卡片样式
              const getCardStyle = () => {
                if (readingState === 'success' || isCorrect) {
                  // 完全成功状态 - 绿色边框和背景
                  return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                } else if (isActive) {
                  return 'border-primary/20 bg-primary/5 shadow-sm'
                } else {
                  return 'bg-card opacity-60 hover:bg-accent/50 hover:opacity-80'
                }
              }

              // 确定文字样式
              const getTextStyle = () => {
                if (readingState === 'success' || isCorrect) {
                  return 'text-green-700 decoration-green-400/60 hover:bg-green-100 dark:text-green-400 dark:decoration-green-500/40'
                } else if (isActive) {
                  return 'text-foreground decoration-primary/40 hover:bg-primary/5 hover:decoration-primary/60 dark:decoration-primary/30 dark:hover:bg-primary/10'
                } else {
                  return 'text-muted-foreground decoration-gray-300/40 hover:bg-gray-100 hover:decoration-gray-400/60 dark:decoration-gray-600/30 dark:hover:bg-gray-800/50 dark:hover:decoration-gray-500/50'
                }
              }

              // 确定翻译文字样式
              const getTranslationStyle = () => {
                if (readingState === 'success' || isCorrect) {
                  return 'text-green-600 dark:text-green-400'
                } else if (isActive) {
                  return 'text-muted-foreground'
                } else {
                  return 'text-muted-foreground/70'
                }
              }

              return (
                <div
                  key={index}
                  className={cn(
                    'group cursor-pointer rounded-lg border p-4 transition-all duration-300',
                    getCardStyle()
                  )}
                  onClick={() => scrollToSentence(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={cn(
                            'cursor-pointer rounded px-1 leading-relaxed font-medium underline decoration-dotted decoration-1 underline-offset-6 transition-colors',
                            getTextStyle()
                          )}
                          onClick={() => handleSentenceClick(group.sentence)}
                        >
                          {group.sentence}
                        </span>
                        {isSpeechSupported && (
                          <Volume2
                            className={cn(
                              'h-3 w-3 cursor-pointer transition-opacity',
                              isActive ||
                                readingState === 'success' ||
                                isCorrect
                                ? 'text-primary hover:text-primary/80'
                                : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground'
                            )}
                            onClick={(e: React.MouseEvent) =>
                              handlePlaySentence(group.sentence, e)
                            }
                          />
                        )}
                      </div>
                      <div
                        className={cn(
                          'text-sm leading-relaxed',
                          getTranslationStyle()
                        )}
                      >
                        {group.translation}
                        {(isCorrect || readingState === 'success') && ' ✓'}
                      </div>
                    </div>

                    {/* 跟读图标 - 放在右侧 */}
                    {isRecognitionSupported && (
                      <div className="relative flex-shrink-0">
                        <button
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                            readingState === 'listening'
                              ? 'bg-blue-100 dark:bg-blue-900/20'
                              : readingState === 'warning'
                                ? 'bg-yellow-100 dark:bg-yellow-900/20'
                                : readingState === 'success' || isCorrect
                                  ? 'bg-green-100 dark:bg-green-900/20'
                                  : readingState === 'error'
                                    ? 'bg-red-100 dark:bg-red-900/20'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                          )}
                          onClick={(e: React.MouseEvent) =>
                            handleStartSentenceReading(group.sentence, e)
                          }
                        >
                          {renderSentenceReadingIcon(group.sentence)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // 渲染原文内容（右侧）
  const renderOriginalContent = () => {
    if (!leagentLearningData) return null

    const { article } = leagentLearningData
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
      const isHovered = hoveredWordId === match.id

      renderParts.push(
        <Tooltip key={`match-${index}`} open={isHovered}>
          <TooltipTrigger asChild>
            <span
              data-word={match.word}
              className={cn(
                'cursor-pointer rounded px-1 underline decoration-dotted decoration-1 underline-offset-6 transition-colors',
                isHovered
                  ? 'bg-green-50 text-green-600 decoration-green-400/60 dark:bg-green-950/20 dark:text-green-400 dark:decoration-green-500/40'
                  : 'decoration-gray-300/40 hover:bg-gray-100 hover:decoration-gray-400/60 dark:decoration-gray-600/30 dark:hover:bg-gray-800/50 dark:hover:decoration-gray-500/50'
              )}
              onMouseEnter={() => handleWordHover(match.word, match.id)}
              onMouseLeave={handleWordLeave}
              onClick={e => {
                e.stopPropagation()
                handleWordClick(match.word)
              }}
            >
              {match.word}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs"
            onClick={e => e.stopPropagation()}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
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

    // 获取翻译文本
    const fullTranslation = leagentLearningData.article.sentence_groups
      .map(group => group.translation)
      .join(' ')

    return (
      <TooltipProvider>
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('LearnMode.originalText')}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {/* 原文 */}
              <div className="mb-6">
                <div className="text-lg leading-relaxed whitespace-pre-wrap">
                  {renderParts}
                </div>
              </div>

              {/* 翻译 */}
              <div className="border-t pt-4">
                <h4 className="mb-3 text-base font-medium text-muted-foreground">
                  {t('LearnMode.translation')}
                </h4>
                <div className="text-base leading-relaxed text-muted-foreground">
                  {fullTranslation}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <Sheet open={openLeagentLearningMode} onOpenChange={closeLearningMode}>
      <SheetContent
        side="top"
        className="h-full max-h-[100vh] w-full rounded-none border-none bg-card p-0 [&>button]:hidden"
      >
        <div className="flex h-full w-full flex-col">
          {/* Header */}
          <div
            className="flex w-full gap-2 border-b p-6"
            style={{ userSelect: 'text' }}
          >
            <SheetTitle className="flex w-full items-center gap-2">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5" />
                <span>{t('LearnMode.title')}</span>
                <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                  <span>
                    {leagentLearningData?.target_language.toUpperCase()} →{' '}
                    {leagentLearningData?.user_language.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                {isSpeechSupported && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={autoSpeech ? 'default' : 'outline'}
                        onClick={() => mutate({ autoSpeech: !autoSpeech })}
                        className="h-8"
                      >
                        {autoSpeech ? (
                          <Volume2 className="mr-1 h-3 w-3" />
                        ) : (
                          <VolumeOff className="mr-1 h-3 w-3" />
                        )}
                        <span className="text-xs">
                          {autoSpeech
                            ? t('KeyboardShortcuts.autoSpeech')
                            : t('KeyboardShortcuts.closeSpeech')}
                        </span>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={closeLearningMode}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('LearnMode.learnModeClose')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </SheetTitle>
          </div>

          {/* Content - 三栏布局 */}
          <div className="flex min-h-0 flex-1">
            {/* 左侧：词组列表 */}
            <div className="w-1/4 border-r bg-muted/20">
              {renderWordsList()}
            </div>

            {/* 中间：句组列表 */}
            <div className="w-2/5 border-r">{renderSentencesList()}</div>

            {/* 右侧：原文 */}
            <div className="flex-1">{renderOriginalContent()}</div>
          </div>
        </div>
      </SheetContent>

      {/* 语音识别底部区域 */}
      <div
        className={`fixed right-0 bottom-0 left-0 z-9999 transform transition-all duration-300 ease-out ${
          isRecognitionModalOpen
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0'
        }`}
      >
        <div className="bg-background/60 p-6 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            {/* 左侧：目标内容 */}
            <div className="flex-1 text-center">
              <div className="mb-1 text-xs text-muted-foreground">
                {currentRecognitionSentence
                  ? t('LearnMode.targetSentence')
                  : t('LearnMode.targetWord')}
              </div>
              <div className="text-lg font-bold text-primary">
                {currentRecognitionSentence || currentRecognitionWord}
              </div>
            </div>

            {/* 中间：录音状态指示器 */}
            <div className="mx-8 flex-shrink-0">
              <div className="flex flex-col items-center space-y-1">
                {listeningForSentence &&
                sentenceReadingStates.get(listeningForSentence) ===
                  'warning' ? (
                  <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
                ) : (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                )}
                <span className="text-xs text-muted-foreground">
                  {listeningForSentence &&
                  sentenceReadingStates.get(listeningForSentence) === 'warning'
                    ? t('LearnMode.speakNow')
                    : t('LearnMode.listening')}
                </span>
              </div>
            </div>

            {/* 右侧：识别结果 */}
            <div className="flex-1 text-center">
              <div className="mb-1 text-xs text-muted-foreground">
                {t('LearnMode.recognizedText')}
              </div>
              <div className="min-h-[1.75rem] text-lg font-medium">
                {currentRecognitionSentence
                  ? accumulatedTranscript +
                    (accumulatedTranscript &&
                    (finalTranscript || interimTranscript)
                      ? ' '
                      : '') +
                    (finalTranscript || interimTranscript || '')
                  : finalTranscript || interimTranscript || '...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
