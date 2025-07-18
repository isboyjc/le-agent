import { useCallback, useEffect, useRef, useState } from 'react'

// 语音识别接口类型定义
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  serviceURI: string
  grammars: any
  start(): void
  stop(): void
  abort(): void
  addEventListener(type: string, listener: any): void
  removeEventListener(type: string, listener: any): void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInterface
    webkitSpeechRecognition: new () => SpeechRecognitionInterface
  }
}

export interface SpeechRecognitionOptions {
  continuous?: boolean // 是否连续识别
  interimResults?: boolean // 是否返回临时结果
  lang?: string // 识别语言
  maxAlternatives?: number // 最大候选结果数
}

export interface SpeechRecognitionResult {
  transcript: string // 识别的文本
  confidence: number // 置信度
  isFinal: boolean // 是否为最终结果
  alternatives: Array<{
    // 候选结果
    transcript: string
    confidence: number
  }>
}

export interface UseSpeechRecognitionReturn {
  // 状态
  isSupported: boolean
  isListening: boolean
  isLoading: boolean

  // 识别结果
  transcript: string // 当前识别的完整文本
  interimTranscript: string // 临时识别结果
  finalTranscript: string // 最终识别结果
  results: SpeechRecognitionResult[]

  // 方法
  startListening: (options?: SpeechRecognitionOptions) => void
  stopListening: () => void
  abortListening: () => void
  resetTranscript: () => void

  // 配置
  setOptions: (options: SpeechRecognitionOptions) => void

  // 错误信息
  error: string | null
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [isSupported] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    )
  })

  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [results, setResults] = useState<SpeechRecognitionResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null)
  const optionsRef = useRef<SpeechRecognitionOptions>({
    continuous: true,
    interimResults: true,
    lang: 'zh-CN',
    maxAlternatives: 1
  })

  // 创建识别实例
  const createRecognition = useCallback(() => {
    if (!isSupported) return null

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // 设置识别参数
    recognition.continuous = optionsRef.current.continuous ?? true
    recognition.interimResults = optionsRef.current.interimResults ?? true
    recognition.lang = optionsRef.current.lang ?? 'zh-CN'
    recognition.maxAlternatives = optionsRef.current.maxAlternatives ?? 1

    return recognition
  }, [isSupported])

  // 处理识别结果
  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    let interimResult = ''
    let finalResult = ''
    const allResults: SpeechRecognitionResult[] = []

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const transcript = result[0].transcript
      const confidence = result[0].confidence

      // 构建结果对象
      const speechResult: SpeechRecognitionResult = {
        transcript,
        confidence,
        isFinal: result.isFinal,
        alternatives: Array.from(result).map(alt => ({
          transcript: alt.transcript,
          confidence: alt.confidence
        }))
      }

      allResults.push(speechResult)

      if (result.isFinal) {
        finalResult += transcript
      } else {
        interimResult += transcript
      }
    }

    setInterimTranscript(interimResult)
    setFinalTranscript(prev => prev + finalResult)
    setTranscript(prev => prev + finalResult + interimResult)
    setResults(prev => [...prev, ...allResults])
    setError(null)
  }, [])

  // 处理错误
  const handleError = useCallback((event: SpeechRecognitionErrorEvent) => {
    console.error('语音识别错误:', event.error, event.message)
    setError(`语音识别错误: ${event.error}`)
    setIsListening(false)
    setIsLoading(false)
  }, [])

  // 处理开始事件
  const handleStart = useCallback(() => {
    setIsLoading(false)
    setIsListening(true)
    setError(null)
  }, [])

  // 处理结束事件
  const handleEnd = useCallback(() => {
    setIsListening(false)
    setIsLoading(false)
  }, [])

  // 开始语音识别
  const startListening = useCallback(
    (options?: SpeechRecognitionOptions) => {
      if (!isSupported || isListening) return

      try {
        // 更新配置
        if (options) {
          optionsRef.current = { ...optionsRef.current, ...options }
        }

        // 停止之前的识别
        if (recognitionRef.current) {
          recognitionRef.current.stop()
        }

        // 创建新的识别实例
        const recognition = createRecognition()
        if (!recognition) return

        recognitionRef.current = recognition

        // 设置事件监听器
        recognition.addEventListener('result', handleResult)
        recognition.addEventListener('error', handleError)
        recognition.addEventListener('start', handleStart)
        recognition.addEventListener('end', handleEnd)

        // 开始识别
        setIsLoading(true)
        setError(null)
        recognition.start()
      } catch (err) {
        console.error('启动语音识别失败:', err)
        setError('启动语音识别失败')
        setIsLoading(false)
      }
    },
    [
      isSupported,
      isListening,
      createRecognition,
      handleResult,
      handleError,
      handleStart,
      handleEnd
    ]
  )

  // 停止语音识别
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return

    try {
      recognitionRef.current.stop()
    } catch (err) {
      console.error('停止语音识别失败:', err)
    }
  }, [isListening])

  // 中断语音识别
  const abortListening = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.abort()
      setIsListening(false)
      setIsLoading(false)
    } catch (err) {
      console.error('中断语音识别失败:', err)
    }
  }, [])

  // 重置识别结果
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setFinalTranscript('')
    setResults([])
    setError(null)
  }, [])

  // 设置选项
  const setOptions = useCallback((options: SpeechRecognitionOptions) => {
    optionsRef.current = { ...optionsRef.current, ...options }
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (err) {
          console.error('清理语音识别失败:', err)
        }
      }
    }
  }, [])

  return {
    isSupported,
    isListening,
    isLoading,
    transcript,
    interimTranscript,
    finalTranscript,
    results,
    startListening,
    stopListening,
    abortListening,
    resetTranscript,
    setOptions,
    error
  }
}
