import { useCallback, useEffect, useRef, useState } from 'react'

export interface SpeechSynthesisVoice {
  voiceURI: string
  name: string
  lang: string
  localService: boolean
  default: boolean
}

export interface SpeechSynthesisOptions {
  voice?: SpeechSynthesisVoice
  rate?: number // 语速 (0.1 - 10)
  pitch?: number // 音调 (0 - 2)
  volume?: number // 音量 (0 - 1)
  lang?: string // 语言
}

export interface UseSpeechSynthesisReturn {
  // 状态
  isSupported: boolean
  isPlaying: boolean
  isPaused: boolean
  isLoading: boolean

  // 语音列表
  voices: SpeechSynthesisVoice[]

  // 方法
  speak: (text: string, options?: SpeechSynthesisOptions) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void

  // 设置
  setDefaultOptions: (options: SpeechSynthesisOptions) => void

  // 当前状态
  currentText: string
  currentOptions: SpeechSynthesisOptions
}

export const useSpeechSynthesis = (): UseSpeechSynthesisReturn => {
  const [isSupported] = useState(() => {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  })

  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [currentText, setCurrentText] = useState('')
  const [currentOptions, setCurrentOptions] = useState<SpeechSynthesisOptions>({
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: 'zh-CN'
  })

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const defaultOptionsRef = useRef<SpeechSynthesisOptions>({
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: 'zh-CN'
  })

  // 加载可用的语音
  const loadVoices = useCallback(() => {
    if (!isSupported) return

    const availableVoices = speechSynthesis.getVoices()
    setVoices(availableVoices)

    // 如果还没有语音，可能需要等待
    if (availableVoices.length === 0) {
      speechSynthesis.addEventListener('voiceschanged', loadVoices)
    }
  }, [isSupported])

  // 初始化
  useEffect(() => {
    if (!isSupported) return

    loadVoices()

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [isSupported, loadVoices])

  // 创建语音实例
  const createUtterance = useCallback(
    (text: string, options: SpeechSynthesisOptions) => {
      const utterance = new SpeechSynthesisUtterance(text)

      // 设置语音参数
      utterance.rate = options.rate ?? defaultOptionsRef.current.rate ?? 1
      utterance.pitch = options.pitch ?? defaultOptionsRef.current.pitch ?? 1
      utterance.volume = options.volume ?? defaultOptionsRef.current.volume ?? 1
      utterance.lang = options.lang ?? defaultOptionsRef.current.lang ?? 'zh-CN'

      // 设置语音
      if (options.voice) {
        utterance.voice = options.voice as any
      } else if (defaultOptionsRef.current.voice) {
        utterance.voice = defaultOptionsRef.current.voice as any
      }

      return utterance
    },
    []
  )

  // 播放语音
  const speak = useCallback(
    async (text: string, options: SpeechSynthesisOptions = {}) => {
      if (!isSupported || !text.trim()) return

      return new Promise<void>((resolve, reject) => {
        try {
          // 停止当前播放
          stop()

          setIsLoading(true)
          setCurrentText(text)
          setCurrentOptions({ ...defaultOptionsRef.current, ...options })

          const utterance = createUtterance(text, {
            ...defaultOptionsRef.current,
            ...options
          })
          utteranceRef.current = utterance

          // 设置事件监听器
          utterance.onstart = () => {
            setIsLoading(false)
            setIsPlaying(true)
            setIsPaused(false)
          }

          utterance.onend = () => {
            setIsPlaying(false)
            setIsPaused(false)
            setCurrentText('')
            utteranceRef.current = null
            resolve()
          }

          utterance.onerror = event => {
            setIsLoading(false)
            setIsPlaying(false)
            setIsPaused(false)
            setCurrentText('')
            utteranceRef.current = null
            reject(new Error(`Speech synthesis error: ${event.error}`))
          }

          utterance.onpause = () => {
            setIsPaused(true)
          }

          utterance.onresume = () => {
            setIsPaused(false)
          }

          // 开始播放
          speechSynthesis.speak(utterance)
        } catch (error) {
          setIsLoading(false)
          setIsPlaying(false)
          setIsPaused(false)
          setCurrentText('')
          utteranceRef.current = null
          reject(error)
        }
      })
    },
    [isSupported, createUtterance]
  )

  // 暂停
  const pause = useCallback(() => {
    if (!isSupported || !isPlaying) return
    speechSynthesis.pause()
  }, [isSupported, isPlaying])

  // 恢复
  const resume = useCallback(() => {
    if (!isSupported || !isPaused) return
    speechSynthesis.resume()
  }, [isSupported, isPaused])

  // 停止
  const stop = useCallback(() => {
    if (!isSupported) return

    speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setIsLoading(false)
    setCurrentText('')
    utteranceRef.current = null
  }, [isSupported])

  // 设置默认选项
  const setDefaultOptions = useCallback((options: SpeechSynthesisOptions) => {
    defaultOptionsRef.current = { ...defaultOptionsRef.current, ...options }
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (isSupported) {
        speechSynthesis.cancel()
      }
    }
  }, [isSupported])

  return {
    isSupported,
    isPlaying,
    isPaused,
    isLoading,
    voices,
    speak,
    pause,
    resume,
    stop,
    setDefaultOptions,
    currentText,
    currentOptions
  }
}
